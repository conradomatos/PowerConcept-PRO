import * as XLSX from 'xlsx';
import { extractCnpjCpf, extractNomeBanco, classifyBanco, parseDate, parseValorBRL } from './utils';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, CartaoInfo } from './types';

// ============================================================
// PARSER BANCO SICREDI (XLS/XLSX)
// ============================================================
export function parseBanco(rows: any[][]): { lancamentos: LancamentoBanco[], saldoAnterior: number | null } {
  let saldoAnterior: number | null = null;
  if (rows.length > 9 && rows[9] && rows[9][4] != null) {
    saldoAnterior = parseFloat(rows[9][4]) || null;
  }

  const lancamentos: LancamentoBanco[] = [];

  for (let i = 10; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || !row[1]) continue;

    const dataStr = String(row[0]).trim();

    if (dataStr.includes('Saldo') || dataStr.includes('Lançamentos Futuros') ||
        dataStr.includes('Vencimento') || dataStr.includes('Custo')) break;

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) continue;

    const desc = String(row[1]).trim();
    const doc = row[2] != null ? String(row[2]).trim() : '';
    const valor = row[3] != null ? parseFloat(row[3]) : 0;
    const saldo = row[4] != null ? parseFloat(row[4]) : null;

    lancamentos.push({
      idx: i,
      data: parseDate(dataStr)!,
      dataStr,
      descricao: desc,
      documento: doc,
      valor,
      saldo,
      cnpjCpf: extractCnpjCpf(desc),
      nome: extractNomeBanco(desc),
      tipo: classifyBanco(desc),
      matched: false,
      matchType: null,
      matchCamada: null,
      matchOmieIdx: null,
    });
  }

  return { lancamentos, saldoAnterior };
}

// ============================================================
// PARSER OMIE (XLSX)
// ============================================================
export function parseOmie(rows: any[][]): { lancamentos: LancamentoOmie[], saldoAnterior: number | null } {
  // DETECT HEADER DYNAMICALLY
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};

  for (let i = 0; i <= 5; i++) {
    const row = rows[i];
    if (!row) continue;
    const rowStr = row.map((c: any) => String(c || '').toUpperCase()).join('|');
    if (rowStr.includes('SITUAÇ') || rowStr.includes('SITUACAO') || (rowStr.includes('CLIENTE') && rowStr.includes('DATA'))) {
      headerRowIdx = i;
      for (let j = 0; j < row.length; j++) {
        const cn = String(row[j] || '').toUpperCase().trim().replace(/[^\x20-\x7E\u00C0-\u024F]/g, '');
        if (cn.includes('SITUAÇ') || cn === 'SITUACAO') colMap['situacao'] = j;
        else if (cn === 'DATA' || cn.includes('DATA LANÇ') || cn.includes('DATA LANC')) colMap['data'] = j;
        // RAZÃO SOCIAL deve vir ANTES de CLIENTE para não ser engolido pelo else-if
        else if (cn.includes('RAZÃO') || cn.includes('RAZAO') || cn.includes('RAZÃ')) colMap['razaoSocial'] = j;
        else if (cn.includes('CLIENTE') || cn.includes('FORNECEDOR')) colMap['cliente'] = j;
        else if (cn.includes('CONTA CORRENTE') || cn === 'CONTA') colMap['conta'] = j;
        else if (cn.includes('CATEGORIA')) colMap['categoria'] = j;
        else if (cn === 'VALOR' || cn.includes('VALOR')) colMap['valor'] = j;
        else if (cn.includes('SALDO')) colMap['saldo'] = j;
        else if (cn.includes('TIPO DOC') || cn.includes('TIPO DE DOC')) colMap['tipoDoc'] = j;
        else if (cn === 'DOCUMENTO' || cn === 'DOC') colMap['documento'] = j;
        else if (cn.includes('NOTA FISCAL') || cn.includes('NF-E') || cn === 'NF' || cn === 'NOTA') colMap['notaFiscal'] = j;
        else if (cn.includes('PARCELA')) colMap['parcela'] = j;
        else if (cn.includes('ORIGEM')) colMap['origem'] = j;
        else if (cn.includes('PROJETO')) colMap['projeto'] = j;
        else if (cn.includes('CNPJ') || cn.includes('CPF')) colMap['cnpjCpf'] = j;
        else if (cn.includes('OBSERV')) colMap['observacoes'] = j;
      }
      // Log de validação dos mapeamentos
      console.log('[Parser Omie] Header detectado na linha', headerRowIdx, '- Mapeamento:', JSON.stringify(colMap));
      if (colMap['razaoSocial'] !== undefined) {
        console.log('[Parser Omie] Razao Social mapeada para coluna', colMap['razaoSocial']);
      } else {
        console.warn('[Parser Omie] Razao Social NAO encontrada no header');
      }
      if (colMap['notaFiscal'] !== undefined) {
        console.log('[Parser Omie] Nota Fiscal mapeada para coluna', colMap['notaFiscal']);
      } else {
        console.warn('[Parser Omie] Nota Fiscal NAO encontrada no header');
      }
      if (colMap['observacoes'] !== undefined) {
        console.log('[Parser Omie] ✅ Coluna Observacoes mapeada para indice', colMap['observacoes']);
      } else {
        console.warn('[Parser Omie] ⚠️ Coluna OBSERVACOES NAO ENCONTRADA no header! O matching FOPAG por nome do colaborador NAO funcionará.');
        const headerRow = rows[headerRowIdx];
        if (headerRow) {
          for (let j = 0; j < headerRow.length; j++) {
            const cn = String(headerRow[j] || '').toUpperCase().trim();
            console.log(`[Parser Omie] Col ${j}: "${cn}"`);
          }
        }
      }
      break;
    }
  }

  // FALLBACK to default indices
  if (Object.keys(colMap).length === 0) {
    headerRowIdx = 2;
    colMap = {
      situacao: 0, data: 1, cliente: 2, conta: 3, categoria: 4,
      valor: 5, saldo: 6, tipoDoc: 9, documento: 10, notaFiscal: 11,
      parcela: 12, origem: 14, projeto: 17, razaoSocial: 18, cnpjCpf: 19, observacoes: 20
    };
  }

  let saldoAnterior: number | null = null;
  const lancamentos: LancamentoOmie[] = [];
  const dataStart = headerRowIdx + 1;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const col = (key: string) => {
      const idx = colMap[key];
      if (idx === undefined || idx >= row.length) return '';
      return row[idx] != null ? String(row[idx]) : '';
    };
    const colNum = (key: string) => {
      const idx = colMap[key];
      if (idx === undefined || idx >= row.length) return 0;
      return row[idx] != null ? parseFloat(row[idx]) || 0 : 0;
    };

    const cliente = col('cliente');

    if (cliente.toUpperCase().includes('SALDO')) {
      if ((cliente.toUpperCase().includes('ANTERIOR') || cliente.toUpperCase().includes('INICIAL')) && saldoAnterior === null) {
        saldoAnterior = colNum('saldo') || null;
      }
      continue;
    }

    const situacao = col('situacao').trim();
    if (!situacao) continue;

    const dataVal = colMap['data'] !== undefined ? row[colMap['data']] : null;
    const data = parseDate(dataVal);
    if (!data) continue;

    lancamentos.push({
      idx: i,
      situacao,
      data,
      dataStr: data.toLocaleDateString('pt-BR'),
      clienteFornecedor: cliente,
      contaCorrente: col('conta'),
      categoria: col('categoria'),
      valor: colNum('valor'),
      tipoDoc: col('tipoDoc'),
      documento: col('documento'),
      notaFiscal: col('notaFiscal'),
      parcela: col('parcela'),
      origem: col('origem'),
      projeto: col('projeto'),
      razaoSocial: col('razaoSocial'),
      cnpjCpf: col('cnpjCpf'),
      observacoes: col('observacoes'),
      matched: false,
      matchType: null,
      matchCamada: null,
      matchBancoIdx: null,
    });
  }

  // Filtrar transações de cartão importadas (CARTAO-XXXX-XXX) que não participam da conciliação
  const cartaoPattern = /^CARTAO-\d{4}-\d{3}/;
  const lancamentosFiltrados = lancamentos.filter(l => {
    const doc = (l.documento || '').toUpperCase();
    const nf = (l.notaFiscal || '').toUpperCase();
    return !cartaoPattern.test(doc) && !cartaoPattern.test(nf);
  });

  void (lancamentos.length - lancamentosFiltrados.length); // cartaoCount

  // Validação final
  const comRazao = lancamentosFiltrados.filter(l => l.razaoSocial && l.razaoSocial.length > 3).length;
  const comNF = lancamentosFiltrados.filter(l => l.notaFiscal && l.notaFiscal.length > 0).length;
  console.log(`[Parser Omie] ${lancamentosFiltrados.length} lancamentos: ${comRazao} com Razao Social, ${comNF} com NF`);

  return { lancamentos: lancamentosFiltrados, saldoAnterior };
}

