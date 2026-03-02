/**
 * Módulo de Cálculo de Apontamento Diário
 *
 * Centraliza a lógica de cálculo de custo de apontamento com
 * multiplicadores de tipo de hora (normal, extra 50%, extra 100%, etc).
 */

/**
 * Tipos de hora com seus multiplicadores de custo
 */
export type TipoHoraExt = 'NORMAL' | 'EXTRA50' | 'EXTRA100' | 'DESLOCAMENTO' | 'TREINAMENTO' | 'ADM';

/**
 * Mapa de multiplicadores de custo por tipo de hora
 *
 * - NORMAL: 1.0× custo/hora
 * - EXTRA50: 1.5× custo/hora (adicional 50%)
 * - EXTRA100: 2.0× custo/hora (adicional 100% ou 200% total)
 * - DESLOCAMENTO: 1.0× custo/hora
 * - TREINAMENTO: 1.0× custo/hora
 * - ADM: 1.0× custo/hora (administrativo)
 */
export const TIPO_HORA_FACTOR: Record<TipoHoraExt, number> = {
  NORMAL: 1.0,
  EXTRA50: 1.5,
  EXTRA100: 2.0,
  DESLOCAMENTO: 1.0,
  TREINAMENTO: 1.0,
  ADM: 1.0,
};

/**
 * Rótulos legíveis de tipos de hora
 */
export const TIPO_HORA_LABELS: Record<TipoHoraExt, string> = {
  NORMAL: 'Normal',
  EXTRA50: 'Extra 50%',
  EXTRA100: 'Extra 100%',
  DESLOCAMENTO: 'Deslocamento',
  TREINAMENTO: 'Treinamento',
  ADM: 'Administrativo',
};

/**
 * Resultado do cálculo de custo de apontamento
 */
export interface CustoApontamentoCalculado {
  custo_total: number;
  custo_hora_aplicado: number;
}

/**
 * Calcula o custo total de um apontamento com base em horas, tipo e custo/hora.
 *
 * Fórmula:
 * - Custo aplicado = Custo/hora × Fator do tipo
 * - Custo total = Horas × Custo aplicado
 *
 * @param horas - Quantidade de horas apontadas
 * @param custoHora - Custo/hora base do colaborador (após encargos)
 * @param tipoHora - Tipo de hora (NORMAL, EXTRA50, etc)
 * @returns Objeto com custo total e custo/hora após multiplicador
 *
 * @example
 * // Apontamento de 8h extra 50% com custo/hora R$40
 * calcularCustoApontamento(8, 40, 'EXTRA50');
 * // Retorna:
 * // {
 * //   custo_hora_aplicado: 60,    // 40 × 1.5
 * //   custo_total: 480            // 8 × 60
 * // }
 */
export function calcularCustoApontamento(
  horas: number,
  custoHora: number,
  tipoHora: TipoHoraExt
): CustoApontamentoCalculado {
  const fator = TIPO_HORA_FACTOR[tipoHora] || 1.0;
  const custoHoraAplicado = custoHora * fator;
  const custoTotal = horas * custoHoraAplicado;

  return {
    custo_hora_aplicado: Math.round(custoHoraAplicado * 100) / 100,
    custo_total: Math.round(custoTotal * 100) / 100,
  };
}
