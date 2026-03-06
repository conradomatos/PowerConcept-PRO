import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { syncSecullumCompleto } from '@/services/secullum/sync';
import type { SecullumSyncParams, SecullumSyncLog, SecullumSyncEtapa } from '@/services/secullum/types';

/** Labels das etapas para exibicao */
const ETAPA_LABELS: Record<SecullumSyncEtapa, string> = {
  FUNCIONARIOS: 'Funcionários',
  FOTOS: 'Fotos',
  AFASTAMENTOS: 'Afastamentos',
  CALCULOS: 'Cálculos',
};

/**
 * Hook para sincronizacao com Secullum Ponto Web.
 * Orquestra 3 etapas sequenciais com progresso por etapa.
 */
export function useSecullumSync() {
  const queryClient = useQueryClient();
  const [etapaAtual, setEtapaAtual] = useState<SecullumSyncEtapa | null>(null);
  const [etapasConcluidas, setEtapasConcluidas] = useState<SecullumSyncEtapa[]>([]);

  /** Dispara sincronizacao completa (3 etapas) */
  const syncMutation = useMutation({
    mutationFn: async (params: Omit<SecullumSyncParams, 'etapa'>) => {
      setEtapasConcluidas([]);
      setEtapaAtual(null);

      const result = await syncSecullumCompleto(params, (etapa, status, stepResult) => {
        if (status === 'iniciando') {
          setEtapaAtual(etapa);
          toast.info(`Sincronizando ${ETAPA_LABELS[etapa]}...`);
        } else if (status === 'concluido') {
          setEtapasConcluidas(prev => [...prev, etapa]);
        } else if (status === 'erro') {
          toast.error(`Erro em ${ETAPA_LABELS[etapa]}: ${stepResult?.error}`);
        }
      });

      if (!result.ok) {
        throw new Error(result.error || 'Erro na sincronização');
      }
      return result;
    },
    onSuccess: () => {
      setEtapaAtual(null);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['secullum-calculos'] });
      queryClient.invalidateQueries({ queryKey: ['secullum-afastamentos'] });
      queryClient.invalidateQueries({ queryKey: ['apontamento-dia'] });
      queryClient.invalidateQueries({ queryKey: ['apontamentos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['secullum-sync-log'] });
      toast.success('Sincronização completa concluída com sucesso');
    },
    onError: (error: Error) => {
      setEtapaAtual(null);
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  /** Historico de logs de sync */
  const { data: syncLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['secullum-sync-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secullum_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SecullumSyncLog[];
    },
  });

  const lastSync = syncLogs.length > 0 ? syncLogs[0] : null;

  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    etapaAtual,
    etapasConcluidas,
    syncResult: syncMutation.data,
    syncError: syncMutation.error,
    syncLogs,
    lastSync,
    isLoadingLogs,
  };
}
