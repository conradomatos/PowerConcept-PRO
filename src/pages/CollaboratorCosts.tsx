import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CustoForm } from '@/components/CustoForm';
import { CustoColaborador, calcularCustos, isVigente, isEncerrado } from '@/calculations/custos-pessoal';
import { formatCurrency, formatDate } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatCPF } from '@/lib/cpf';
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

interface Collaborator {
  id: string;
  full_name: string;
  cpf: string;
}

export default function CollaboratorCosts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();
  
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [custos, setCustos] = useState<CustoColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCusto, setSelectedCusto] = useState<CustoColaborador | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [custoToDelete, setCustoToDelete] = useState<CustoColaborador | null>(null);

  const canAccess = roles.includes('admin') || roles.includes('rh') || roles.includes('financeiro');
  const canEdit = roles.includes('admin') || roles.includes('rh');
  const canDelete = roles.includes('admin');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch collaborator info
      const { data: collabData, error: collabError } = await supabase
        .from('collaborators')
        .select('id, full_name, cpf')
        .eq('id', id)
        .maybeSingle();

      if (collabError) throw collabError;
      if (!collabData) {
        toast({ title: 'Erro', description: 'Colaborador não encontrado', variant: 'destructive' });
        navigate('/collaborators');
        return;
      }
      setCollaborator(collabData);

      // Fetch custos
      const { data: custosData, error: custosError } = await supabase
        .from('custos_colaborador')
        .select('*')
        .eq('colaborador_id', id)
        .order('inicio_vigencia', { ascending: false });

      if (custosError) throw custosError;
      setCustos((custosData || []) as CustoColaborador[]);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setSelectedCusto(null);
    setFormOpen(true);
  };

  const handleEdit = (custo: CustoColaborador) => {
    setSelectedCusto(custo);
    setFormOpen(true);
  };

  const handleDeleteClick = (custo: CustoColaborador) => {
    setCustoToDelete(custo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!custoToDelete) return;

    try {
      const { error } = await supabase
        .from('custos_colaborador')
        .delete()
        .eq('id', custoToDelete.id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Custo excluído com sucesso' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setCustoToDelete(null);
    }
  };

  const getStatus = (custo: CustoColaborador): 'vigente' | 'encerrado' | 'futuro' => {
    const today = new Date().toISOString().split('T')[0];
    
    // Future: inicio_vigencia is in the future
    if (custo.inicio_vigencia > today) {
      return 'futuro';
    }
    
    // Vigente: fim_vigencia is null (open) OR today is between inicio and fim
    if (isVigente(custo)) {
      return 'vigente';
    }
    
    // Encerrado: fim_vigencia is in the past
    if (isEncerrado(custo)) {
      return 'encerrado';
    }
    
    return 'encerrado';
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive">Acesso Negado</h2>
          <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/collaborators')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Custos do Colaborador</h1>
            {collaborator && (
              <p className="text-muted-foreground">
                {collaborator.full_name} - CPF: {formatCPF(collaborator.cpf)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo custo (nova vigência)
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Classif.</TableHead>
                <TableHead className="text-right">Salário Base</TableHead>
                <TableHead className="text-right">Benefícios</TableHead>
                <TableHead className="text-center">Peric.</TableHead>
                <TableHead className="text-right">Custo Mensal</TableHead>
                <TableHead className="text-right">Custo/Hora</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum custo cadastrado para este colaborador
                  </TableCell>
                </TableRow>
              ) : (
                custos.map((custo) => {
                  const calc = calcularCustos(custo);
                  const status = getStatus(custo);
                  return (
                    <TableRow key={custo.id}>
                      <TableCell>{formatDate(custo.inicio_vigencia)}</TableCell>
                      <TableCell>{formatDate(custo.fim_vigencia)}</TableCell>
                      <TableCell>
                        <Badge variant={custo.classificacao === 'CLT' ? 'default' : 'secondary'}>
                          {custo.classificacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(custo.salario_base)}</TableCell>
                      <TableCell className="text-right">
                        {custo.classificacao === 'PJ' ? '-' : formatCurrency(calc.beneficios)}
                      </TableCell>
                      <TableCell className="text-center">
                        {custo.classificacao === 'PJ' ? (
                          '-'
                        ) : custo.periculosidade ? (
                          <Badge variant="destructive">Sim</Badge>
                        ) : (
                          <Badge variant="secondary">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(calc.custo_mensal_total)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(calc.custo_hora)}</TableCell>
                      <TableCell className="text-center">
                        {status === 'vigente' ? (
                          <Badge className="bg-green-600 hover:bg-green-700 text-white">Vigente</Badge>
                        ) : status === 'futuro' ? (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">Futuro</Badge>
                        ) : (
                          <Badge variant="outline">Encerrado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(custo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(custo)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Form Dialog */}
      {id && (
        <CustoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          colaboradorId={id}
          custo={selectedCusto}
          onSuccess={fetchData}
          existingCustos={custos}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de custo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
