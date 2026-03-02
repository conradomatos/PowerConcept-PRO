import { loadCategoriasStorage } from './categorias';
import type { DRERelatorio, DRESecao, DRELinha, DREAnual } from './types';
import type { DREDadosMes } from '@/hooks/useDREData';
import type { CategoriaContabil } from '@/hooks/useCategorias';

const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Helper to create a DRE line
function criarLinha(
  codigo: string,
  nome: string,
  contaDRE: string,
  sinal: '+' | '-',
  tipo: 'conta' | 'subtotal' | 'total' = 'conta',
  nivel: number = 1,
  categorias?: string[],
  valor: number = 0,
): DRELinha {
  return {
    id: crypto.randomUUID(),
    codigo,
    nome,
    contaDRE,
    sinal,
    tipo,
    nivel,
    valor,
    categorias: tipo === 'conta' ? categorias : undefined,
  };
}

// Get categories mapped to a specific conta DRE
function getCategoriasPorDRE_local(contaDRE: string): string[] {
  const storage = loadCategoriasStorage();
  return storage.categorias
    .filter(c => c.ativa && c.contaDRE === contaDRE)
    .map(c => c.nome);
}

function getCategoriasPorDRE_supabase(contaDRE: string, categorias: CategoriaContabil[]): string[] {
  return categorias
    .filter(c => c.ativa && c.conta_dre === contaDRE)
    .map(c => c.nome);
}

