/**
 * Módulo de Cálculo de Custo de Mão de Obra para Orçamentos
 *
 * Centraliza a lógica de cálculo de custo/hora com encargos e horas extras.
 * Usado no contexto de orçamento de projetos (revisões, alocações, etc).
 */

/**
 * Parâmetros de cálculo de MO (encargos, horas extras)
 */
export interface ParametrosMO {
  encargos_pct: number;      // % de encargos (ex: 80 = 80%)
  he50_pct: number;          // % adição para HE 50% (ex: 50 = 50%)
  he100_pct: number;         // % adição para HE 100% (ex: 100 = 100%)
}

/**
 * Dados de um papel de trabalho (role/função)
 */
export interface DadosRole {
  id: string;
  salario_base: number;
  carga_horaria_mensal: number;
  ativo: boolean;
}

/**
 * Resultado do cálculo de custos por tipo de hora
 */
export interface CustoMOCalculado {
  labor_role_id: string;
  custo_hora_normal: number;
  custo_hora_he50: number;
  custo_hora_he100: number;
  memoria: {
    salario_base: number;
    encargos_pct: number;
    salario_com_encargos: number;
    carga_horaria: number;
    he50_pct: number;
    he100_pct: number;
  };
}

/**
 * Calcula o custo/hora normal e com horas extras para uma função.
 *
 * Fórmulas:
 * - Salário com encargos = Salário base × (1 + encargos%)
 * - Custo hora normal = Salário com encargos / Carga horária mensal
 * - Custo hora HE 50% = Custo hora normal × (1 + 50%)
 * - Custo hora HE 100% = Custo hora normal × (1 + 100%)
 *
 * @param role - Dados do papel (salário, carga horária)
 * @param parametros - Percentuais de encargos e horas extras
 * @returns Objeto com custos calculados para cada tipo de hora
 *
 * @example
 * // Encarregado: R$5.000, 220h/mês, 80% encargos, 50% HE50, 100% HE100
 * calcularCustoMO(
 *   { id: 'enc1', salario_base: 5000, carga_horaria_mensal: 220, ativo: true },
 *   { encargos_pct: 80, he50_pct: 50, he100_pct: 100 }
 * );
 * // Retorna:
 * // {
 * //   labor_role_id: 'enc1',
 * //   custo_hora_normal: 40.91,        // (5000 × 1.80) / 220
 * //   custo_hora_he50: 61.36,          // 40.91 × 1.50
 * //   custo_hora_he100: 81.82,         // 40.91 × 2.00
 * //   memoria: { ... }  // Para auditoria
 * // }
 */
export function calcularCustoMO(
  role: DadosRole,
  parametros: ParametrosMO
): CustoMOCalculado {
  // Calcula salário com encargos
  const salarioComEncargos = role.salario_base * (1 + parametros.encargos_pct / 100);

  // Custo hora normal
  const custoHoraNormal = salarioComEncargos / role.carga_horaria_mensal;

  // Custos com horas extras
  const custoHoraHe50 = custoHoraNormal * (1 + parametros.he50_pct / 100);
  const custoHoraHe100 = custoHoraNormal * (1 + parametros.he100_pct / 100);

  // Objeto de memória para auditoria
  const memoria = {
    salario_base: role.salario_base,
    encargos_pct: parametros.encargos_pct,
    salario_com_encargos: salarioComEncargos,
    carga_horaria: role.carga_horaria_mensal,
    he50_pct: parametros.he50_pct,
    he100_pct: parametros.he100_pct,
  };

  return {
    labor_role_id: role.id,
    custo_hora_normal: Math.round(custoHoraNormal * 100) / 100,
    custo_hora_he50: Math.round(custoHoraHe50 * 100) / 100,
    custo_hora_he100: Math.round(custoHoraHe100 * 100) / 100,
    memoria,
  };
}