// ============================================================
// PARSER CARTÃO SICREDI (CSV)
// ============================================================
export function parseCartaoFromText(text: string): { transacoes: TransacaoCartao[], info: CartaoInfo } {
  const lines = text.split('\n');

  let vencimento = '';
  let valorTotal = 0;
  let situacao = '';
  let despesasBrasil = 0;
  let despesasExterior = 0;
  let pagamentos = 0;

  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const parts = lines[i].split(';');
    const label = (parts[0] || '').trim();
    const val = (parts[1] || '').trim();

    if (label.includes('Data de Vencimento')) vencimento = val;
    else if (label.includes('Valor Total')) valorTotal = parseValorBRL(val);
    else if (label.includes('Situa')) situacao = val;
    else if (label.includes('Despesas / Debitos no Brasil')) despesasBrasil = parseValorBRL(val);
    else if (label.includes('Despesas / Debitos no exterior')) despesasExterior = parseValorBRL(val);
    else if (label.includes('Pagamentos / Creditos')) pagamentos = parseValorBRL(val);
  }

  const transacoes: TransacaoCartao[] = [];
  let currentTitular = '';
  let currentCartao = '';

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(';');

    if (parts.length >= 3 && parts[0].includes('Cart') && parts[1].includes('XXXX')) {
      currentCartao = parts[1].trim();
      currentTitular = parts[2].trim();
      continue;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test((parts[0] || '').trim())) {
      const dataStr = parts[0].trim();
      const descricao = (parts[1] || '').trim();
      const parcela = (parts[2] || '').trim();
      const valorStr = (parts[3] || '').trim();

      if (dataStr.includes('Data') && descricao.includes('Descri')) continue;

      const valor = parseValorBRL(valorStr);
      const data = parseDate(dataStr);
      if (!data) continue;

      transacoes.push({
        data,
        dataStr,
        descricao,
        parcela,
        valor,
        titular: currentTitular,
        cartao: currentCartao,
        isPagamentoFatura: descricao.includes('Pag Fat Deb Cc'),
        isEstorno: valor < 0 && !descricao.includes('Pag Fat'),
        categoriaSugerida: '',
      });
    }
  }

  return {
    transacoes,
    info: { vencimento, valorTotal, situacao, despesasBrasil, despesasExterior, pagamentos }
  };
}

// ============================================================
// HELPERS
// ============================================================
export function workbookToRows(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function csvToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}