// Build base DRE structure (sections + lines)
function buildSecoes(getCats: (contaDRE: string) => string[]): { secoes: DRESecao[]; resultadoLinha: DRELinha } {
  const linha = (codigo: string, nome: string, contaDRE: string, sinal: '+' | '-', tipo: 'conta' | 'subtotal' | 'total' = 'conta', nivel: number = 1) =>
    criarLinha(codigo, nome, contaDRE, sinal, tipo, nivel, tipo === 'conta' ? getCats(contaDRE) : undefined);

  const resultadoLinha = linha('5', 'RESULTADO LÍQUIDO DO EXERCÍCIO', '', '+', 'total', 0);

  const secoes: DRESecao[] = [
    {
      id: crypto.randomUUID(),
      titulo: 'RECEITA OPERACIONAL',
      linhas: [
        linha('1.1', 'Receita Bruta de Vendas', '(+) - Receita Bruta de Vendas', '+'),
        linha('1.2', 'Deduções de Receita', '(-) - Deduções de Receita', '-'),
      ],
      subtotal: linha('1', 'RECEITA LÍQUIDA', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'CUSTOS',
      linhas: [
        linha('2.1', 'Custo dos Serviços Prestados', '(-) - Custo dos Serviços Prestados', '-'),
        linha('2.2', 'Outros Custos', '(-) - Outros Custos', '-'),
      ],
      subtotal: linha('2', 'LUCRO BRUTO', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'DESPESAS OPERACIONAIS',
      linhas: [
        linha('3.1', 'Despesas com Pessoal', '(-) - Despesas com Pessoal', '-'),
        linha('3.2', 'Despesas Administrativas', '(-) - Despesas Administrativas', '-'),
        linha('3.3', 'Despesas de Vendas e Marketing', '(-) - Despesas de Vendas e Marketing', '-'),
        linha('3.4', 'Despesas Variáveis', '(-) - Despesas Variáveis', '-'),
      ],
      subtotal: linha('3', 'RESULTADO OPERACIONAL (EBITDA)', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'RESULTADO FINANCEIRO',
      linhas: [
        linha('4.1', 'Despesas Financeiras', '(-) - Despesas Financeiras', '-'),
        linha('4.2', 'Outras Receitas', '(+) - Outras Receitas', '+'),
        linha('4.3', 'Recuperação de Despesas Variáveis', '(+) - Recuperação de Despesas Variáveis', '+'),
      ],
      subtotal: linha('4', 'RESULTADO ANTES DOS IMPOSTOS', '', '+', 'subtotal', 0),
    },
    {
      id: crypto.randomUUID(),
      titulo: 'IMPOSTOS E CONTRIBUIÇÕES',
      linhas: [
        linha('5.1', 'Impostos', '(-) - Impostos', '-'),
        linha('5.2', 'Outros Tributos', '(-) - Outros Tributos', '-'),
        linha('5.3', 'Outras Deduções de Receita', '(-) - Outras Deduções de Receita', '-'),
      ],
      subtotal: resultadoLinha,
    },
  ];

  return { secoes, resultadoLinha };
}

// Populate values from dados into DRE sections and calculate subtotals
function popularValores(secoes: DRESecao[], dados: DREDadosMes[], mes: number) {
  // Map of conta_dre -> total for the given month
  const valorMap = new Map<string, number>();
  for (const d of dados) {
    if (d.mes === mes) {
      valorMap.set(d.conta_dre, (valorMap.get(d.conta_dre) || 0) + d.total);
    }
  }

  // Populate line values
  for (const secao of secoes) {
    for (const linha of secao.linhas) {
      if (linha.contaDRE) {
        linha.valor = valorMap.get(linha.contaDRE) || 0;
      }
    }
  }

  // Calculate subtotals cascading
  // Section 0: RECEITA LÍQUIDA = Receita Bruta - Deduções
  let acumulado = 0;
  for (const linha of secoes[0].linhas) {
    acumulado += linha.sinal === '+' ? linha.valor : -linha.valor;
  }
  if (secoes[0].subtotal) secoes[0].subtotal.valor = acumulado;
  void acumulado; // receitaLiquida

  // Section 1: LUCRO BRUTO = RL - Custos
  for (const linha of secoes[1].linhas) {
    acumulado += linha.sinal === '+' ? linha.valor : -linha.valor;
  }
  if (secoes[1].subtotal) secoes[1].subtotal.valor = acumulado;

  // Section 2: EBITDA = Lucro Bruto - Despesas Operacionais
  for (const linha of secoes[2].linhas) {
    acumulado += linha.sinal === '+' ? linha.valor : -linha.valor;
  }
  if (secoes[2].subtotal) secoes[2].subtotal.valor = acumulado;

  // Section 3: RESULTADO ANTES IMPOSTOS
  for (const linha of secoes[3].linhas) {
    acumulado += linha.sinal === '+' ? linha.valor : -linha.valor;
  }
  if (secoes[3].subtotal) secoes[3].subtotal.valor = acumulado;

  // Section 4: RESULTADO LÍQUIDO
  for (const linha of secoes[4].linhas) {
    acumulado += linha.sinal === '+' ? linha.valor : -linha.valor;
  }
  if (secoes[4].subtotal) secoes[4].subtotal.valor = acumulado;
}

// ===== EXISTING FUNCTIONS (fallback, no real data) =====

export function buildDREEstrutura(periodo: string): DRERelatorio {
  const { secoes, resultadoLinha } = buildSecoes(getCategoriasPorDRE_local);
  return {
    periodo,
    dataGeracao: new Date().toISOString(),
    secoes,
    resultado: resultadoLinha,
  };
}

export function buildDREAnual(ano: number): DREAnual {
  const meses = MESES_LABEL.map((m) => buildDREEstrutura(`${m} ${ano}`));
  const acumulado = buildDREEstrutura(`Acumulado ${ano}`);
  return { ano, meses, acumulado };
}

// ===== NEW FUNCTIONS (with real data) =====

export function buildDREComDados(
  periodo: string,
  dadosMes: DREDadosMes[],
  mes: number,
  categorias: CategoriaContabil[],
): DRERelatorio {
  const getCats = (contaDRE: string) => getCategoriasPorDRE_supabase(contaDRE, categorias);
  const { secoes, resultadoLinha } = buildSecoes(getCats);

  popularValores(secoes, dadosMes, mes);

  return {
    periodo,
    dataGeracao: new Date().toISOString(),
    secoes,
    resultado: resultadoLinha,
  };
}

export function buildDREAnualComDados(
  ano: number,
  dados: DREDadosMes[],
  categorias: CategoriaContabil[],
): DREAnual {
  const meses = MESES_LABEL.map((m, i) =>
    buildDREComDados(`${m} ${ano}`, dados, i + 1, categorias)
  );

  // Acumulado: build with all months summed
  const getCats = (contaDRE: string) => getCategoriasPorDRE_supabase(contaDRE, categorias);
  const { secoes, resultadoLinha } = buildSecoes(getCats);

  // Sum all months per conta_dre
  const acumMap = new Map<string, number>();
  for (const d of dados) {
    acumMap.set(d.conta_dre, (acumMap.get(d.conta_dre) || 0) + d.total);
  }

  // Create a synthetic DREDadosMes[] with mes=0 for the accumulator
  const dadosAcum: DREDadosMes[] = [];
  acumMap.forEach((total, conta_dre) => {
    dadosAcum.push({ conta_dre, mes: 0, ano, total });
  });
  popularValores(secoes, dadosAcum, 0);

  const acumulado: DRERelatorio = {
    periodo: `Acumulado ${ano}`,
    dataGeracao: new Date().toISOString(),
    secoes,
    resultado: resultadoLinha,
  };

  return { ano, meses, acumulado };
}

export function getCategoriasOrfas(): string[] {
  const storage = loadCategoriasStorage();
  return storage.categorias
    .filter(c => c.ativa && (!c.contaDRE || c.contaDRE.trim() === ''))
    .map(c => c.nome);
}
