import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetForm } from '@/components/orcamentos/BudgetForm';
import { StatusBadge } from '@/components/orcamentos/StatusBadge';
import { useBudgets } from '@/hooks/orcamentos/useBudgets';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  Pencil,
  Calculator,
} from 'lucide-react';
import type { BudgetFormData, BudgetWithRelations, RevisionStatus } from '@/lib/orcamentos/types';

export default function OrcamentosList() {
  const navigate = useNavigate();
  const { isGodMode, loading } = useAuth();
  const { budgets, isLoading, createBudget, updateBudget, deleteBudget, duplicateBudget } = useBudgets();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canManage = isGodMode();

  // Filter budgets - hook must be called unconditionally
  const filteredBudgets = useMemo(() => {
    if (!search) return budgets;
    const searchLower = search.toLowerCase();
    return budgets.filter(
      (b) =>
        b.budget_number.toLowerCase().includes(searchLower) ||
        b.obra_nome.toLowerCase().includes(searchLower) ||
        b.cliente?.empresa?.toLowerCase().includes(searchLower)
    );
  }, [budgets, search]);

  const handleCreate = async (data: BudgetFormData) => {
    await createBudget.mutateAsync(data);
    setFormOpen(false);
  };

  const handleUpdate = async (data: BudgetFormData) => {
    if (!editingBudget) return;
    await updateBudget.mutateAsync({
      id: editingBudget.id,
      cliente_id: data.cliente_id,
      obra_nome: data.obra_nome,
      local: data.local,
    });
    setEditingBudget(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteBudget.mutateAsync(deleteConfirm);
    setDeleteConfirm(null);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateBudget.mutateAsync(id);
  };

  const handleOpen = (id: string) => {
    navigate(`/orcamentos/${id}`);
  };

  // Only super_admin can access this page - check after all hooks
  if (!loading && !isGodMode()) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Esta página é exclusiva para administradores master.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Orçamentos
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie orçamentos para obras industriais
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, obra ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Revisão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading || loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredBudgets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {search ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBudgets.map((budget) => (
                      <TableRow 
                        key={budget.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpen(budget.id)}
                      >
                        <TableCell className="font-mono font-medium">
                          {budget.budget_number}
                        </TableCell>
                        <TableCell>
                          {budget.cliente?.empresa || '-'}
                        </TableCell>
                        <TableCell>{budget.obra_nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {budget.local || '-'}
                        </TableCell>
                        <TableCell>
                          {budget.latest_revision ? (
                            <span className="text-sm">
                              Rev. {budget.latest_revision.revision_number}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {budget.latest_revision ? (
                            <StatusBadge 
                              status={budget.latest_revision.status as RevisionStatus} 
                              size="sm" 
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(budget.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpen(budget.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Abrir
                              </DropdownMenuItem>
                              {canManage && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => setEditingBudget(budget)}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDuplicate(budget.id)}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteConfirm(budget.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      <BudgetForm
        open={formOpen || !!editingBudget}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingBudget(null);
          }
        }}
        onSubmit={editingBudget ? handleUpdate : handleCreate}
        budget={editingBudget}
        isLoading={createBudget.isPending || updateBudget.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as revisões e dados associados serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
