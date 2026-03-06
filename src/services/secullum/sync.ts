/**
 * Servico de sincronizacao com Secullum Ponto Web.
 * Invoca a Edge Function secullum-sync via supabase.functions.invoke().
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  SecullumSyncParams,
  SecullumSyncResult,
  SecullumSyncEtapa,
  SecullumFullSyncResult,
  SyncProgressCallback,
} from './types';

/**
 * Dispara sincronizacao de UMA etapa com o Secullum Ponto Web.
 * @param params Parametros de sync (tipo, etapa, periodo, colaboradores)
 * @returns Resultado da sincronizacao
 */
export async function syncSecullum(params: SecullumSyncParams): Promise<SecullumSyncResult> {
  const { data, error } = await supabase.functions.invoke('secullum-sync', {
    body: params,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || 'Erro ao sincronizar com Secullum',
    };
  }

  return data as SecullumSyncResult;
}

/**
 * Executa sync completo em 3 etapas sequenciais:
 * FUNCIONARIOS → AFASTAMENTOS → CALCULOS
 * (FOTOS omitida por padrao — pode ser adicionada futuramente)
 *
 * @param params Parametros sem etapa (o orquestrador gerencia)
 * @param onProgress Callback de progresso por etapa
 * @returns Resultado agregado de todas as etapas
 */
export async function syncSecullumCompleto(
  params: Omit<SecullumSyncParams, 'etapa'>,
  onProgress?: SyncProgressCallback,
): Promise<SecullumFullSyncResult> {
  const etapas: SecullumSyncEtapa[] = ['FUNCIONARIOS', 'AFASTAMENTOS', 'CALCULOS'];
  const results: Partial<Record<SecullumSyncEtapa, SecullumSyncResult>> = {};

  for (const etapa of etapas) {
    onProgress?.(etapa, 'iniciando');

    const result = await syncSecullum({ ...params, etapa });
    results[etapa] = result;

    if (!result.ok) {
      onProgress?.(etapa, 'erro', result);
      return {
        ok: false,
        etapas: results,
        error: `Falha na etapa ${etapa}: ${result.error}`,
      };
    }

    onProgress?.(etapa, 'concluido', result);
  }

  return {
    ok: true,
    etapas: results,
    message: 'Sincronizacao completa concluida com sucesso',
  };
}
