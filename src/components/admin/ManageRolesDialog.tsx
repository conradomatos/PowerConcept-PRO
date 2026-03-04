import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
}

interface ManageRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
  isGodMode: boolean;
}

const ALL_ROLES: { value: AppRole; label: string }[] = [
  { value: 'super_admin', label: 'SUPER ADMIN' },
  { value: 'admin', label: 'ADMIN' },
  { value: 'rh', label: 'RH' },
  { value: 'financeiro', label: 'FINANCEIRO' },
];

export function ManageRolesDialog({ open, onOpenChange, user, onSuccess, isGodMode }: ManageRolesDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRoles(user.roles);
    }
  }, [user]);

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (selectedRoles.length === 0) {
      toast.error('Selecione pelo menos um papel');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current roles to determine what to add/remove
      const rolesToAdd = selectedRoles.filter(r => !user.roles.includes(r));
      const rolesToRemove = user.roles.filter(r => !selectedRoles.includes(r));

      // Remove roles
      for (const role of rolesToRemove) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', role);
      }

      // Add roles
      for (const role of rolesToAdd) {
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role });
      }

      toast.success('Papéis atualizados com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao atualizar papéis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableRoles = isGodMode ? ALL_ROLES : ALL_ROLES.filter(r => r.value !== 'super_admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerenciar Papéis</DialogTitle>
          <DialogDescription>
            Altere os papéis de {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {availableRoles.map((role) => (
              <div key={role.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`manage-role-${role.value}`}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={() => handleRoleToggle(role.value)}
                />
                <Label htmlFor={`manage-role-${role.value}`} className="text-sm cursor-pointer">
                  {role.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
