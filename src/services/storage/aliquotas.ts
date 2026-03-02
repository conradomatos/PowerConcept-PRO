/**
 * Serviço de Persistência de Alíquotas no localStorage
 *
 * Fornece funções para salvar e carregar alíquotas customizadas
 * no armazenamento local do navegador.
 */

import type { AliquotasTributarias } from '@/calculations/impostos';
import { ALIQUOTAS_PADRAO } from '@/rules/aliquotas';

const STORAGE_KEY = 'powerconcept_aliquotas';

/**
 * Recupera as alíquotas salvas no localStorage.
 * Se nada estiver salvo, retorna as alíquotas padrão.
 *
 * @returns Objeto com as alíquotas tributárias
 */
export function getAliquotas(): AliquotasTributarias {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error('Erro ao carregar alíquotas do localStorage:', error);
  }
  return ALIQUOTAS_PADRAO;
}

/**
 * Salva as alíquotas customizadas no localStorage.
 *
 * @param aliquotas - Objeto com as novas alíquotas a salvar
 */
export function saveAliquotas(aliquotas: AliquotasTributarias): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aliquotas));
  } catch (error) {
    console.error('Erro ao salvar alíquotas no localStorage:', error);
  }
}
