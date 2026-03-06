import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Projeto = Database['public']['Tables']['projetos']['Row'];
type Empresa = Database['public']['Tables']['empresas']['Row'];

export type ProjetoDetalhe = Projeto & {
  empresas: Pick<Empresa, 'empresa' | 'codigo' | 'unidade'> | null;
};

/**
 * Hook para buscar detalhe de um projeto com join em empresas.
 * Habilitado apenas quando `id` é truthy.
 */
export function useProjetoDetalhe(id: string | undefined) {
  return useQuery({
    queryKey: ['projeto-detalhe', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          *,
          empresas (empresa, codigo, unidade)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as ProjetoDetalhe;
    },
    enabled: !!id,
  });
}
