/**
 * Motor de Conciliação Bancária
 *
 * Centraliza toda a lógica de reconciliação entre:
 * - Extratos bancários (Banco)
 * - Lançamentos contábeis (Omie)
 * - Transações de cartão de crédito
 *
 * FLUXO DE CONCILIAÇÃO:
 * 1. Auto-detecta e filtra por conta corrente (score por overlap de valores)
 * 2. Executa 4 camadas de matching em cascata:
 *    - Camada A: Match exato (CNPJ + valor + data ≤1 dia) → Confiança ALTA
 *    - Camada B: Match flexível (nome + valor + data ≤3 dias)
 *    - Camada C: Match por valor + data
 *    - Camada D: Match residual
 * 3. Detecta duplicidades (tipo E)
 * 4. Classifica divergências restantes (A/B/C/D/T)
 * 5. Sugere categorias automaticamente por keywords
 *
 * Resultado: Matches com confiança graduada + divergências + sugestões
 */

import { matchCamadaA, matchCamadaB, matchCamadaC, matchCamadaD, matchFaturaCartao } from './matcher';
import { detectDuplicates, classifyDivergencias } from './classifier';
import { parseBanco, parseOmie, parseCartaoFromText, workbookToRows, csvToText } from './parsers';
import { suggestCategoria } from './categorias';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, CartaoInfo, Match, Divergencia, ResultadoConciliacao } from './types';

