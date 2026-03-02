// ---- Normalização de CNPJ/CPF ----
export function normalizeCnpjCpf(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

export function formatCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 14) {
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12,14)}`;
  }
  return raw;
}

export function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
  }
  return raw;
}

// ---- Extração de CNPJ/CPF da descrição do banco ----
export function extractCnpjCpf(desc: string): string {
  const cnpjMatch = desc.match(/(\d{14})/);
  if (cnpjMatch) return formatCnpj(cnpjMatch[1]);
  const cpfMatch = desc.match(/(?<!\d)(\d{11})(?!\d)/);
  if (cpfMatch) return formatCpf(cpfMatch[1]);
  return '';
}

// ---- Extração de nome da descrição bancária ----
export function extractNomeBanco(desc: string): string {
  let clean = desc;
  const prefixes = [
    'PAGAMENTO PIX', 'RECEBIMENTO PIX', 'LIQUIDACAO BOLETO', 'TED',
    'PASSAGEM PEDAGIO', 'DEB. FOLHA PAGTO', 'DEB.CTA.FATURA',
    'DEBITO CONVENIOS', 'TRANSF ENTRE CONTAS', 'CESTA DE RELACIONAMENTO',
    'INTEGR.CAPITAL SUBSCRITO', 'LIBERACAO CREDITO', 'TARIFA',
    'PGTO SEFA PR', 'MENSALID TAG', 'CREDITO CONSORCIO'
  ];
  for (const prefix of prefixes) {
    if (clean.toUpperCase().startsWith(prefix)) {
      clean = clean.slice(prefix.length).trim();
      break;
    }
  }
  clean = clean.replace(/\d{14}/g, '').trim();
  clean = clean.replace(/(?<!\d)\d{11}(?!\d)/g, '').trim();
  clean = clean.replace(/^[\s\-\/]+|[\s\-\/]+$/g, '');
  return clean || desc;
}

// ---- Classificação de tipo de lançamento bancário ----
export function classifyBanco(desc: string): string {
  const d = desc.toUpperCase();
  if (d.startsWith('PAGAMENTO PIX')) return 'PIX_ENVIADO';
  if (d.startsWith('RECEBIMENTO PIX')) return 'PIX_RECEBIDO';
  if (d.startsWith('TED')) return 'TED';
  if (d.startsWith('LIQUIDACAO BOLETO')) return 'BOLETO';
  if (d.startsWith('PASSAGEM PEDAGIO')) return 'PEDAGIO';
  if (d.includes('DEB. FOLHA PAGTO') || d.includes('DEB.FOLHA PAGTO')) return 'FOLHA';
  if (d.includes('DEB.CTA.FATURA')) return 'FATURA_CARTAO';
  if (d.includes('DEBITO CONVENIOS') || d.includes('DÉBITO AUTOMÁTICO')) return 'DEBITO_AUTOMATICO';
  if (d.includes('TRANSF ENTRE CONTAS')) return 'TRANSFERENCIA';
  if (d.includes('CESTA')) return 'TARIFA';
  if (d.includes('INTEGR.CAPITAL')) return 'INTEGRALIZACAO';
  if (d.includes('LIBERACAO CREDITO')) return 'CREDITO';
  if (d.includes('PGTO SEFA')) return 'IMPOSTO';
  if (d.includes('MENSALID TAG')) return 'TAG';
  if (d.includes('CREDITO CONSORCIO')) return 'CONSORCIO';
  if (d.includes('TARIFA')) return 'TARIFA';
  return 'OUTROS';
}

// ---- Compatibilidade de nomes ----
export function nomeCompativel(nomeBanco: string, descBanco: string, nomeOmie: string, razaoOmie: string, observacoesOmie?: string): boolean {
  const nomeB = (nomeBanco || '').toUpperCase().trim();
  const descB = (descBanco || '').toUpperCase().trim();
  const nomeO = (nomeOmie || '').toUpperCase().trim();
  const razaoO = (razaoOmie || '').toUpperCase().trim();
  // Limpar observações: remover prefixos PIX e números de CPF/CNPJ
  const obsO = (observacoesOmie || '').toUpperCase().replace(/PAGAMENTO\s+PIX\w*/g, '').replace(/\d{11,14}/g, '').trim();

  if (!nomeB && !descB) return false;

  const stopWords = ['LTDA', 'S.A.', 'S/A', 'EIRELI', 'EPP', 'ME', 'LTDA.', 'S.A', 'DO', 'DE', 'DA', 'DOS', 'DAS', 'E', 'PAGAMENTO', 'PIXDEB', 'PIXPIXDEB', 'PIXCRED'];

  for (const n_o of [nomeO, razaoO, obsO]) {
    if (!n_o || n_o.length < 3) continue;
    const wordsO = n_o.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
    const wordsB = [...nomeB.split(/\s+/).filter(w => w.length > 2), ...descB.split(/\s+/).filter(w => w.length > 2)];

    if (!wordsO.length) continue;

    const matchCount = wordsO.filter(w => wordsB.some(wb => w.includes(wb) || wb.includes(w))).length;
    if (matchCount >= Math.min(2, wordsO.length)) return true;

    if (wordsO.length && wordsO[0] && descB.includes(wordsO[0])) return true;
  }
  return false;
}

export function nomeCompativelCartao(descCartao: string, nomeOmie: string, razaoOmie: string): boolean {
  const descC = descCartao.toUpperCase().replace(/\s+/g, ' ').trim();
  const nomeO = (nomeOmie || '').toUpperCase().trim();
  const razaoO = (razaoOmie || '').toUpperCase().trim();

  const stopWords = ['LTDA', 'S.A.', 'EIRELI', 'EPP', 'ME', 'DO', 'DE', 'DA', 'DOS', 'DAS', 'E'];

  for (const n_o of [nomeO, razaoO]) {
    if (!n_o) continue;
    const wordsO = n_o.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
    const wordsC = descC.split(/\s+/).filter(w => w.length > 2);
    if (!wordsO.length || !wordsC.length) continue;
    const matchCount = wordsO.filter(w => wordsC.some(wc => w.includes(wc) || wc.includes(w))).length;
    if (matchCount >= 1) return true;
  }
  return false;
}

// ---- Formatação BRL ----
export function formatBRL(valor: number | null | undefined): string {
  if (valor == null) return 'N/A';
  const neg = valor < 0;
  const abs = Math.abs(valor);
  const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return neg ? `-R$ ${formatted}` : `R$ ${formatted}`;
}

// ---- Diferença em dias entre duas datas ----
export function daysDiff(d1: Date, d2: Date): number {
  const ms = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ---- Parsear data ----
export function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  // Excel serial date (days since 1/1/1900)
  if (typeof val === 'number') {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (val - 2) * 86400000);
    if (!isNaN(date.getTime())) return date;
  }

  const str = String(val).trim();

  // dd/mm/yyyy
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));

  // yyyy-mm-dd or ISO
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ---- Parsear valor BRL "R$ 1.234,56" → number ----
export function parseValorBRL(val: string): number {
  if (!val) return 0;
  let clean = val.replace(/"/g, '').replace('R$', '').trim();
  clean = clean.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
