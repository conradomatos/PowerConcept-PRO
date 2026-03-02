/**
 * Módulo de Cálculo de Custos de Frota
 *
 * Centraliza a lógica de cálculo de custo por quilômetro rodado
 * e custo total de um veículo em um período.
 */

/**
 * Custos de um veículo em um período
 */
export interface CustosFrotaPeriodo {
  combustivel: number;
  manutencao: number;
  deslocamento: number;
  depreciacao: number;
}

/**
 * Resultado do cálculo de custo de frota
 */
export interface CustoFrotaCalculado {
  custo_total: number;
  custo_km: number | null;
}

/**
 * Calcula o custo total e custo/km de um veículo em um período.
 *
 * Fórmulas:
 * - Custo total = combustível + manutenção + deslocamento + depreciação
 * - Custo/km = custo total / km rodado (ou null se km = 0)
 *
 * @param kmRodado - Quilômetros rodados no período
 * @param custos - Objeto com custos por categoria (combustível, manutenção, etc)
 * @returns Objeto com custo total e custo/km
 *
 * @example
 * // Veículo: 1000 km, R$500 combustível, R$100 manutenção, R$50 deslocamento, R$200 depreciação
 * calcularCustoFrota(1000, {
 *   combustivel: 500,
 *   manutencao: 100,
 *   deslocamento: 50,
 *   depreciacao: 200
 * });
 * // Retorna:
 * // {
 * //   custo_total: 850,     // 500 + 100 + 50 + 200
 * //   custo_km: 0.85        // 850 / 1000
 * // }
 */
export function calcularCustoFrota(
  kmRodado: number,
  custos: CustosFrotaPeriodo
): CustoFrotaCalculado {
  const custo_total = custos.combustivel + custos.manutencao + custos.deslocamento + custos.depreciacao;
  const custo_km = kmRodado > 0 ? custo_total / kmRodado : null;

  return {
    custo_total: Math.round(custo_total * 100) / 100,
    custo_km: custo_km ? Math.round(custo_km * 100) / 100 : null,
  };
}
