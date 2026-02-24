import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VeiculoForm from '@/components/frotas/VeiculoForm';
import { useAuth } from '@/hooks/useAuth';

export type Veiculo = {
  id: string;
  placa: string;
  apelido: string | null;
  modelo: string | null;
  ano: number | null;
  valor_compra: number | null;
  data_compra: string | null;
  vida_util_meses: number | null;
  km_atual: number | null;
  projeto_atual_id: string | null;
  status: string | null;
  tipo_combustivel: string | null;
  media_km_litro_ref: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type VeiculoWithProjeto = Veiculo & {
  projetos: { nome: string; os: string } | null;
};

export default function Veiculos() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoWithProjeto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [veiculoToDelete, setVeiculoToDelete] = useState<VeiculoWithProjeto | null>(null);

  const canEdit = hasRole('admin') || hasRole('rh');

  const { data: veiculos, isLoading } = useQuery({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          *,
          projetos:projeto_atual_id (nome, os)
        `)
        .order('placa');

      if (error) throw error;
      return data as VeiculoWithProjeto[];
    },
  });

  const filteredVeiculos = useMemo(() => {
    if (!veiculos) return [];
    if (!search.trim()) return veiculos;

    const searchLower = search.toLowerCase().trim();
    return veiculos.filter((v) =>
      v.placa.toLowerCase().includes(searchLower) ||
      v.apelido?.toLowerCase().includes(searchLower) ||
      v.modelo?.toLowerCase().includes(searchLower)
    );
  }, [veiculos, search]);

  const handleNew = () => {
    setSelectedVeiculo(null);
    setFormOpen(true);
  };

  const handleEdit = (veiculo: VeiculoWithProjeto) => {
    setSelectedVeiculo(veiculo);
    setFormOpen(true);
  };

  const confirmDelete = (veiculo: VeiculoWithProjeto) => {
    setVeiculoToDelete(veiculo);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!veiculoToDelete) return;

    try {
      const { error } = await supabase
        .from('veiculos')
        .delete()
        .eq('id', veiculoToDelete.id);

      if (error) throw error;
      toast.success('Veículo excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
    } catch (error: any) {
      toast.error('Erro ao excluir veículo: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setVeiculoToDelete(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">Ativo</Badge>;
      case 'em_manutencao':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Em Manutenção</Badge>;
      case 'inativo':
        return <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/30">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status || '-'}</Badge>;
    }
  };

  const formatKm = (km: number | null) => {
    if (km === null || km === undefined) return '-';
    return km.toLocaleString('pt-BR') + ' km';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Veículos
            </h1>
            <p className="text-muted-foreground">Cadastro e gestão da frota de veículos</p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Veículo
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, apelido ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredVeiculos.length} veículo{filteredVeiculos.length !== 1 && 's'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredVeiculos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search
                  ? 'Nenhum veículo encontrado com os filtros aplicados'
                  : 'Nenhum veículo cadastrado'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Apelido</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>KM Atual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Projeto Atual</TableHead>
                      {canEdit && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVeiculos.map((veiculo) => (
                      <TableRow key={veiculo.id}>
                        <TableCell>
                          <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                            {veiculo.placa}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{veiculo.apelido || '-'}</TableCell>
                        <TableCell>{veiculo.modelo || '-'}</TableCell>
                        <TableCell>{veiculo.ano || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{formatKm(veiculo.km_atual)}</TableCell>
                        <TableCell>{getStatusBadge(veiculo.status)}</TableCell>
                        <TableCell>
                          {veiculo.projetos ? (
                            <span className="text-sm">
                              <code className="bg-muted px-2 py-1 rounded text-sm mr-1">{veiculo.projetos.os}</code>
                              {veiculo.projetos.nome}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(veiculo)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(veiculo)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <VeiculoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        veiculo={selectedVeiculo}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['veiculos'] })}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo "{veiculoToDelete?.placa} - {veiculoToDelete?.apelido || veiculoToDelete?.modelo}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
