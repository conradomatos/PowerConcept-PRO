/**
 * Página de gerenciamento de perfis RBAC.
 * Lista todos os perfis, permite criar/editar/clonar/excluir,
 * e abre o matrix editor de permissões.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, Shield, Users, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useRbacRoles, useDeleteRole, type RbacRole } from '@/hooks/useRbacAdmin';
import { CreateRoleDialog } from '@/components/admin/CreateRoleDialog';
import { RolePermissionMatrix } from '@/components/admin/RolePermissionMatrix';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export default function RbacRoles() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { can } = usePermissions();
  const { data: allRoles = [], isLoading } = useRbacRoles();
  // Ocultar god_mode da interface de gerenciamento
  const roles = allRoles.filter((r) => r.code !== 'god_mode');
  const deleteRole = useDeleteRole();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRole | null>(null);
  const [cloningRole, setCloningRole] = useState<RbacRole | null>(null);
  const [matrixRole, setMatrixRole] = useState<RbacRole | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RbacRole | null>(null);

  // Verificar acesso
  const canManageRoles = hasRole('admin') || hasRole('super_admin') || can('admin.roles.configurar');

  if (!canManageRoles) {
    navigate('/sem-acesso');
    return null;
  }

  const handleEdit = (role: RbacRole) => {
    setEditingRole(role);
    setCreateDialogOpen(true);
  };

  const handleClone = (role: RbacRole) => {
    setCloningRole(role);
    setCreateDialogOpen(true);
  };

  const handleDelete = (role: RbacRole) => {
    setDeletingRole(role);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRole) return;
    await deleteRole.mutateAsync(deletingRole.id);
    setDeleteDialogOpen(false);
    setDeletingRole(null);
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditingRole(null);
      setCloningRole(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold tracking-tight">Gerenciamento de Perfis</h2>
            <p className="text-muted-foreground">Configure perfis de acesso e suas permissões</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Perfis</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perfis de Sistema</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.filter((r) => r.is_system).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perfis Personalizados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.filter((r) => !r.is_system).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Todos os Perfis</CardTitle>
            <CardDescription>
              Clique em um perfil para configurar suas permissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum perfil cadastrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Usuários</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow
                        key={role.id}
                        className="cursor-pointer"
                        onClick={() => setMatrixRole(role)}
                      >
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{role.code}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {role.description || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{role.user_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {role.is_system ? (
                            <Badge variant="secondary">Sistema</Badge>
                          ) : (
                            <Badge variant="outline">Personalizado</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMatrixRole(role); }}>
                                <Shield className="mr-2 h-4 w-4" />
                                Permissões
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleEdit(role); }}
                                disabled={role.is_system}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClone(role); }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Clonar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                                disabled={role.is_system}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create/Edit Dialog */}
      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        editingRole={editingRole}
        onSuccess={() => {
          setEditingRole(null);
          setCloningRole(null);
        }}
      />

      {/* Permission Matrix Sheet */}
      {matrixRole && (
        <RolePermissionMatrix
          roleId={matrixRole.id}
          roleName={matrixRole.name}
          isSystem={matrixRole.is_system}
          onClose={() => setMatrixRole(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Perfil"
        description={`Tem certeza que deseja excluir o perfil "${deletingRole?.name}"? Esta ação removerá todas as permissões associadas e não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteRole.isPending}
        onConfirm={confirmDelete}
      />
    </Layout>
  );
}
