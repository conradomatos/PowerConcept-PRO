/**
 * Hook central do sistema RBAC.
 * Carrega permissões efetivas do usuário logado via function get_user_effective_permissions.
 * Cacheia no React Query. Expõe métodos utilitários.
 *
 * @example
 * const { can, canAny, canModule, visibleModules } = usePermissions();
 * if (can('projetos.os.editar')) { ... }
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Permission {
  permission_id: string;
  permission_key: string;
  module_code: string;
  resource_code: string | null;
  action_code: string;
  is_granted: boolean;
}

interface VisibleModule {
  module_id: string;
  code: string;
  name: string;
  icon: string | null;
  route: string | null;
  parent_module_id: string | null;
  display_order: number;
}

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['rbac-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_user_effective_permissions', {
        p_user_id: user.id
      });
      if (error) {
        console.error('Erro ao carregar permissões RBAC:', error);
        return [];
      }
      return (data || []) as Permission[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    gcTime: 10 * 60 * 1000,
  });

  const { data: visibleModules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['rbac-visible-modules', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_user_visible_modules', {
        p_user_id: user.id
      });
      if (error) {
        console.error('Erro ao carregar módulos visíveis:', error);
        return [];
      }
      return (data || []) as VisibleModule[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Cache de permission_keys para lookup O(1)
  const permissionSet = new Set(
    permissions.filter(p => p.is_granted).map(p => p.permission_key)
  );

  /**
   * Verifica se o usuário tem uma permissão específica.
   * @param permissionKey - Ex: 'projetos.projeto.editar'
   */
  const can = (permissionKey: string): boolean => {
    return permissionSet.has(permissionKey);
  };

  /**
   * Verifica se o usuário tem ALGUMA das permissões listadas.
   */
  const canAny = (keys: string[]): boolean => {
    return keys.some(key => permissionSet.has(key));
  };

  /**
   * Verifica se o usuário tem TODAS as permissões listadas.
   */
  const canAll = (keys: string[]): boolean => {
    return keys.every(key => permissionSet.has(key));
  };

  /**
   * Verifica se o usuário tem qualquer permissão no módulo.
   * Usado para renderizar/ocultar módulos na navbar.
   */
  const canModule = (moduleCode: string): boolean => {
    return permissions.some(p => p.module_code === moduleCode && p.is_granted);
  };

  /**
   * Verifica se o usuário tem qualquer permissão no recurso.
   */
  const canResource = (moduleCode: string, resourceCode: string): boolean => {
    return permissions.some(
      p => p.module_code === moduleCode && p.resource_code === resourceCode && p.is_granted
    );
  };

  const loading = loadingPermissions || loadingModules;

  return {
    can,
    canAny,
    canAll,
    canModule,
    canResource,
    visibleModules,
    permissions,
    loading,
  };
}
