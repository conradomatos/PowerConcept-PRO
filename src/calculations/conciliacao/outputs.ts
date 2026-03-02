import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoConciliacao, Divergencia } from './types';
import { CATEGORIAS_CONFIG, suggestCategoria } from './categorias';

// ============================================================
// UTILITÁRIOS
// ============================================================

function formatBRL(valor: number): string {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  const abs = Math.abs(valor);
  const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return valor < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
}

function formatDateBR(date: Date | null): string {
  if (!date) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function descricaoLegivel(d: Divergencia): string {
  const omie = d.omie;
  if (omie) {
    const nome = omie.razaoSocial || omie.clienteFornecedor || '';
    if (nome && nome.length > 3 &&
        !nome.toUpperCase().includes('SALDO') &&
        !/^\d{2}\.\d{3}\.\d{3}/.test(nome)) {
      return nome.substring(0, 40);
    }
  }
  if (d.nome && d.nome.length > 3) {
    return d.nome.substring(0, 40);
  }
  if (d.descricao) {
    return d.descricao
      .replace(/LIQUIDACAO BOLETO \d*/g, '')
      .replace(/PAGAMENTO PIX\w*/g, 'PIX')
      .replace(/PIXDEB /g, '')
      .replace(/PIXCRED /g, '')
      .replace(/DEBCTAFATURA/g, 'DEB FATURA')
      .trim()
      .substring(0, 40);
  }
  return d.cnpjCpf || '--';
}

// ============================================================
// 1. RELATÓRIO MARKDOWN
// ============================================================

export function gerarRelatorioMD(resultado: ResultadoConciliacao): void {
  const r = resultado;
  const lines: string[] = [];
  const L = (s: string) => lines.push(s);

  L(`# RELATÓRIO DE CONCILIAÇÃO FINANCEIRA`);
  L(`## CONCEPT Engenharia — ${r.mesLabel}/${r.anoLabel}`);
  L(`**Gerado em:** ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  L('');
  L('---');
  L('');

  // ---- 1. RESUMO EXECUTIVO ----
  L('## 1. RESUMO EXECUTIVO');
  L('');

  const totalEntradasBanco = r.banco.filter(b => b.valor > 0).reduce((s, b) => s + b.valor, 0);
  const totalSaidasBanco = r.banco.filter(b => b.valor < 0).reduce((s, b) => s + b.valor, 0);
  const totalEntradasOmie = r.omieSicredi.filter(o => o.valor > 0).reduce((s, o) => s + o.valor, 0);
  const totalSaidasOmie = r.omieSicredi.filter(o => o.valor < 0).reduce((s, o) => s + o.valor, 0);

  let periodoBanco = '-';
  if (r.banco.length > 0) {
    const datas = r.banco.map(b => b.data).filter(d => d instanceof Date);
    if (datas.length > 0) {
      const min = new Date(Math.min(...datas.map(d => d.getTime())));
      const max = new Date(Math.max(...datas.map(d => d.getTime())));
      periodoBanco = `${min.getDate().toString().padStart(2, '0')}/${(min.getMonth() + 1).toString().padStart(2, '0')} a ${formatDateBR(max)}`;
    }
  }

  const totalAtrasoMD = r.divergencias.filter(d => d.tipo === 'B*').reduce((s, d) => s + Math.abs(d.valor), 0);
  const entradasOmieSemAtrasoMD = totalEntradasOmie - totalAtrasoMD;

  L('| Fonte | Período | Lanç. | Entradas | Saídas | Em Atraso | Líquido |');
  L('|-------|---------|-------|----------|--------|-----------|---------|');
  L(`| Banco | ${periodoBanco} | ${r.banco.length} | ${formatBRL(totalEntradasBanco)} | ${formatBRL(totalSaidasBanco)} | -- | ${formatBRL(totalEntradasBanco + totalSaidasBanco)} |`);
  L(`| Omie (Sicredi) | ${periodoBanco} | ${r.omieSicredi.length} | ${formatBRL(entradasOmieSemAtrasoMD)} | ${formatBRL(totalSaidasOmie)} | ${formatBRL(totalAtrasoMD)} | ${formatBRL(totalEntradasOmie + totalSaidasOmie)} |`);
  if (r.cartaoInfo && r.cartaoTransacoes?.length > 0) {
    L(`| Cartão | Venc. ${r.cartaoInfo.vencimento} | ${r.cartaoTransacoes.length} trans. | — | ${formatBRL(-r.cartaoInfo.valorTotal)} | — |`);
  }
  L('');

  // Banner de lançamentos zerados
  if (r.lancamentosZerados && r.lancamentosZerados.total > 0) {
    L(`> **${r.lancamentosZerados.total} lancamentos com valor R$ 0,00 foram ignorados** (${r.lancamentosZerados.banco} do banco, ${r.lancamentosZerados.omie} do Omie).`);
    L('');
  }

  const diffSaldo = (r.saldoBanco || 0) - (r.saldoOmie || 0);
  L('| Item | Valor |');
  L('|------|-------|');
  L(`| Saldo anterior Banco | ${formatBRL(r.saldoBanco || 0)} |`);
  L(`| Saldo anterior Omie | ${formatBRL(r.saldoOmie || 0)} |`);
  if (Math.abs(diffSaldo) > 0.01) {
    L(`| **Diferenca saldo anterior** | **${formatBRL(diffSaldo)} [!]** |`);
  } else {
    L(`| **Diferenca saldo anterior** | **R$ 0,00 [OK]** |`);
  }
  L('');

  L('### Resultado do Matching');
  L('');
  L('| Camada | Confiança | Qtd |');
  L('|--------|-----------|-----|');
  const camadas: [string, string][] = [['A', 'ALTA'], ['B', 'MÉDIA'], ['C', 'MÉDIA (agrupamento)'], ['D', 'BAIXA']];
  for (const [cam, conf] of camadas) {
    L(`| ${cam} | ${conf} | ${r.camadaCounts[cam] || 0} |`);
  }
  L(`| **Total** | | **${r.totalConciliados}** |`);
  L('');
  L('---');
  L('');

  // ---- 2. DIVERGÊNCIAS ----
  L('## 2. DIVERGÊNCIAS');
  L('');

  const divByTipo: Record<string, Divergencia[]> = {};
  for (const d of r.divergencias) {
    if (!divByTipo[d.tipo]) divByTipo[d.tipo] = [];
    divByTipo[d.tipo].push(d);
  }

  if (divByTipo['A']?.length) {
    const divs = divByTipo['A'];
    L('### Tipo A — Faltando no Omie');
    L('> Lançamentos no extrato bancário sem correspondência no Omie.');
    L('');
    L('| # | Data | Valor | Descrição | CNPJ | Ação |');
    L('|---|------|-------|-----------|------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 50)} | ${d.cnpjCpf || ''} | Lançar no Omie |`);
    });
    const totalA = divs.reduce((s, d) => s + d.valor, 0);
    L(`| | | **${formatBRL(totalA)}** | **${divs.length} itens** | | |`);
    L('');
  }

  if (divByTipo['T']?.length) {
    const divs = divByTipo['T'];
    L('### Tipo T — Transferências entre contas');
    L('> Pagamentos de fatura de cartão ou movimentações entre contas próprias.');
    L('');
    L('| # | Data | Valor | Descrição | Ação |');
    L('|---|------|-------|-----------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 50)} | ${d.acao || 'Lançar transferência no Omie'} |`);
    });
    const totalT = divs.reduce((s, d) => s + d.valor, 0);
    L(`| | | **${formatBRL(totalT)}** | **${divs.length} itens** | |`);
    L('');
  }

  if (divByTipo['B*']?.length) {
    const divs = divByTipo['B*'];
    L('### Contas a Receber em Atraso');
    L('> Contas a receber vencidas — cliente deve para a empresa.');
    L('');
    L('| # | Data | Valor | Fornecedor/Cliente | CNPJ | Tipo | Ação |');
    L('|---|------|-------|--------------------|------|------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${descricaoLegivel(d)} | ${d.cnpjCpf || ''} | ${d.origem || ''} | ${d.acao || ''} |`);
    });
    const totalAtraso = divs.reduce((s, d) => s + d.valor, 0);
    L(`| | | **${formatBRL(totalAtraso)}** | **${divs.length} itens** | | | |`);
    L('');
  }

  if (divByTipo['F']?.length) {
    const divs = divByTipo['F'];
    L('### Tipo F — Possível Conta Errada (Cartão → Banco)');
    L('> Lançamentos que parecem ser compras no cartão de crédito mas foram registrados na conta bancária.');
    L('');
    L('| # | Data | Valor | Fornecedor | Confiança | Ação |');
    L('|---|------|-------|------------|-----------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${descricaoLegivel(d)} | ${d.confianca || 'media'} | ${d.acao || ''} |`);
    });
    const totalF = divs.reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`| | | **${formatBRL(totalF)}** | **${divs.length} itens** | | |`);
    L('');
  }

  if (divByTipo['B']?.length) {
    const divs = divByTipo['B'];
    L('### Tipo B — A mais no Omie');
    L('> Lançamentos no Omie sem correspondência no banco.');
    L('');
    L('| # | Data | Valor | Fornecedor | Situação | Origem | Ação |');
    L('|---|------|-------|------------|----------|--------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${descricaoLegivel(d)} | ${d.situacao || ''} | ${d.origem || ''} | ${d.acao || 'Investigar'} |`);
    });
    const totalB = divs.reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`| | | **${formatBRL(totalB)}** | **${divs.length} itens** | | | |`);
    L('');
  }

  if (divByTipo['C']?.length) {
    const divs = divByTipo['C'];
    L('### Tipo C — Valor divergente');
    L('');
    L('| # | Data | Valor Banco | Valor Omie | Diferença | Fornecedor | Ação |');
    L('|---|------|-------------|------------|-----------|------------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valorBanco || 0)} | ${formatBRL(d.valorOmie || 0)} | ${formatBRL(d.diferenca || 0)} | ${(d.descricao || '').substring(0, 35)} | Corrigir valor |`);
    });
    L('');
  }

  if (divByTipo['D']?.length) {
    const divs = divByTipo['D'];
    L('### Tipo D — Data divergente');
    L('');
    L('| # | Descrição | Valor | Data Banco | Data Omie | Diferença | Ação |');
    L('|---|-----------|-------|------------|-----------|-----------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${(d.descricao || '').substring(0, 35)} | ${formatBRL(d.valor)} | ${d.dataBanco || ''} | ${d.dataOmie || ''} | ${d.diasDiferenca || ''} dias | Corrigir data |`);
    });
    L('');
  }

  if (divByTipo['E']?.length) {
    const divs = divByTipo['E'];
    L('### Tipo E — Duplicidades no Omie');
    L('');
    L('| # | Data | Valor | Fornecedor | Ação |');
    L('|---|------|-------|------------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${(d.descricao || '').substring(0, 40)} | Remover duplicata |`);
    });
    L('');
  }

  if (divByTipo['G']?.length) {
    const divs = divByTipo['G'];
    L('### Contas a Pagar em Atraso');
    L('> Contas a pagar vencidas — empresa deve ao fornecedor, pagamento nao realizado.');
    L('');
    L('| # | Data | Valor | Fornecedor | Situação | Ação |');
    L('|---|------|-------|------------|----------|------|');
    divs.forEach((d, i) => {
      L(`| ${i + 1} | ${d.data || ''} | ${formatBRL(d.valor)} | ${descricaoLegivel(d)} | ${d.situacao || ''} | ${d.acao || 'Verificar pagamento'} |`);
    });
    const totalG = divs.reduce((s, d) => s + d.valor, 0);
    L(`| | | **${formatBRL(totalG)}** | **${divs.length} itens** | | |`);
    L('');
  }

  L('---');
  L('');

  // ---- 3. CARTÃO DE CRÉDITO ---- (só se houver transações)
  if (r.cartaoTransacoes?.length > 0 && r.cartaoInfo) {
    L('## 3. CARTÃO DE CRÉDITO');
    L('');

    const faturaMatch = r.matches.some(m => m.tipo === 'fatura_cartao') ? 'OK' : 'NAO ENCONTRADO [!]';
    L(`**Fatura:** Venc. ${r.cartaoInfo.vencimento} | Total: ${formatBRL(r.cartaoInfo.valorTotal)} | Match DEB.CTA.FATURA: **${faturaMatch}**`);
    L('');

    const titularStats: Record<string, { count: number; total: number }> = {};
    for (const t of r.cartaoTransacoes) {
      if (!t.isPagamentoFatura && !t.isEstorno) {
        const tit = t.titular || 'DESCONHECIDO';
        if (!titularStats[tit]) titularStats[tit] = { count: 0, total: 0 };
        titularStats[tit].count++;
        titularStats[tit].total += Math.abs(t.valor);
      }
    }

    if (Object.keys(titularStats).length > 0) {
      L('| Titular | Transações | Total |');
      L('|---------|-----------|-------|');
      const sorted = Object.entries(titularStats).sort((a, b) => b[1].total - a[1].total);
      for (const [tit, stats] of sorted) {
        L(`| ${tit} | ${stats.count} | ${formatBRL(stats.total)} |`);
      }
      const totalTit = Object.values(titularStats).reduce((s, v) => s + v.total, 0);
      const countTit = Object.values(titularStats).reduce((s, v) => s + v.count, 0);
      L(`| **TOTAL** | **${countTit}** | **${formatBRL(totalTit)}** |`);
      L('');
    }

    const validImport = r.cartaoTransacoes.filter(t => !t.isPagamentoFatura && !t.isEstorno);
    const totalImport = validImport.reduce((s, t) => s + Math.abs(t.valor), 0);
    L(`**Transações para importar:** ${validImport.length} transações, total ${formatBRL(totalImport)}`);
    L('');

    L('---');
    L('');
  }

  // ---- 4. CHECKLIST ----
  L('## 4. CHECKLIST DE FECHAMENTO');
  L('');

  const divCounts: Record<string, number> = {};
  for (const d of r.divergencias) {
    divCounts[d.tipo] = (divCounts[d.tipo] || 0) + 1;
  }

  if (divCounts['T']) {
    const totalT = r.divergencias.filter(d => d.tipo === 'T').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **TRANSFERÊNCIAS:** ${divCounts['T']} transferências entre contas, total ${formatBRL(totalT)} — lançar no Omie`);
  }
  if (divCounts['A']) {
    const totalA = r.divergencias.filter(d => d.tipo === 'A').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **FALTANDO:** ${divCounts['A']} lançamentos faltando no Omie, total ${formatBRL(totalA)}`);
  }
  if (divCounts['B*']) {
    const totalReceber = r.divergencias.filter(d => d.tipo === 'B*').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **ATRASO RECEBER:** ${divCounts['B*']} contas a receber em atraso, total ${formatBRL(totalReceber)} — cobrar clientes`);
  }
  if (divCounts['G']) {
    const totalPagar = r.divergencias.filter(d => d.tipo === 'G').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **ATRASO PAGAR:** ${divCounts['G']} contas a pagar vencidas, total ${formatBRL(totalPagar)} — verificar pagamentos`);
  }
  if (divCounts['F']) {
    const totalF = r.divergencias.filter(d => d.tipo === 'F').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **CONTA ERRADA:** ${divCounts['F']} possíveis lançamentos na conta errada (cartão), total ${formatBRL(totalF)} — mover no Omie`);
  }
  if (divCounts['B']) {
    const totalB = r.divergencias.filter(d => d.tipo === 'B').reduce((s, d) => s + Math.abs(d.valor), 0);
    L(`- [ ] **A MAIS:** ${divCounts['B']} lançamentos a mais no Omie, total ${formatBRL(totalB)} — investigar`);
  }
  if (divCounts['C']) {
    const totalC = r.divergencias.filter(d => d.tipo === 'C').reduce((s, d) => s + Math.abs(d.diferenca || 0), 0);
    L(`- [ ] **VALORES:** ${divCounts['C']} com valor divergente, diferença total ${formatBRL(totalC)}`);
  }
  if (divCounts['D']) {
    L(`- [ ] **DATAS:** ${divCounts['D']} com data divergente — corrigir`);
  }
  if (divCounts['E']) {
    L(`- [ ] **DUPLICIDADES:** ${divCounts['E']} duplicatas no Omie — remover`);
  }

  const validImportCheck = r.cartaoTransacoes.filter(t => !t.isPagamentoFatura && !t.isEstorno);
  if (validImportCheck.length > 0) {
    const totalImportCheck = validImportCheck.reduce((s, t) => s + Math.abs(t.valor), 0);
    L(`- [ ] **CARTÃO:** Importar planilha com ${validImportCheck.length} despesas, total ${formatBRL(totalImportCheck)}`);
  }

  if (Math.abs(diffSaldo) > 0.01) {
    L(`- [ ] **SALDO:** Diferença de saldo anterior ${formatBRL(diffSaldo)} — investigar`);
  }

  if ((r.camadaCounts['D'] || 0) > 0) {
    L(`- [ ] **REVISAR:** ${r.camadaCounts['D']} matches com baixa confiança`);
  }

  if (r.lancamentosFuturos && r.lancamentosFuturos.quantidade > 0) {
    L(`- [x] **FUTUROS:** ${r.lancamentosFuturos.quantidade} lancamentos apos ${r.lancamentosFuturos.ultimaDataBanco} excluidos da conciliacao (${formatBRL(r.lancamentosFuturos.total)})`);
  }

  L('');
  L('---');
  L(`*Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — Conciliação Financeira CONCEPT Engenharia*`);

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  const content = '\uFEFF' + lines.join('\n');
  downloadFile(content, `relatorio_conciliacao_${sufixo}.md`, 'text/markdown;charset=utf-8');
}

// ============================================================
// 2. EXCEL DE DIVERGÊNCIAS
// ============================================================

export function gerarExcelDivergencias(resultado: ResultadoConciliacao): void {
  const r = resultado;

  const tipoDescricoes: Record<string, string> = {
    'A': 'FALTANDO NO OMIE',
    'T': 'TRANSFERÊNCIA ENTRE CONTAS',
    'B': 'A MAIS NO OMIE',
    'B*': 'CONTA A RECEBER EM ATRASO',
    'C': 'VALOR DIVERGENTE',
    'D': 'DATA DIVERGENTE',
    'E': 'DUPLICIDADE',
    'F': 'POSSÍVEL CONTA ERRADA',
    'G': 'CONTA A PAGAR EM ATRASO',
    'I': 'CARTÃO - IMPORTAR',
  };

  const headers = [
    '#', 'Tipo', 'Descrição Tipo', 'Fonte', 'Data', 'Valor (R$)',
    'Descrição/Fornecedor', 'CNPJ/CPF', 'Situação', 'Origem',
    'Valor Banco', 'Valor Omie', 'Diferença', 'Dias Diferença',
    'Titular Cartão', 'Categoria Sugerida', 'NF', 'Ação Sugerida', 'Observação',
    'Fornecedor (Razão Social)', 'Categoria', 'Situação Omie', 'Projeto', 'Observações Omie'
  ];

  const rows: unknown[][] = [headers];

  r.divergencias.forEach((d, i) => {
    rows.push([
      i + 1,
      d.tipo,
      tipoDescricoes[d.tipo] || d.tipo,
      d.fonte || '',
      d.data || '',
      d.valor || '',
      d.descricao || '',
      d.cnpjCpf || '',
      d.situacao || '',
      d.origem || '',
      d.valorBanco || '',
      d.valorOmie || '',
      d.diferenca || '',
      d.diasDiferenca || '',
      d.titular || '',
      d.categoriaSugerida || '',
      d.nf || '',
      d.acao || '',
      d.obs || '',
      d.omie?.clienteFornecedor || d.omie?.razaoSocial || '',
      d.omie?.categoria || '',
      d.omie?.situacao || '',
      d.omie?.projeto || '',
      d.omie?.observacoes || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Aplicar formato contábil nas colunas de valor
  const valorColumns = [5, 10, 11, 12]; // F=5, K=10, L=11, M=12 (0-indexed)
  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    for (const colIdx of valorColumns) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
        ws[cellRef].z = '[Blue]#,##0.00;[Red](#,##0.00);0.00';
      }
    }
  }

  ws['!cols'] = [
    { wch: 5 }, { wch: 5 }, { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 42 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 30 }, { wch: 50 },
    { wch: 40 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 50 },
  ];

  ws['!autofilter'] = { ref: `A1:X${rows.length}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Divergências');

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  XLSX.writeFile(wb, `divergencias_${sufixo}.xlsx`);
}

