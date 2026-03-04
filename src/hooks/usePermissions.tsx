/**
 * Hook central do sistema RBAC.
 * Carrega permissões efetivas do usuário logado via function get_user_effective_permissions.
 * Cacheia no React Query. Expõe métodos utilitários.
 *
 * @example
 * const { can, canAny, canModule, visibleModules } = usePermissions();
 * if (can('projetos.os.editar')) { ... }
 */

import { useMemo, useCallback } from 'react';
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
  const { user, isGodMode: checkGodMode } = useAuth();

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
  const permissionSet = useMemo(
    () => new Set(permissions.filter(p => p.is_granted).map(p => p.permission_key)),
    [permissions]
  );

  const can = useCallback(
    (permissionKey: string): boolean => permissionSet.has(permissionKey),
    [permissionSet]
  );

  const canAny = useCallback(
    (keys: string[]): boolean => keys.some(key => permissionSet.has(key)),
    [permissionSet]
  );

  const canAll = useCallback(
    (keys: string[]): boolean => keys.every(key => permissionSet.has(key)),
    [permissionSet]
  );

  const canModule = useCallback(
    (moduleCode: string): boolean =>
      permissions.some(p => p.module_code === moduleCode && p.is_granted),
    [permissions]
  );

  const canResource = useCallback(
    (moduleCode: string, resourceCode: string): boolean =>
      permissions.some(
        p => p.module_code === moduleCode && p.resource_code === resourceCode && p.is_granted
      ),
    [permissions]
  );

  const loading = loadingPermissions || loadingModules;

  const isGodModeValue = useMemo(() => checkGodMode(), [checkGodMode]);

  return {
    can,
    canAny,
    canAll,
    canModule,
    canResource,
    visibleModules,
    permissions,
    loading,
    isGodMode: isGodModeValue,
  };
}
