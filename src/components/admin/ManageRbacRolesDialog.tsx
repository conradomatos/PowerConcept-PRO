/**
 * Dialog para atribuir perfil RBAC a um usuário.
 * Seleção única (radio) — cada usuário tem exatamente um perfil ativo.
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldCheck, AlertTriangle, Plus } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import {
  useRbacRoles,
  useUserRbacRoles,
  useAssignRoleToUser,
  useRemoveRoleFromUser,
} from '@/hooks/useRbacAdmin';
import { CreateRoleDialog } from './CreateRoleDialog';
import { RolePermissionMatrix } from './RolePermissionMatrix';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
}

interface ManageRbacRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function ManageRbacRolesDialog({ open, onOpenChange, user, onSuccess }: ManageRbacRolesDialogProps) {
  const queryClient = useQueryClient();
  const { data: allRoles = [], isLoading: loadingRoles } = useRbacRoles();
  const { data: userRoles = [], isLoading: loadingUserRoles } = useUserRbacRoles(user?.id ?? null);
  const assignRole = useAssignRoleToUser();
  const removeRole = useRemoveRoleFromUser();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [permissionSheetOpen, setPermissionSheetOpen] = useState(false);

  // Popular com role atual do usuário quando os dados carregam
  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      setSelectedRoleId(userRoles[0].role_id);
    } else {
      setSelectedRoleId(null);
    }
  }, [userRoles]);

  // Filtrar apenas roles ativos
  const activeRoles = allRoles.filter((r) => r.is_active);

  // Encontrar o role selecionado para verificar se é god_mode
  const selectedRole = activeRoles.find((r) => r.id === selectedRoleId);
  const isGodModeSelected = selectedRole?.code === 'god_mode';

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const currentIds = userRoles.map((ur) => ur.role_id);

      // Remover roles atuais que não são o selecionado
      for (const roleId of currentIds) {
        if (roleId !== selectedRoleId) {
          await removeRole.mutateAsync({ userId: user.id, roleId });
        }
      }

      // Adicionar o selecionado se não estava atribuído
      if (selectedRoleId && !currentIds.includes(selectedRoleId)) {
        await assignRole.mutateAsync({ userId: user.id, roleId: selectedRoleId });
      }

      // Se nenhum selecionado, remover todos
      if (!selectedRoleId) {
        for (const roleId of currentIds) {
          await removeRole.mutateAsync({ userId: user.id, roleId });
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      // Erros já são tratados pelos mutations
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingRoles || loadingUserRoles;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Alterar Perfil de Acesso
            </DialogTitle>
            <DialogDescription>
              {user?.full_name || user?.email}
            </DialogDescription>
          </DialogHeader>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Criar Perfil para {user?.full_name?.split(' ')[0] || 'este Usuário'}
          </Button>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 py-4">
                {activeRoles.map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(isSelected ? null : role.id)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary' : 'border-muted-foreground/40'
                        }`}>
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                        <Label className="text-sm font-medium cursor-pointer">
                          {role.name}
                        </Label>
                        {role.is_system && (
                          <Badge variant="secondary" className="text-[10px]">
                            Sistema
                          </Badge>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                          {role.description}
                        </p>
                      )}
                    </button>
                  );
                })}
                {activeRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum perfil disponível.
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {selectedRoleId && !isGodModeSelected && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setPermissionSheetOpen(true)}
            >
              <ShieldCheck className="h-4 w-4" />
              Editar Permissões deste Perfil
            </Button>
          )}

          {/* God Mode warning */}
          {isGodModeSelected && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>God Mode</strong> concede acesso total ao sistema, incluindo gerenciamento de todos os perfis e permissões. Atribua apenas a administradores de confiança.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
          setCreateDialogOpen(false);
        }}
      />

      {permissionSheetOpen && selectedRoleId && selectedRole && (
        <RolePermissionMatrix
          roleId={selectedRoleId}
          roleName={selectedRole.name}
          isSystem={selectedRole.is_system}
          onClose={() => setPermissionSheetOpen(false)}
        />
      )}
    </>
  );
}
