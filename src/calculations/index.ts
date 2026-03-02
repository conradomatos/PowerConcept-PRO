/**
 * Módulo Central de Cálculos e Fórmulas
 *
 * Reexporta todas as funções de cálculo puro (análogo ao Power Query).
 * Cada arquivo é autocontido com documentação PT-BR e exemplos.
 */

// Custos de pessoal
export * from './custos-pessoal';

// Impostos e tributos
export * from './impostos';

// Orçamento
export * from './custo-mo-orcamento';
export * from './orcamento-summary';

// Apontamento diário
export * from './apontamento';

// Frota
export * from './custos-frota';

// Conciliação bancária
export * from './conciliacao/engine';
export * from './conciliacao/matcher';
export * from './conciliacao/classifier';
export * from './conciliacao/categorias';
export * from './conciliacao/parsers';
export * from './conciliacao/utils';
export * from './conciliacao/types';
export * from './conciliacao/outputs';
