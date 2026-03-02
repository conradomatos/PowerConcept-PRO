/**
 * Constantes de Alíquotas Tributárias Padrão
 *
 * Define as alíquotas padrão de impostos federais e estaduais
 * para cálculo automático de DRE.
 */

import type { AliquotasTributarias } from '@/calculations/impostos';

/**
 * Alíquotas padrão conforme legislação brasileira atual.
 * Valores em decimais: 0.03 = 3%
 */
export const ALIQUOTAS_PADRAO: AliquotasTributarias = {
  iss: 0.03,       // ISS (Imposto sobre Serviços) - estadual, típico 3%
  pis: 0.0065,     // PIS (Programa de Integração Social) - 0,65%
  cofins: 0.03,    // COFINS (Contribuição para Financiamento da Seguridade Social) - 3%
  irpj: 0.048,     // IRPJ (Imposto de Renda Pessoa Jurídica) - 4,8% (15% + 10% adição)
  csll: 0.0288,    // CSLL (Contribuição Social sobre o Lucro Líquido) - 2,88% (9% + superlucro)
};
