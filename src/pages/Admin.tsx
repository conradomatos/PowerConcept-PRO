import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Users, UserCheck, Clock, Shield, ShieldCheck } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { ManageRbacRolesDialog } from '@/components/admin/ManageRbacRolesDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { UserActionsMenu } from '@/components/admin/UserActionsMenu';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { RolePermissionMatrix } from '@/components/admin/RolePermissionMatrix';
import { useRbacRoles } from '@/hooks/useRbacAdmin';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  username?: string | null;
  roles: AppRole[];
  rbacProfile?: { id: string; name: string; code: string } | null;
  created_at?: string;
  is_active?: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading, hasRole, isGodMode } = useAuth();
  const { canModule } = usePermissions();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [permissionMatrixOpen, setPermissionMatrixOpen] = useState(false);

  const { data: rbacRoles = [] } = useRbacRoles();
  const rbacRolesCount = rbacRoles.filter(r => r.is_active).length;

  const canAccessAdmin = hasRole('admin') || hasRole('super_admin') || canModule('admin');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && user && !canAccessAdmin) {
      navigate('/');
    }
  }, [user, loading, canAccessAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    // Get all profiles (including is_active which may not be in generated types yet)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, username, created_at, is_active')
      .order('created_at', { ascending: false });

    if (profilesError) {
      setLoadingUsers(false);
      return;
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
    }

    // Buscar perfis RBAC dos usuários
    const { data: rbacAssignments } = await supabase
      .from('rbac_user_roles')
      .select('user_id, rbac_roles(id, name, code)')
      .eq('is_active', true);

    // Criar mapa user_id -> perfil RBAC
    const rbacMap = new Map<string, { id: string; name: string; code: string }>();
    if (rbacAssignments) {
      for (const a of rbacAssignments) {
        const role = (a as any).rbac_roles;
        if (role && a.user_id) {
          rbacMap.set(a.user_id, { id: role.id, name: role.name, code: role.code });
        }
      }
    }

    // Combine profiles with their roles
    const usersData: UserWithRole[] = (profiles || []).map((profile) => ({
      id: profile.user_id,
      email: profile.email || '',
      full_name: profile.full_name,
      username: (profile as any).username || null,
      roles: (roles || [])
        .filter((r) => r.user_id === profile.user_id)
        .map((r) => r.role),
      rbacProfile: rbacMap.get(profile.user_id) || null,
      created_at: profile.created_at,
      is_active: (profile as { is_active?: boolean }).is_active !== false,
    }));

    setUsers(usersData);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (user && canAccessAdmin) {
      fetchUsers();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const getRoleBadgeVariant = (role: AppRole): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'rh':
        return 'secondary';
      case 'financeiro':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: AppRole): string => {
    const labels: Record<AppRole, string> = {
      'super_admin': 'SUPER ADMIN',
      'admin': 'ADMIN',
      'rh': 'RH',
      'financeiro': 'FINANCEIRO',
      'catalog_manager': 'GESTOR CATÁLOGO',
    };
    return labels[role] || String(role).toUpperCase();
  };

  // All users from profiles table
  const allUsers = users;
  // Users without any profile (pending activation)
  const pendingUsers = users.filter(u => !u.rbacProfile && u.roles.length === 0);
  // Active users (has profile AND is_active = true)
  const activeUsers = users.filter(u => (u.rbacProfile || u.roles.length > 0) && u.is_active);

  // Action handlers
  const handleEdit = (u: UserWithRole) => {
    setSelectedUser(u);
    setEditDialogOpen(true);
  };

  const handleManageRoles = (u: UserWithRole) => {
    setSelectedUser(u);
    setRolesDialogOpen(true);
  };

  const handleResetPassword = (u: UserWithRole) => {
    setSelectedUser(u);
    setPasswordDialogOpen(true);
  };

  const handleToggleActive = (u: UserWithRole) => {
    setSelectedUser(u);
    setDeactivateDialogOpen(true);
  };

  const handleDelete = (u: UserWithRole) => {
    setSelectedUser(u);
    setDeleteDialogOpen(true);
  };

  const confirmToggleActive = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const newStatus = !selectedUser.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('user_id', selectedUser.id);

      if (error) {
        toast.error(`Erro ao ${newStatus ? 'ativar' : 'desativar'} usuário`);
        return;
      }

      toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`);
      fetchUsers();
      setDeactivateDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      // Remove all roles first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      // Remove profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', selectedUser.id);

      if (error) {
        toast.error('Erro ao remover usuário');
        return;
      }

      toast.success('Usuário removido com sucesso');
      fetchUsers();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao remover usuário');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Administração de Usuários</h2>
            <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/roles')} className="gap-2">
            <Shield className="h-4 w-4" />
            Perfis de Acesso
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes de Ativação</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{pendingUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perfis Criados</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rbacRolesCount}</div>
              <p className="text-xs text-muted-foreground">perfis de acesso</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Todos os Usuários</CardTitle>
                <CardDescription>
                  {allUsers.length} usuário{allUsers.length !== 1 && 's'} no sistema
                </CardDescription>
              </div>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Adicionar Usuário
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário no sistema
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u) => (
                      <TableRow key={u.id} className={!u.is_active ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.full_name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{u.username || '-'}</TableCell>
                        <TableCell>
                          {u.rbacProfile ? (
                            <Badge variant={u.rbacProfile.code === 'god_mode' ? 'destructive' : 'default'}>
                              {u.rbacProfile.code === 'god_mode' ? '\u2605 ' : ''}{u.rbacProfile.name}
                            </Badge>
                          ) : u.roles.length > 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Legado: {u.roles.join(', ')}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem perfil</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.rbacProfile ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => {
                                setSelectedUser(u);
                                setPermissionMatrixOpen(true);
                              }}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Ver permissões
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!u.rbacProfile && u.roles.length === 0 ? (
                            <Badge variant="outline" className="bg-orange-500/20 text-orange-500 border-orange-500/50">
                              Sem Perfil
                            </Badge>
                          ) : u.is_active ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/50">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/50">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell>
                          <UserActionsMenu
                            user={u}
                            currentUserId={user?.id}
                            isGodMode={isGodMode()}
                            onEdit={handleEdit}
                            onManageRoles={handleManageRoles}
                            onResetPassword={handleResetPassword}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDelete}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddUserDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchUsers}
        isGodMode={isGodMode()}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <ManageRbacRolesDialog
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <ResetPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <ConfirmDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title={selectedUser?.is_active ? 'Desativar Usuário' : 'Ativar Usuário'}
        description={
          selectedUser?.is_active
            ? `Tem certeza que deseja desativar o usuário ${selectedUser?.full_name || selectedUser?.email}? Ele não poderá mais acessar o sistema.`
            : `Tem certeza que deseja ativar o usuário ${selectedUser?.full_name || selectedUser?.email}?`
        }
        confirmLabel={selectedUser?.is_active ? 'Desativar' : 'Ativar'}
        variant={selectedUser?.is_active ? 'destructive' : 'default'}
        isLoading={actionLoading}
        onConfirm={confirmToggleActive}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover Usuário"
        description={`Esta ação é irreversível. Deseja remover permanentemente o usuário ${selectedUser?.full_name || selectedUser?.email}?`}
        confirmLabel="Remover"
        variant="destructive"
        isLoading={actionLoading}
        onConfirm={confirmDelete}
      />

      {permissionMatrixOpen && selectedUser?.rbacProfile && (
        <RolePermissionMatrix
          roleId={selectedUser.rbacProfile.id}
          roleName={selectedUser.rbacProfile.name}
          isSystem={false}
          onClose={() => setPermissionMatrixOpen(false)}
        />
      )}
    </Layout>
  );
}
