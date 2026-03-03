/**
 * Hook para administração do sistema RBAC.
 * Gerencia perfis (roles), permissões, e atribuição de usuários.
 * Todas as operações de escrita invalidam queries relacionadas.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TIPOS
// ============================================

export interface RbacRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  cloned_from: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export interface SystemModule {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  display_order: number;
}

export interface SystemResource {
  id: string;
  module_id: string;
  code: string;
  name: string;
  display_order: number;
}

export interface SystemAction {
  id: string;
  code: string;
  name: string;
  display_order: number;
}

export interface SystemPermission {
  id: string;
  module_id: string;
  resource_id: string | null;
  action_id: string;
  permission_key: string;
  is_active: boolean;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted: boolean;
}

export interface RbacUserRole {
  id: string;
  user_id: string;
  role_id: string;
  role_code: string;
  role_name: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

// ============================================
// QUERIES
// ============================================

/** Listar todos os perfis com contagem de usuários */
export function useRbacRoles() {
  return useQuery({
    queryKey: ['rbac-roles'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('rbac_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;

      // Buscar contagem de usuários por role
      const { data: userRoleCounts, error: countError } = await supabase
        .from('rbac_user_roles')
        .select('role_id')
        .eq('is_active', true);

      if (countError) throw countError;

      const countMap = new Map<string, number>();
      (userRoleCounts || []).forEach((ur) => {
        countMap.set(ur.role_id, (countMap.get(ur.role_id) || 0) + 1);
      });

      return (roles || []).map((role) => ({
        ...role,
        user_count: countMap.get(role.id) || 0,
      })) as RbacRole[];
    },
  });
}

/** Listar todos os módulos ativos */
export function useRbacModules() {
  return useQuery({
    queryKey: ['rbac-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_modules')
        .select('id, code, name, icon, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return (data || []) as SystemModule[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Listar todos os recursos ativos */
export function useRbacResources() {
  return useQuery({
    queryKey: ['rbac-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_resources')
        .select('id, module_id, code, name, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return (data || []) as SystemResource[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Listar todas as ações */
export function useRbacActions() {
  return useQuery({
    queryKey: ['rbac-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_actions')
        .select('id, code, name, display_order')
        .order('display_order');

      if (error) throw error;
      return (data || []) as SystemAction[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Listar todas as permissões ativas */
export function useRbacPermissions() {
  return useQuery({
    queryKey: ['rbac-all-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_permissions')
        .select('id, module_id, resource_id, action_id, permission_key, is_active')
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as SystemPermission[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Listar permissões de um role específico */
export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ['rbac-role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      const { data, error } = await supabase
        .from('rbac_role_permissions')
        .select('id, role_id, permission_id, granted')
        .eq('role_id', roleId);

      if (error) throw error;
      return (data || []) as RolePermission[];
    },
    enabled: !!roleId,
  });
}

/** Listar roles RBAC de um usuário específico */
export function useUserRbacRoles(userId: string | null) {
  return useQuery({
    queryKey: ['rbac-user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('rbac_user_roles')
        .select('id, user_id, role_id, assigned_by, assigned_at, expires_at, is_active, rbac_roles(code, name)')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map((ur) => {
        const role = ur.rbac_roles as unknown as { code: string; name: string } | null;
        return {
          id: ur.id,
          user_id: ur.user_id,
          role_id: ur.role_id,
          role_code: role?.code || '',
          role_name: role?.name || '',
          assigned_by: ur.assigned_by,
          assigned_at: ur.assigned_at,
          expires_at: ur.expires_at,
          is_active: ur.is_active,
        };
      }) as RbacUserRole[];
    },
    enabled: !!userId,
  });
}

// ============================================
// MUTATIONS
// ============================================

/** Criar novo perfil, opcionalmente clonando permissões de outro */
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      code: string;
      description?: string;
      cloneFromId?: string;
    }) => {
      const { data: newRole, error } = await supabase
        .from('rbac_roles')
        .insert({
          name: params.name,
          code: params.code,
          description: params.description || null,
          is_system: false,
          created_by: user?.id || null,
          cloned_from: params.cloneFromId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Se clonando, copiar permissões do role original
      if (params.cloneFromId) {
        const { data: sourcePerms, error: srcErr } = await supabase
          .from('rbac_role_permissions')
          .select('permission_id, granted')
          .eq('role_id', params.cloneFromId);

        if (srcErr) throw srcErr;

        if (sourcePerms && sourcePerms.length > 0) {
          const newPerms = sourcePerms.map((sp) => ({
            role_id: newRole.id,
            permission_id: sp.permission_id,
            granted: sp.granted,
          }));

          const { error: insertErr } = await supabase
            .from('rbac_role_permissions')
            .insert(newPerms);

          if (insertErr) throw insertErr;
        }
      }

      // Audit log
      await supabase.from('rbac_audit_log').insert({
        action: 'role_created',
        target_type: 'role',
        target_id: newRole.id,
        details: { name: params.name, code: params.code, cloned_from: params.cloneFromId || null },
        performed_by: user?.id || null,
      });

      return newRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      toast.success('Perfil criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar perfil: ${error.message}`);
    },
  });
}

/** Atualizar nome/descrição de um perfil */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('rbac_roles')
        .update({
          name: params.name,
          description: params.description || null,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      toast.success('Perfil atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });
}

/** Excluir um perfil (não permite excluir is_system) */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (roleId: string) => {
      // Verificar se é perfil de sistema
      const { data: role, error: fetchErr } = await supabase
        .from('rbac_roles')
        .select('is_system, name')
        .eq('id', roleId)
        .single();

      if (fetchErr) throw fetchErr;
      if (role?.is_system) throw new Error('Não é possível excluir perfis do sistema');

      const { error } = await supabase
        .from('rbac_roles')
        .delete()
        .eq('id', roleId)
        .eq('is_system', false);

      if (error) throw error;

      // Audit log
      await supabase.from('rbac_audit_log').insert({
        action: 'role_deleted',
        target_type: 'role',
        target_id: roleId,
        details: { name: role.name },
        performed_by: user?.id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      toast.success('Perfil excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir perfil: ${error.message}`);
    },
  });
}

/** Toggle uma permissão individual do role (matrix editor) */
export function useToggleRolePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { roleId: string; permissionId: string }) => {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('rbac_role_permissions')
        .select('id')
        .eq('role_id', params.roleId)
        .eq('permission_id', params.permissionId)
        .maybeSingle();

      if (existing) {
        // Remover
        const { error } = await supabase
          .from('rbac_role_permissions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'removed' as const };
      } else {
        // Adicionar
        const { error } = await supabase
          .from('rbac_role_permissions')
          .insert({
            role_id: params.roleId,
            permission_id: params.permissionId,
            granted: true,
          });

        if (error) throw error;
        return { action: 'added' as const };
      }
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-role-permissions', params.roleId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar permissão: ${error.message}`);
    },
  });
}

/** Toggle em massa: selecionar/desmarcar todas permissões de um módulo */
export function useBulkTogglePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      roleId: string;
      permissionIds: string[];
      granted: boolean;
    }) => {
      if (params.granted) {
        // Inserir todas (ignorar conflitos)
        const rows = params.permissionIds.map((pid) => ({
          role_id: params.roleId,
          permission_id: pid,
          granted: true,
        }));

        // Upsert em lote
        const { error } = await supabase
          .from('rbac_role_permissions')
          .upsert(rows, { onConflict: 'role_id,permission_id' });

        if (error) throw error;
      } else {
        // Remover todas as permissões deste módulo para este role
        for (const pid of params.permissionIds) {
          await supabase
            .from('rbac_role_permissions')
            .delete()
            .eq('role_id', params.roleId)
            .eq('permission_id', pid);
        }
      }
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-role-permissions', params.roleId] });
      toast.success('Permissões do módulo atualizadas');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permissões: ${error.message}`);
    },
  });
}

/** Atribuir um perfil RBAC a um usuário */
export function useAssignRoleToUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { userId: string; roleId: string }) => {
      // Tenta inserir; se conflito, reativa
      const { error: insertErr } = await supabase
        .from('rbac_user_roles')
        .upsert(
          {
            user_id: params.userId,
            role_id: params.roleId,
            assigned_by: user?.id || null,
            is_active: true,
          },
          { onConflict: 'user_id,role_id' }
        );

      if (insertErr) throw insertErr;
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-user-roles', params.userId] });
      queryClient.invalidateQueries({ queryKey: ['rbac-permissions', params.userId] });
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      toast.success('Perfil atribuído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir perfil: ${error.message}`);
    },
  });
}

/** Remover um perfil RBAC de um usuário (soft delete) */
export function useRemoveRoleFromUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; roleId: string }) => {
      const { error } = await supabase
        .from('rbac_user_roles')
        .update({ is_active: false })
        .eq('user_id', params.userId)
        .eq('role_id', params.roleId);

      if (error) throw error;
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-user-roles', params.userId] });
      queryClient.invalidateQueries({ queryKey: ['rbac-permissions', params.userId] });
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      toast.success('Perfil removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover perfil: ${error.message}`);
    },
  });
}
