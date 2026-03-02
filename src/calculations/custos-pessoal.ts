/**
 * Módulo de Cálculo de Custos de Pessoal
 *
 * Centraliza toda a lógica de cálculo de custos de colaboradores (CLT e PJ).
 * Análogo ao módulo de Power Query de um modelo Power BI/Excel.
 *
 * Fórmulas principais:
 * - CLT: custo_mensal = salário_base + (salário × 30% se periculosidade) + benefícios
 * - PJ: custo_mensal = salário_base (sem encargos)
 * - Custo/hora = custo_mensal / 220h
 */

/** Constante: horas de trabalho padrão por mês (220h) */
export const HORAS_MENSAIS_PADRAO = 220;

/** Constante: percentual de adicional de periculosidade para CLT (30%) */
export const PERC_PERICULOSIDADE = 0.30;

/** Tipo de classificação de colaborador */
export type Classificacao = 'CLT' | 'PJ';

/** Dados de custo de um colaborador (origem: tabelas de RH) */
export interface CustoColaborador {
  id: string;
  colaborador_id: string;
  salario_base: number;
  periculosidade: boolean;
  beneficios: number;
  classificacao: Classificacao;
  inicio_vigencia: string;
  fim_vigencia: string | null;
  motivo_alteracao: string;
  observacao: string;
  created_at: string;
  updated_at: string;
}

/** Resultado do cálculo de custos (valores arredondados a 2 casas) */
export interface CustoCalculado {
  beneficios: number;
  adicional_periculosidade: number;
  custo_mensal_total: number;
  custo_hora: number;
}

/**
 * Calcula o custo mensal e custo/hora de um colaborador.
 *
 * Lógica:
 * - Se PJ: retorna apenas salário_base (sem periculosidade ou benefícios)
 * - Se CLT: salário + (salário × 30% se periculoso) + benefícios, depois divide por 220h
 *
 * @param custo - Dados do colaborador (pode ser parcial)
 * @returns Objeto com benefícios, adicional_periculosidade, custo_mensal_total e custo_hora
 *
 * @example
 * // CLT: salário R$5.000 + periculoso (30%) + R$500 benefícios
 * calcularCustos({
 *   salario_base: 5000,
 *   periculosidade: true,
 *   beneficios: 500,
 *   classificacao: 'CLT'
 * });
 * // Retorna:
 * // {
 * //   beneficios: 500,
 * //   adicional_periculosidade: 1500,    // 5000 × 0.30
 * //   custo_mensal_total: 7000,          // 5000 + 1500 + 500
 * //   custo_hora: 31.82                  // 7000 / 220
 * // }
 */
export function calcularCustos(custo: Partial<CustoColaborador>): CustoCalculado {
  const salarioBase = Number(custo.salario_base) || 0;
  const beneficios = Number(custo.beneficios) || 0;
  const periculosidade = custo.periculosidade || false;
  const classificacao = custo.classificacao || 'CLT';

  // PJ: apenas salário base, sem periculosidade ou benefícios
  if (classificacao === 'PJ') {
    return {
      beneficios: 0,
      adicional_periculosidade: 0,
      custo_mensal_total: Math.round(salarioBase * 100) / 100,
      custo_hora: Math.round((salarioBase / HORAS_MENSAIS_PADRAO) * 100) / 100,
    };
  }

  // CLT: cálculo completo
  const adicional_periculosidade = periculosidade ? salarioBase * PERC_PERICULOSIDADE : 0;
  const custo_mensal_total = salarioBase + adicional_periculosidade + beneficios;
  const custo_hora = custo_mensal_total / HORAS_MENSAIS_PADRAO;

  return {
    beneficios: Math.round(beneficios * 100) / 100,
    adicional_periculosidade: Math.round(adicional_periculosidade * 100) / 100,
    custo_mensal_total: Math.round(custo_mensal_total * 100) / 100,
    custo_hora: Math.round(custo_hora * 100) / 100,
  };
}

/**
 * Verifica se um registro de custo está vigente hoje.
 * @param custo - Registro de custo a verificar
 * @returns true se a vigência inclui hoje
 */
export function isVigente(custo: CustoColaborador): boolean {
  const today = new Date().toISOString().split('T')[0];
  // Vigente if: fim_vigencia is null (open) OR today is between inicio and fim
  if (!custo.fim_vigencia) {
    return custo.inicio_vigencia <= today;
  }
  return custo.inicio_vigencia <= today && custo.fim_vigencia >= today;
}

/**
 * Verifica se um registro de custo está encerrado.
 * @param custo - Registro de custo a verificar
 * @returns true se fim_vigencia foi ultrapassado
 */
export function isEncerrado(custo: CustoColaborador): boolean {
  if (!custo.fim_vigencia) return false;
  const today = new Date().toISOString().split('T')[0];
  return custo.fim_vigencia < today;
}

/**
 * Formata uma string de moeda BRL para número
 * Aceita formatos como "R$ 1.234,56", "1.234,56", "1234.56", "1234,56"
 * @param value - String de moeda a converter
 * @returns Número parseado
 */
export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  // Remove currency symbol, dots (thousands) and replace comma with dot
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Formata um número como moeda BRL para exibição (20.000,00)
 * Sem símbolo R$
 * @param value - Valor a formatar
 * @returns String formatada
 */
export function formatCurrencyInput(value: string): string {
  // Remove non-numeric chars except comma and dot
  const cleaned = value.replace(/[^\d]/g, '');

  if (!cleaned) return '';

  // Convert to number with 2 decimal places
  const num = parseInt(cleaned, 10) / 100;

  // Format as BRL without symbol
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata uma data para o padrão brasileiro
 * @param dateString - Data em formato ISO (YYYY-MM-DD)
 * @returns Data formatada ou "Em aberto"
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Em aberto';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
