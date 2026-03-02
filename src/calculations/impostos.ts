/**
 * Módulo de Cálculo de Impostos e Tributos
 *
 * Centraliza a lógica de cálculo de alíquotas e impostos sobre receita bruta.
 * Inclui: ISS, PIS, COFINS, IRPJ, CSLL.
 */

/**
 * Interface com as alíquotas tributárias aplicáveis
 */
export interface AliquotasTributarias {
  iss: number;
  pis: number;
  cofins: number;
  irpj: number;
  csll: number;
}

/**
 * Resultado do cálculo de impostos sobre receita bruta
 */
export interface ImpostosCalculados {
  iss: number;
  pis: number;
  cofins: number;
  deducoes: number;
  irpj: number;
  csll: number;
  impostosLucro: number;
}

/**
 * Calcula impostos (federais e estaduais) sobre receita bruta.
 *
 * Fórmulas:
 * - Deduções = Receita × (ISS + PIS + COFINS)
 * - Impostos sobre Lucro = Receita × (IRPJ + CSLL)
 *
 * @param receitaBruta - Receita bruta no período (antes de deduções)
 * @param aliquotas - Objeto com alíquotas percentuais (0.03 = 3%)
 * @returns Objeto com cada imposto calculado individualmente e totalizadores
 *
 * @example
 * // Receita de R$100.000 com alíquotas padrão
 * calcularImpostosDRE(100000, {
 *   iss: 0.03,      // ISS 3%
 *   pis: 0.0065,    // PIS 0,65%
 *   cofins: 0.03,   // COFINS 3%
 *   irpj: 0.048,    // IRPJ 4,8%
 *   csll: 0.0288    // CSLL 2,88%
 * });
 * // Retorna:
 * // {
 * //   iss: 3000,
 * //   pis: 650,
 * //   cofins: 3000,
 * //   deducoes: 6650,      // 3000 + 650 + 3000
 * //   irpj: 4800,
 * //   csll: 2880,
 * //   impostosLucro: 7680  // 4800 + 2880
 * // }
 */
export function calcularImpostosDRE(
  receitaBruta: number,
  aliquotas: AliquotasTributarias
): ImpostosCalculados {
  return {
    iss: receitaBruta * aliquotas.iss,
    pis: receitaBruta * aliquotas.pis,
    cofins: receitaBruta * aliquotas.cofins,
    deducoes: receitaBruta * (aliquotas.iss + aliquotas.pis + aliquotas.cofins),
    irpj: receitaBruta * aliquotas.irpj,
    csll: receitaBruta * aliquotas.csll,
    impostosLucro: receitaBruta * (aliquotas.irpj + aliquotas.csll),
  };
}
