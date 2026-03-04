import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Shield, Key, UserX, Trash2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
  created_at?: string;
  is_active?: boolean;
}

interface UserActionsMenuProps {
  user: UserWithRole;
  currentUserId: string | undefined;
  isGodMode: boolean;
  onEdit: (user: UserWithRole) => void;
  onManageRoles: (user: UserWithRole) => void;
  onResetPassword: (user: UserWithRole) => void;
  onToggleActive: (user: UserWithRole) => void;
  onDelete: (user: UserWithRole) => void;
}

export function UserActionsMenu({
  user,
  currentUserId,
  isGodMode,
  onEdit,
  onManageRoles,
  onResetPassword,
  onToggleActive,
  onDelete,
}: UserActionsMenuProps) {
  const isCurrentUser = user.id === currentUserId;
  const userIsSuperAdmin = user.roles.includes('super_admin');
  
  // Cannot modify self or super_admin (unless you are super_admin)
  const canModify = !isCurrentUser && (isGodMode || !userIsSuperAdmin);
  const canDelete = !isCurrentUser && (isGodMode || !userIsSuperAdmin);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(user)} disabled={!canModify}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onManageRoles(user)} disabled={!canModify}>
          <Shield className="mr-2 h-4 w-4" />
          Gerenciar Papéis
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onResetPassword(user)} disabled={!canModify}>
          <Key className="mr-2 h-4 w-4" />
          Redefinir Senha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleActive(user)} disabled={!canModify}>
          <UserX className="mr-2 h-4 w-4" />
          {user.is_active !== false ? 'Desativar Usuário' : 'Ativar Usuário'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onDelete(user)} 
          disabled={!canDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remover Usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