// ============================================================
// 3. EXCEL DE IMPORTAÇÃO DO CARTÃO (formato Omie)
// ============================================================

export function gerarExcelImportacaoCartao(resultado: ResultadoConciliacao): void {
  const r = resultado;

  if (!r.cartaoInfo || !r.cartaoTransacoes) {
    return;
  }

  const dataVencimento = r.cartaoInfo.vencimento || '';
  const contaCorrente = CATEGORIAS_CONFIG.conta_corrente || 'CARTAO DE CREDITO';

  const valid = r.cartaoTransacoes.filter(t =>
    !t.isPagamentoFatura && !t.isEstorno
  );

  const headers = [
    '',                                                          // A
    'Código de Integração',                                      // B
    'Fornecedor * (Razão Social, Nome Fantasia, CNPJ ou CPF)',   // C
    'Categoria *',                                               // D
    'Conta Corrente *',                                          // E
    'Valor da Conta *',                                          // F
    'Vendedor',                                                  // G
    'Projeto',                                                   // H
    'Data de Emissão',                                           // I
    'Data de Registro *',                                        // J
    'Data de Vencimento *',                                      // K
    'Data de Previsão',                                          // L
    'Data do Pagamento',                                         // M
    'Valor do Pagamento',                                        // N
    'Juros',                                                     // O
    'Multa',                                                     // P
    'Desconto',                                                  // Q
    'Data de Conciliação',                                       // R
    'Observações',                                               // S
    'Tipo de Documento',                                         // T
    'Número do Documento',                                       // U
    'Parcela',                                                   // V
    'Total de Parcelas',                                         // W
    'Número do Pedido',                                          // X
    'Nota Fiscal',                                               // Y
  ];

  const row1 = ['', 'IMPORTAÇÃO DE CONTAS A PAGAR - OMIE'];
  const row2 = ['', `Fatura Cartão — Venc. ${dataVencimento}`];
  const row3 = ['', `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`];
  const row4: string[] = [];

  const rows: unknown[][] = [row1, row2, row3, row4, headers];

  const mesAnoRef = dataVencimento
    ? dataVencimento.replace(/\//g, '').substring(2, 6)
    : new Date().toISOString().substring(5, 7) + new Date().toISOString().substring(2, 4);

  let seqNum = 1;
  for (const t of valid) {
    const cat = t.categoriaSugerida || suggestCategoria(t.descricao) || CATEGORIAS_CONFIG.categoria_padrao;
    const codigoIntegracao = `CARTAO-${mesAnoRef}-${String(seqNum).padStart(3, '0')}`;

    let obs = t.titular || '';
    if (t.descricao) obs += ` | ${t.descricao.trim()}`;
    if (t.parcela) obs += ` | ${t.parcela}`;
    obs += ` | Ref: ${codigoIntegracao}`;

    rows.push([
      '',                            // A
      codigoIntegracao,              // B  Código de Integração
      'CARTAO DE CREDITO',           // C  Fornecedor
      cat,                           // D  Categoria
      contaCorrente,                 // E  Conta Corrente
      Math.abs(t.valor),             // F  Valor da Conta
      '',                            // G  Vendedor
      '',                            // H  Projeto
      '',                            // I  Data de Emissão
      t.dataStr,                     // J  Data de Registro
      dataVencimento,                // K  Data de Vencimento
      '',                            // L  Data de Previsão
      dataVencimento,                // M  Data do Pagamento
      Math.abs(t.valor),             // N  Valor do Pagamento
      0,                             // O  Juros
      0,                             // P  Multa
      0,                             // Q  Desconto
      dataVencimento,                // R  Data de Conciliação
      obs.trim(),                    // S  Observações
      'Outros',                      // T  Tipo de Documento
      codigoIntegracao,              // U  Número do Documento
      '',                            // V  Parcela (vazio - conta independente)
      '',                            // W  Total de Parcelas (vazio)
      '',                            // X  Número do Pedido
      codigoIntegracao,              // Y  Nota Fiscal
    ]);
    seqNum++;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 3 },   // A
    { wch: 20 },  // B  Código de Integração
    { wch: 45 },  // C  Fornecedor
    { wch: 40 },  // D  Categoria
    { wch: 22 },  // E  Conta Corrente
    { wch: 14 },  // F  Valor da Conta
    { wch: 10 },  // G  Vendedor
    { wch: 10 },  // H  Projeto
    { wch: 14 },  // I  Data de Emissão
    { wch: 14 },  // J  Data de Registro
    { wch: 16 },  // K  Data de Vencimento
    { wch: 14 },  // L  Data de Previsão
    { wch: 14 },  // M  Data do Pagamento
    { wch: 14 },  // N  Valor do Pagamento
    { wch: 8 },   // O  Juros
    { wch: 8 },   // P  Multa
    { wch: 8 },   // Q  Desconto
    { wch: 14 },  // R  Data de Conciliação
    { wch: 50 },  // S  Observações
    { wch: 14 },  // T  Tipo de Documento
    { wch: 20 },  // U  Número do Documento
    { wch: 8 },   // V  Parcela
    { wch: 10 },  // W  Total de Parcelas
    { wch: 14 },  // X  Número do Pedido
    { wch: 20 },  // Y  Nota Fiscal
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Omie_Contas_Pagar');

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  XLSX.writeFile(wb, `importacao_cartao_${sufixo}.xlsx`);
}

// ============================================================
// 4. RELATÓRIO PDF
// ============================================================

export function gerarRelatorioPDF(resultado: ResultadoConciliacao): void {
  const r = resultado;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 15;

  const azulEscuro: [number, number, number] = [47, 84, 150];
  const vermelho: [number, number, number] = [200, 50, 50];
  const verde: [number, number, number] = [40, 150, 80];

  const checkPage = (needed: number = 30) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 15;
    }
  };

  const fmt = (v: number) => {
    if (v == null || isNaN(v)) return 'R$ 0,00';
    const abs = Math.abs(v);
    const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
  };

  // HEADER
  doc.setFillColor(...azulEscuro);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE CONCILIAÇÃO FINANCEIRA', margin, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`CONCEPT Engenharia — ${r.mesLabel}/${r.anoLabel}`, margin, 22);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 28);
  doc.setTextColor(0, 0, 0);
  y = 40;

  // 1. RESUMO EXECUTIVO
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text('1. RESUMO EXECUTIVO', margin, y);
  y += 8;

  const kpis = [
    { label: 'Conciliados', value: String(r.totalConciliados), color: verde },
    { label: 'Divergências', value: String(r.divergencias.length), color: [200, 150, 30] as [number, number, number] },
    { label: 'Em Atraso', value: String(r.divergencias.filter(d => d.tipo === 'B*').length), color: vermelho },
  ];

  const cardW = (pageWidth - 2 * margin - 10) / 3;
  kpis.forEach((kpi, i) => {
    const x = margin + i * (cardW + 5);
    doc.setFillColor(...kpi.color);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + cardW / 2, y + 9, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x + cardW / 2, y + 15, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);
  y += 26;

  // Banner de lançamentos zerados
  if (r.lancamentosZerados && r.lancamentosZerados.total > 0) {
    const bannerText = `${r.lancamentosZerados.total} lancamentos com valor R$ 0,00 foram ignorados (${r.lancamentosZerados.banco} do banco, ${r.lancamentosZerados.omie} do Omie).`;
    doc.setFillColor(230, 242, 255);
    doc.rect(margin, y - 3, pageWidth - 2 * margin, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 80, 120);
    doc.text(bannerText, margin + 2, y + 1);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // Banner de lançamentos futuros
  if (r.lancamentosFuturos && r.lancamentosFuturos.quantidade > 0) {
    const futuroText = `Periodo: ate ${r.lancamentosFuturos.ultimaDataBanco} (ultima data do extrato). ${r.lancamentosFuturos.quantidade} lancamentos futuros do Omie excluidos (${fmt(r.lancamentosFuturos.total)}).`;
    doc.setFillColor(219, 234, 254);
    doc.rect(margin, y - 3, pageWidth - 2 * margin, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(30, 64, 175);
    doc.text(futuroText, margin + 2, y + 1);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // Tabela Fontes
  const totalEntradasBanco = r.banco.filter(b => b.valor > 0).reduce((s, b) => s + b.valor, 0);
  const totalSaidasBanco = r.banco.filter(b => b.valor < 0).reduce((s, b) => s + b.valor, 0);
  const totalEntradasOmie = r.omieSicredi.filter(o => o.valor > 0).reduce((s, o) => s + o.valor, 0);
  const totalSaidasOmie = r.omieSicredi.filter(o => o.valor < 0).reduce((s, o) => s + o.valor, 0);

  const totalAtrasoPDF = r.divergencias.filter(d => d.tipo === 'B*').reduce((s, d) => s + Math.abs(d.valor), 0);
  const entradasOmieSemAtrasoPDF = totalEntradasOmie - totalAtrasoPDF;

  autoTable(doc, {
    startY: y,
    head: [['Fonte', 'Lanc.', 'Entradas', 'Saidas', 'Em Atraso', 'Liquido']],
    body: [
      ['Banco (Sicredi)', String(r.banco.length), fmt(totalEntradasBanco), fmt(totalSaidasBanco), '--', fmt(totalEntradasBanco + totalSaidasBanco)],
      ['Omie (Sicredi)', String(r.omieSicredi.length), fmt(entradasOmieSemAtrasoPDF), fmt(totalSaidasOmie), fmt(totalAtrasoPDF), fmt(totalEntradasOmie + totalSaidasOmie)],
      ...(r.cartaoInfo && r.cartaoTransacoes?.length > 0 ? [['Cartao', `${r.cartaoTransacoes.length} trans.`, '--', fmt(-r.cartaoInfo.valorTotal), '--', '--']] : []),
    ],
    theme: 'grid',
    headStyles: { fillColor: azulEscuro, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
    styles: { cellPadding: 2, overflow: 'linebreak' },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Matching por camada
  checkPage(30);
  autoTable(doc, {
    startY: y,
    head: [['Camada', 'Confiança', 'Qtd']],
    body: [
      ['A', 'ALTA', String(r.camadaCounts['A'] || 0)],
      ['B', 'MÉDIA', String(r.camadaCounts['B'] || 0)],
      ['C', 'MÉDIA (agrupamento)', String(r.camadaCounts['C'] || 0)],
      ['D', 'BAIXA', String(r.camadaCounts['D'] || 0)],
      ['TOTAL', '', String(r.totalConciliados)],
    ],
    theme: 'grid',
    headStyles: { fillColor: azulEscuro, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
    styles: { cellPadding: 2, overflow: 'linebreak' },
    columnStyles: { 2: { halign: 'center' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // 2. DIVERGÊNCIAS
  checkPage(20);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text('2. DIVERGÊNCIAS', margin, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  const divByTipo: Record<string, Divergencia[]> = {};
  for (const d of r.divergencias) {
    if (!divByTipo[d.tipo]) divByTipo[d.tipo] = [];
    divByTipo[d.tipo].push(d);
  }

  const tipoConfig: [string, string, [number, number, number]][] = [
    ['A', 'Tipo A — Faltando no Omie', [252, 228, 236]],
    ['T', 'Tipo T — Transferencias entre contas', [224, 247, 250]],
    ['F', 'Tipo F — Possivel Conta Errada (Cartao)', [255, 235, 238]],
    ['B*', 'Contas a Receber em Atraso', [255, 243, 224]],
    ['G', 'Contas a Pagar em Atraso', [255, 237, 213]],
    ['B', 'Tipo B — A mais no Omie', [243, 229, 245]],
    ['C', 'Tipo C — Valor divergente', [255, 253, 231]],
    ['E', 'Tipo E — Duplicidades', [243, 229, 245]],
  ];

  for (const [tipo, titulo, cor] of tipoConfig) {
    if (!divByTipo[tipo]?.length) continue;
    const divs = divByTipo[tipo];

    checkPage(25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${titulo} (${divs.length})`, margin, y);
    y += 5;

    const hasNF = ['B', 'F', 'B*'].includes(tipo);

    const bodyRows = divs.map((d, i) => {
      const base = [
        String(i + 1),
        d.data || '',
        fmt(d.valor),
        descricaoLegivel(d),
      ];
      if (hasNF) {
        base.push(d.omie?.notaFiscal || '--');
      }
      base.push(d.omie?.categoria || '');
      base.push(d.acao || '');
      return base;
    });

    const totalTipo = divs.reduce((s, d) => s + (d.valor || 0), 0);
    if (hasNF) {
      bodyRows.push(['', '', fmt(totalTipo), `${divs.length} itens`, '', '', '']);
    } else {
      bodyRows.push(['', '', fmt(totalTipo), `${divs.length} itens`, '', '']);
    }

    const headRow = hasNF
      ? [['#', 'Data', 'Valor', 'Fornecedor', 'NF', 'Categoria', 'Acao']]
      : [['#', 'Data', 'Valor', 'Fornecedor', 'Categoria', 'Acao']];

    const colStyles: any = hasNF
      ? {
          0: { cellWidth: 7 },
          1: { cellWidth: 18 },
          2: { cellWidth: 22, halign: 'right' },
          3: { cellWidth: 38 },
          4: { cellWidth: 18 },
          5: { cellWidth: 30 },
          6: { cellWidth: 47 },
        }
      : {
          0: { cellWidth: 8 },
          1: { cellWidth: 20 },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 45 },
          4: { cellWidth: 35 },
          5: { cellWidth: 47 },
        };

    autoTable(doc, {
      startY: y,
      head: headRow,
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: azulEscuro, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: cor },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: colStyles,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // 3. CARTÃO (só se houver transações)
  if (r.cartaoTransacoes?.length > 0 && r.cartaoInfo) {
    checkPage(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...azulEscuro);
    doc.text('3. CARTÃO DE CRÉDITO', margin, y);
    y += 7;
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fatura: Venc. ${r.cartaoInfo.vencimento} | Total: ${fmt(r.cartaoInfo.valorTotal)}`, margin, y);
    y += 6;

    const titularStats: Record<string, { count: number; total: number }> = {};
    for (const t of r.cartaoTransacoes) {
      if (!t.isPagamentoFatura && !t.isEstorno) {
        const tit = t.titular || 'DESCONHECIDO';
        if (!titularStats[tit]) titularStats[tit] = { count: 0, total: 0 };
        titularStats[tit].count++;
        titularStats[tit].total += Math.abs(t.valor);
      }
    }

    if (Object.keys(titularStats).length > 0) {
      const sorted = Object.entries(titularStats).sort((a, b) => b[1].total - a[1].total);
      const totalTit = Object.values(titularStats).reduce((s, v) => s + v.total, 0);
      const countTit = Object.values(titularStats).reduce((s, v) => s + v.count, 0);

      autoTable(doc, {
        startY: y,
        head: [['Titular', 'Transações', 'Total']],
        body: [
          ...sorted.map(([tit, stats]) => [tit, String(stats.count), fmt(stats.total)]),
          ['TOTAL', String(countTit), fmt(totalTit)],
        ],
        theme: 'grid',
        headStyles: { fillColor: azulEscuro, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
        styles: { cellPadding: 2, overflow: 'linebreak' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    const validImport = r.cartaoTransacoes.filter(t => !t.isPagamentoFatura && !t.isEstorno);
    const totalImport = validImport.reduce((s, t) => s + Math.abs(t.valor), 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Transações para importar: ${validImport.length} transações, total ${fmt(totalImport)}`, margin, y);
    y += 10;
  }

  // 4. CHECKLIST
  checkPage(40);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...azulEscuro);
  doc.text('4. CHECKLIST DE FECHAMENTO', margin, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  const divCounts: Record<string, number> = {};
  for (const d of r.divergencias) {
    divCounts[d.tipo] = (divCounts[d.tipo] || 0) + 1;
  }

  const checkItems: { texto: string; cor: [number, number, number] }[] = [];
  if (divCounts['A']) {
    const totalA = r.divergencias.filter(d => d.tipo === 'A').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push({ texto: `FALTANDO: ${divCounts['A']} lancamentos faltando no Omie, total ${fmt(totalA)}`, cor: [200, 50, 50] });
  }
  if (divCounts['T']) {
    checkItems.push({ texto: `TRANSFERENCIAS: ${divCounts['T']} transferencias entre contas para lancar`, cor: [200, 120, 0] });
  }
  if (divCounts['B*']) {
    const totalReceber = r.divergencias.filter(d => d.tipo === 'B*').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push({ texto: `ATRASO RECEBER: ${divCounts['B*']} contas a receber em atraso, total ${fmt(totalReceber)} - cobrar clientes`, cor: [200, 50, 50] });
  }
  if (divCounts['G']) {
    const totalPagar = r.divergencias.filter(d => d.tipo === 'G').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push({ texto: `ATRASO PAGAR: ${divCounts['G']} contas a pagar vencidas, total ${fmt(totalPagar)} - verificar pagamentos`, cor: [200, 120, 0] });
  }
  if (divCounts['F']) {
    const totalF = r.divergencias.filter(d => d.tipo === 'F').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push({ texto: `CONTA ERRADA: ${divCounts['F']} possíveis lançamentos na conta errada (cartão), total ${fmt(totalF)} - mover`, cor: [200, 50, 100] });
  }
  if (divCounts['B']) {
    const totalB = r.divergencias.filter(d => d.tipo === 'B').reduce((s, d) => s + Math.abs(d.valor), 0);
    checkItems.push({ texto: `A MAIS: ${divCounts['B']} a mais no Omie, total ${fmt(totalB)} - investigar`, cor: [200, 120, 0] });
  }
  if (divCounts['C']) checkItems.push({ texto: `VALORES: ${divCounts['C']} com valor divergente - corrigir`, cor: [200, 120, 0] });
  if (divCounts['E']) checkItems.push({ texto: `DUPLICIDADES: ${divCounts['E']} duplicatas no Omie - remover`, cor: [200, 50, 50] });

  const validImportCheck = r.cartaoTransacoes?.filter(t => !t.isPagamentoFatura && !t.isEstorno) || [];
  if (validImportCheck.length > 0) {
    const totalImportCheck = validImportCheck.reduce((s, t) => s + Math.abs(t.valor), 0);
    checkItems.push({ texto: `CARTAO: Importar planilha com ${validImportCheck.length} despesas, total ${fmt(totalImportCheck)}`, cor: [47, 84, 150] });
  }

  if ((r.camadaCounts['D'] || 0) > 0) {
    checkItems.push({ texto: `REVISAR: ${r.camadaCounts['D']} matches com baixa confianca`, cor: [100, 100, 100] });
  }

  if (r.lancamentosFuturos && r.lancamentosFuturos.quantidade > 0) {
    checkItems.push({ texto: `FUTUROS: ${r.lancamentosFuturos.quantidade} lancamentos apos ${r.lancamentosFuturos.ultimaDataBanco} excluidos da conciliacao (${fmt(r.lancamentosFuturos.total)})`, cor: [30, 64, 175] });
  }

  if (checkItems.length > 0) {
    autoTable(doc, {
      startY: y,
      body: checkItems.map(item => [`- ${item.texto}`]),
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 8, right: 4 },
        font: 'helvetica',
        overflow: 'linebreak',
      },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const item = checkItems[data.row.index];
          if (item) {
            data.cell.styles.textColor = item.cor;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text(`Relatório gerado automaticamente — Conciliação Financeira CONCEPT Engenharia — ${new Date().toLocaleDateString('pt-BR')}`, margin, y);

  const sufixo = `${r.mesLabel?.toLowerCase().substring(0, 3) || 'mes'}${r.anoLabel || '2026'}`;
  doc.save(`relatorio_conciliacao_${sufixo}.pdf`);
}
