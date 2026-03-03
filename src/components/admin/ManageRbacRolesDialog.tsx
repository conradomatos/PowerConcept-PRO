/**
 * Dialog para atribuir/remover perfis RBAC de um usuário.
 * Substitui o ManageRolesDialog antigo com perfis dinâmicos.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import {
  useRbacRoles,
  useUserRbacRoles,
  useAssignRoleToUser,
  useRemoveRoleFromUser,
} from '@/hooks/useRbacAdmin';

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
  const { data: allRoles = [], isLoading: loadingRoles } = useRbacRoles();
  const { data: userRoles = [], isLoading: loadingUserRoles } = useUserRbacRoles(user?.id ?? null);
  const assignRole = useAssignRoleToUser();
  const removeRole = useRemoveRoleFromUser();

  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Popular com roles atuais do usuário quando os dados carregam
  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      setSelectedRoleIds(new Set(userRoles.map((ur) => ur.role_id)));
    } else {
      setSelectedRoleIds(new Set());
    }
  }, [userRoles]);

  // Filtrar apenas roles ativos
  const activeRoles = allRoles.filter((r) => r.is_active);

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const currentIds = new Set(userRoles.map((ur) => ur.role_id));
      const toAdd = [...selectedRoleIds].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !selectedRoleIds.has(id));

      for (const roleId of toAdd) {
        await assignRole.mutateAsync({ userId: user.id, roleId });
      }
      for (const roleId of toRemove) {
        await removeRole.mutateAsync({ userId: user.id, roleId });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Gerenciar Perfis de Acesso
          </DialogTitle>
          <DialogDescription>
            {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3 py-4">
              {activeRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`rbac-role-${role.id}`} className="text-sm font-medium cursor-pointer">
                        {role.name}
                      </Label>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-[10px]">
                          Sistema
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={`rbac-role-${role.id}`}
                    checked={selectedRoleIds.has(role.id)}
                    onCheckedChange={() => handleToggleRole(role.id)}
                  />
                </div>
              ))}
              {activeRoles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum perfil disponível.
                </p>
              )}
            </div>
          </ScrollArea>
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
  );
}
