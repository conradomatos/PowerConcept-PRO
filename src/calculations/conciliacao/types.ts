export interface LancamentoBanco {
  idx: number;
  data: Date;
  dataStr: string;
  descricao: string;
  documento: string;
  valor: number;
  saldo: number | null;
  cnpjCpf: string;
  nome: string;
  tipo: string;
  matched: boolean;
  matchType: string | null;
  matchCamada: string | null;
  matchOmieIdx: number | null;
}

export interface LancamentoOmie {
  idx: number;
  situacao: string;
  data: Date;
  dataStr: string;
  clienteFornecedor: string;
  contaCorrente: string;
  categoria: string;
  valor: number;
  tipoDoc: string;
  documento: string;
  notaFiscal: string;
  parcela: string;
  origem: string;
  projeto: string;
  razaoSocial: string;
  cnpjCpf: string;
  observacoes: string;
  matched: boolean;
  matchType: string | null;
  matchCamada: string | null;
  matchBancoIdx: number | null;
}

export interface TransacaoCartao {
  data: Date;
  dataStr: string;
  descricao: string;
  parcela: string;
  valor: number;
  titular: string;
  cartao: string;
  isPagamentoFatura: boolean;
  isEstorno: boolean;
  categoriaSugerida: string;
}

export interface CartaoInfo {
  vencimento: string;
  valorTotal: number;
  situacao: string;
  despesasBrasil: number;
  despesasExterior: number;
  pagamentos: number;
}

export interface Match {
  camada: string;
  tipo: string;
  banco: LancamentoBanco;
  omie: LancamentoOmie;
}

export interface Divergencia {
  tipo: string;
  tipoNome: string;
  fonte: string;
  data: string;
  valor: number;
  descricao?: string;
  cnpjCpf?: string;
  nome?: string;
  situacao?: string;
  origem?: string;
  acao?: string;
  valorBanco?: number;
  valorOmie?: number;
  diferenca?: number;
  dataBanco?: string;
  dataOmie?: string;
  diasDiferenca?: number;
  titular?: string;
  fornecedorOmie?: string;
  tipoDoc?: string;
  nf?: string;
  categoriaSugerida?: string;
  parcela?: string;
  obs?: string;
  banco?: LancamentoBanco | null;
  omie?: LancamentoOmie | null;
  confianca?: 'alta' | 'media' | 'baixa';
}

export interface ResultadoConciliacao {
  matches: Match[];
  divergencias: Divergencia[];
  banco: LancamentoBanco[];
  omieSicredi: LancamentoOmie[];
  cartaoTransacoes: TransacaoCartao[];
  cartaoInfo: CartaoInfo;
  saldoBanco: number | null;
  saldoOmie: number | null;
  camadaCounts: Record<string, number>;
  divCounts: Record<string, number>;
  totalConciliados: number;
  totalDivergencias: number;
  contasAtraso: number;
  cartaoImportaveis: number;
  mesLabel: string;
  anoLabel: string;
  contaCorrenteSelecionada?: string;
  contasExcluidas?: { nome: string; count: number; entradas: LancamentoOmie[] }[];
  totalOmieOriginal?: number;
  totalOmieFiltrado?: number;
  lancamentosZerados?: { banco: number; omie: number; total: number };
  lancamentosFuturos?: { quantidade: number; total: number; ultimaDataBanco: string };
}

// ===== DRE =====

export type DREContaSinal = '+' | '-';

export interface DRELinha {
  id: string;
  codigo: string;
  nome: string;
  contaDRE: string;
  sinal: DREContaSinal;
  tipo: 'conta' | 'subtotal' | 'total';
  nivel: number;
  valor: number;
  categorias?: string[];
}

export interface DRESecao {
  id: string;
  titulo: string;
  linhas: DRELinha[];
  subtotal?: DRELinha;
}

export interface DRERelatorio {
  periodo: string;
  dataGeracao: string;
  secoes: DRESecao[];
  resultado: DRELinha;
}

export interface DREAnual {
  ano: number;
  meses: DRERelatorio[];      // [0]=Jan ... [11]=Dez
  acumulado: DRERelatorio;    // Soma
}

// ===== CATEGORIAS CONTÁBEIS =====

export interface CategoriaGrupo {
  id: string;
  nome: string;
  tipo: 'Receita' | 'Despesa';
  ordem: number;
  ativa: boolean;
}

export interface CategoriaItem {
  id: string;
  grupoId: string;
  nome: string;
  tipo: 'Receita' | 'Despesa';
  contaDRE: string;
  tipoGasto: string;
  keywords: string[];
  observacoes: string;
  ativa: boolean;
  ordem: number;
}

export interface CategoriasStorage {
  version: number;
  grupos: CategoriaGrupo[];
  categorias: CategoriaItem[];
  categoriaPadrao: string;
  contaCorrente: string;
}

export const CONTAS_DRE = [
  '(+) - Receita Bruta de Vendas',
  '(+) - Outras Receitas',
  '(+) - Recuperação de Despesas Variáveis',
  '(-) - Deduções de Receita',
  '(-) - Outras Deduções de Receita',
  '(-) - Custo dos Serviços Prestados',
  '(-) - Outros Custos',
  '(-) - Despesas Variáveis',
  '(-) - Despesas com Pessoal',
  '(-) - Despesas Administrativas',
  '(-) - Despesas de Vendas e Marketing',
  '(-) - Despesas Financeiras',
  '(-) - Impostos',
  '(-) - Outros Tributos',
  '(-) - Ativos',
] as const;
