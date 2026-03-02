/**
 * Módulo de Cálculo de Resumo de Orçamento
 *
 * Centraliza a lógica de cálculo de totais, markup, impostos e margem
 * para gerar o preço final de venda de um orçamento.
 */

/**
 * Dados de uma regra de imposto
 */
export interface TaxRule {
  id: string;
  tipo: 'PERCENT' | 'FIXED';
  valor: number;
  base: 'SALE' | 'COST';
  aplica_em: 'MATERIALS' | 'SERVICES' | 'ALL';
  ativo: boolean;
}

/**
 * Resultado do cálculo de summary
 */
export interface SummaryCalculado {
  subtotal_custo: number;
  markup_pct_aplicado: number;
  valor_markup: number;
  total_impostos: number;
  preco_venda: number;
  margem_rs: number;
  margem_pct: number;
}

/**
 * Calcula o resumo completo de um orçamento: subtotal, markup, impostos e margem.
 *
 * Fluxo:
 * 1. Subtotal = soma de todos os custos (materiais, MO, equipamentos, etc)
 * 2. Markup = subtotal × markup_pct%
 * 3. Venda Bruta = subtotal + markup
 * 4. Impostos = aplicados conforme regras (% sobre SALE/COST, valor FIXED)
 * 5. Preço Venda = venda_bruta + impostos
 * 6. Margem = preço_venda - subtotal - impostos
 *
 * @param totaisPorCategoria - Somas de cada categoria (materiais, MO, equipamentos, etc)
 * @param markupPct - Percentual de markup a aplicar
 * @param taxRules - Array de regras de imposto ativas
 * @returns Objeto com todos os valores calculados
 *
 * @example
 * calcularSummaryOrcamento(
 *   {
 *     materiais: 10000,
 *     mo: 5000,
 *     equipamentos: 2000,
 *     mobilizacao: 1000,
 *     canteiro: 500,
 *     engenharia: 1500,
 *     hhMateriais: 100,
 *   },
 *   20,  // 20% markup
 *   [{ tipo: 'PERCENT', valor: 3, base: 'SALE', aplica_em: 'MATERIALS', ativo: true }]
 * );
 * // Retorna:
 * // {
 * //   subtotal_custo: 20000,
 * //   markup_pct_aplicado: 20,
 * //   valor_markup: 4000,
 * //   total_impostos: 300,      // 10000 (materiais) × 3%
 * //   preco_venda: 24300,
 * //   margem_rs: 4000,
 * //   margem_pct: 16.46
 * // }
 */
export function calcularSummaryOrcamento(
  totaisPorCategoria: {
    materiais: number;
    mo: number;
    equipamentos: number;
    mobilizacao: number;
    canteiro: number;
    engenharia: number;
    hhMateriais?: number;
  },
  markupPct: number,
  taxRules: TaxRule[]
): SummaryCalculado {
  const {
    materiais,
    mo,
    equipamentos,
    mobilizacao,
    canteiro,
    engenharia,
  } = totaisPorCategoria;

  // 1. Calcula subtotal
  const subtotal_custo = materiais + mo + mobilizacao + canteiro + equipamentos + engenharia;

  // 2. Aplica markup
  const valor_markup = subtotal_custo * (markupPct / 100);
  const venda_bruta = subtotal_custo + valor_markup;

  // 3. Calcula impostos aplicados
  let total_impostos = 0;

  for (const rule of taxRules) {
    if (!rule.ativo) continue;

    // Define base de cálculo (SALE = venda_bruta, COST = subtotal)
    const base = rule.base === 'SALE' ? venda_bruta : subtotal_custo;

    // Define quantidade taxável conforme escopo
    let taxableAmount = base;
    if (rule.aplica_em === 'MATERIALS') {
      taxableAmount = materiais;
    } else if (rule.aplica_em === 'SERVICES') {
      taxableAmount = mo + engenharia;
    }

    // Calcula imposto
    if (rule.tipo === 'PERCENT') {
      total_impostos += taxableAmount * (rule.valor / 100);
    } else {
      // FIXED
      total_impostos += rule.valor;
    }
  }

  // 4. Calcula preço final e margem
  const preco_venda = venda_bruta + total_impostos;
  const margem_rs = preco_venda - subtotal_custo - total_impostos;
  const margem_pct = preco_venda > 0 ? (margem_rs / preco_venda) * 100 : 0;

  return {
    subtotal_custo,
    markup_pct_aplicado: markupPct,
    valor_markup,
    total_impostos,
    preco_venda,
    margem_rs,
    margem_pct,
  };
}