// ============================================================
// AUTO-DETECT CONTA CORRENTE + FILTER
// ============================================================
function filtrarPorContaCorrente(
  banco: LancamentoBanco[],
  omie: LancamentoOmie[],
): {
  omieFiltrado: LancamentoOmie[];
  contaCorrenteSelecionada: string;
  contasExcluidas: { nome: string; count: number; entradas: LancamentoOmie[] }[];
  totalOmieOriginal: number;
  totalOmieFiltrado: number;
} {
  const totalOmieOriginal = omie.length;

  // Filter out individual card transaction entries (CARTAO-XXXX-XXX pattern)
  const cartaoDocRegex = /^CARTAO-\d{4}-\d{3}/;
  const omieFiltered = omie.filter(o => !cartaoDocRegex.test(o.documento || ''));

  // Group by contaCorrente
  const contaGroups = new Map<string, LancamentoOmie[]>();
  for (const o of omieFiltered) {
    const conta = (o.contaCorrente || '').trim();
    if (!conta) continue;
    if (!contaGroups.has(conta)) contaGroups.set(conta, []);
    contaGroups.get(conta)!.push(o);
  }

  if (contaGroups.size <= 1) {
    const conta = contaGroups.size === 1 ? [...contaGroups.keys()][0] : '';
    return {
      omieFiltrado: omieFiltered,
      contaCorrenteSelecionada: conta,
      contasExcluidas: [],
      totalOmieOriginal,
      totalOmieFiltrado: omieFiltered.length,
    };
  }

  // Score each account by value match overlap with banco
  const bancoValues = new Map<string, number>();
  for (const b of banco) {
    const key = Math.abs(b.valor).toFixed(2);
    bancoValues.set(key, (bancoValues.get(key) || 0) + 1);
  }

  let bestConta = '';
  let bestScore = -1;

  for (const [conta, entries] of contaGroups) {
    let score = 0;
    for (const o of entries) {
      const key = Math.abs(o.valor).toFixed(2);
      if (bancoValues.has(key)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestConta = conta;
    }
  }

  const omieFiltrado = omieFiltered.filter(o => (o.contaCorrente || '').trim() === bestConta);
  const contasExcluidas: { nome: string; count: number; entradas: LancamentoOmie[] }[] = [];
  for (const [conta, entries] of contaGroups) {
    if (conta !== bestConta) {
      contasExcluidas.push({ nome: conta, count: entries.length, entradas: entries });
    }
  }

  // Also count CARTAO-filtered entries
  const cartaoFiltered = omie.length - omieFiltered.length;
  if (cartaoFiltered > 0) {
    contasExcluidas.push({ nome: 'CARTAO (individual)', count: cartaoFiltered, entradas: [] });
  }

  return {
    omieFiltrado,
    contaCorrenteSelecionada: bestConta,
    contasExcluidas,
    totalOmieOriginal,
    totalOmieFiltrado: omieFiltrado.length,
  };
}

// Core matching logic shared between file-based and data-based flows
function executarMatchingEClassificacao(
  banco: LancamentoBanco[],
  omie: LancamentoOmie[],
  cartaoTransacoes: TransacaoCartao[] = [],
  cartaoInfo: CartaoInfo = { vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 },
  saldoBanco: number | null,
  saldoOmie: number | null,
): ResultadoConciliacao {
  // Filtrar lançamentos com valor zero (não participam da conciliação)
  const bancoFiltrado = banco.filter(b => Math.abs(b.valor) >= 0.01);
  const omieFiltradoZero = omie.filter(o => Math.abs(o.valor) >= 0.01);
  const zeradosBanco = banco.length - bancoFiltrado.length;
  const zeradosOmie = omie.length - omieFiltradoZero.length;

  // Sugestão de categoria para cartão (only if cartao data present)
  if (cartaoTransacoes.length > 0) {
    for (const t of cartaoTransacoes) {
      if (!t.isPagamentoFatura && !t.isEstorno) {
        t.categoriaSugerida = suggestCategoria(t.descricao);
      }
    }
  }

  // Auto-detect and filter by conta corrente
  const filtro = filtrarPorContaCorrente(bancoFiltrado, omieFiltradoZero);

  // === Filtrar lançamentos Omie com data futura ===
  let ultimaDataBanco = new Date('1900-01-01');
  for (const b of bancoFiltrado) {
    if (b.data instanceof Date && b.data > ultimaDataBanco) {
      ultimaDataBanco = b.data;
    }
  }

  const omieDentroPeriodo = filtro.omieFiltrado.filter(o => {
    if (!(o.data instanceof Date)) return true;
    return o.data <= ultimaDataBanco;
  });

  const lancamentosFuturos = filtro.omieFiltrado.filter(o => {
    if (!(o.data instanceof Date)) return false;
    return o.data > ultimaDataBanco;
  });

  const totalFuturos = lancamentosFuturos.reduce((s, o) => s + Math.abs(o.valor), 0);
  if (lancamentosFuturos.length > 0) {
    console.log(`[Conciliacao] Filtro futuro: ${lancamentosFuturos.length} lancamentos Omie apos ${ultimaDataBanco.toLocaleDateString('pt-BR')} excluidos (total ${totalFuturos.toFixed(2)})`);
  }

  const omieFiltrado = omieDentroPeriodo;
  // === FIM do filtro futuro ===

  const matches: Match[] = [];
  const divergencias: Divergencia[] = [];

  // === DIAGNÓSTICO FOPAG ===
  const fopagBanco = bancoFiltrado.filter(b => b.tipo === 'PIX_ENVIADO' || b.tipo === 'FOLHA');
  const fopagOmie = omieFiltrado.filter(o => /FOPAG|FOLHA|SALARIO|SALÁRIO/i.test(o.categoria));
  console.log(`[FOPAG Diag] Banco: ${fopagBanco.length} entradas PIX_ENVIADO/FOLHA`);
  console.log(`[FOPAG Diag] Omie: ${fopagOmie.length} entradas com categoria FOPAG/FOLHA`);
  for (const fo of fopagOmie.slice(0, 5)) {
    console.log(`[FOPAG Diag] Omie FOPAG: cliente="${fo.clienteFornecedor}" valor=${fo.valor} data=${fo.dataStr} cat="${fo.categoria}" obs="${(fo.observacoes || '').substring(0, 80)}" razao="${fo.razaoSocial}"`);
  }
  const luizBanco = bancoFiltrado.find(b => b.nome?.toUpperCase().includes('LUIZ ALBERTO'));
  const luizOmie = omieFiltrado.find(o => (o.observacoes || '').toUpperCase().includes('LUIZ ALBERTO'));
  const luizOmieByValor = fopagOmie.find(o => Math.abs(o.valor - (-1572.22)) < 0.01);
  console.log(`[FOPAG Diag] LUIZ ALBERTO no banco: ${luizBanco ? `tipo=${luizBanco.tipo} val=${luizBanco.valor} nome="${luizBanco.nome}"` : 'NAO ENCONTRADO'}`);
  console.log(`[FOPAG Diag] LUIZ ALBERTO no Omie (por obs): ${luizOmie ? `cliente="${luizOmie.clienteFornecedor}" val=${luizOmie.valor} obs="${(luizOmie.observacoes || '').substring(0, 80)}"` : 'NAO ENCONTRADO'}`);
  console.log(`[FOPAG Diag] Omie FOPAG com valor -1572.22: ${luizOmieByValor ? `cliente="${luizOmieByValor.clienteFornecedor}" obs="${(luizOmieByValor.observacoes || '').substring(0, 60)}"` : 'NAO ENCONTRADO'}`);
  // === FIM DIAGNÓSTICO ===

  matchCamadaA(bancoFiltrado, omieFiltrado, matches);
  matchCamadaB(bancoFiltrado, omieFiltrado, matches);
  matchCamadaC(bancoFiltrado, omieFiltrado, matches);
  matchCamadaD(bancoFiltrado, omieFiltrado, matches);
  matchFaturaCartao(bancoFiltrado, omieFiltrado, matches);

  detectDuplicates(omieFiltrado, divergencias);
  classifyDivergencias(bancoFiltrado, omieFiltrado, cartaoTransacoes, divergencias, matches, filtro.contasExcluidas);

  const camadaCounts: Record<string, number> = {};
  for (const m of matches) {
    camadaCounts[m.camada] = (camadaCounts[m.camada] || 0) + 1;
  }

  const divCounts: Record<string, number> = {};
  for (const d of divergencias) {
    divCounts[d.tipo] = (divCounts[d.tipo] || 0) + 1;
  }

  const contasAtraso = divergencias.filter(d => d.tipo === 'B*').length;
  const cartaoImportaveis = divergencias.filter(d => d.tipo === 'I').length;

  const mesAno = detectarMesAno(bancoFiltrado);

  return {
    matches,
    divergencias,
    banco: bancoFiltrado,
    omieSicredi: omieFiltrado,
    cartaoTransacoes,
    cartaoInfo,
    saldoBanco,
    saldoOmie,
    camadaCounts,
    divCounts,
    totalConciliados: matches.length,
    totalDivergencias: divergencias.length,
    contasAtraso,
    cartaoImportaveis,
    mesLabel: mesAno.mesLabel,
    anoLabel: mesAno.anoLabel,
    contaCorrenteSelecionada: filtro.contaCorrenteSelecionada,
    contasExcluidas: filtro.contasExcluidas,
    totalOmieOriginal: filtro.totalOmieOriginal,
    totalOmieFiltrado: filtro.totalOmieFiltrado,
    lancamentosZerados: { banco: zeradosBanco, omie: zeradosOmie, total: zeradosBanco + zeradosOmie },
    lancamentosFuturos: lancamentosFuturos.length > 0 ? {
      quantidade: lancamentosFuturos.length,
      total: totalFuturos,
      ultimaDataBanco: ultimaDataBanco.toLocaleDateString('pt-BR'),
    } : undefined,
  };
}

// Execute reconciliation from pre-parsed data (loaded from database)
export function executarConciliacaoFromData(
  banco: LancamentoBanco[],
  omie: LancamentoOmie[],
  cartaoTransacoes: TransacaoCartao[] = [],
  cartaoInfo: CartaoInfo = { vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 },
  saldoBanco: number | null = null,
  saldoOmie: number | null = null,
): ResultadoConciliacao {
  // Reset matched flags
  for (const b of banco) { b.matched = false; b.matchType = null; b.matchCamada = null; b.matchOmieIdx = null; }
  for (const o of omie) { o.matched = false; o.matchType = null; o.matchCamada = null; o.matchBancoIdx = null; }

  return executarMatchingEClassificacao(banco, omie, cartaoTransacoes, cartaoInfo, saldoBanco, saldoOmie);
}

// Execute reconciliation from uploaded files (original flow)
export async function executarConciliacao(
  bancoFile: File,
  omieFile: File,
  cartaoFile: File | null = null,
): Promise<ResultadoConciliacao> {

  // 1. Parse dos arquivos
  const bancoRows = await workbookToRows(bancoFile);
  const { lancamentos: banco, saldoAnterior: saldoBanco } = parseBanco(bancoRows);

  const omieRows = await workbookToRows(omieFile);
  const { lancamentos: omie, saldoAnterior: saldoOmie } = parseOmie(omieRows);

  let cartaoTransacoes: TransacaoCartao[] = [];
  let cartaoInfo: CartaoInfo = { vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 };

  if (cartaoFile) {
    const fileName = cartaoFile.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      const text = await csvToText(cartaoFile);
      const result = parseCartaoFromText(text);
      cartaoTransacoes = result.transacoes;
      cartaoInfo = result.info;
    } else {
      const rows = await workbookToRows(cartaoFile);
      const text = rows.map(r => (r || []).join(';')).join('\n');
      const result = parseCartaoFromText(text);
      cartaoTransacoes = result.transacoes;
      cartaoInfo = result.info;
    }
  }

  return executarMatchingEClassificacao(banco, omie, cartaoTransacoes, cartaoInfo, saldoBanco, saldoOmie);
}

function detectarMesAno(banco: LancamentoBanco[]): { mesLabel: string; anoLabel: string } {
  const mesesFull = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  if (!banco.length) {
    const now = new Date();
    return { mesLabel: mesesFull[now.getMonth()], anoLabel: String(now.getFullYear()) };
  }

  const counts = new Map<string, number>();
  for (const b of banco) {
    const key = `${b.data.getMonth()}-${b.data.getFullYear()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let bestKey = '';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) { bestKey = key; bestCount = count; }
  }

  if (bestKey) {
    const [month, year] = bestKey.split('-');
    return { mesLabel: mesesFull[parseInt(month)], anoLabel: year };
  }

  const now = new Date();
  return { mesLabel: mesesFull[now.getMonth()], anoLabel: String(now.getFullYear()) };
}
