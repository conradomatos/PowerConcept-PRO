import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Search, Pencil, Trash2, FolderKanban, Pin, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProjetoForm from '@/components/ProjetoForm';
import { useAuth } from '@/hooks/useAuth';
import { syncProjectToOmie } from '@/services/omie/sync';
import type { Database } from '@/integrations/supabase/types';

type Projeto = Database['public']['Tables']['projetos']['Row'];
type Empresa = Database['public']['Tables']['empresas']['Row'];

type ProjetoWithEmpresa = Projeto & {
  empresas: Pick<Empresa, 'empresa' | 'codigo' | 'unidade'> | null;
};

export default function Projetos() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAprovacao, setFilterAprovacao] = useState<string>('all');
  const [filterTipoContrato, setFilterTipoContrato] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<ProjetoWithEmpresa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projetoToDelete, setProjetoToDelete] = useState<ProjetoWithEmpresa | null>(null);
  const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);

  const canEdit = hasRole('admin') || hasRole('rh');
  const canDelete = hasRole('admin');

  const { data: projetos, isLoading } = useQuery({
    queryKey: ['projetos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          *,
          empresas (empresa, codigo, unidade)
        `)
        .order('nome');

      if (error) throw error;
      return data as ProjetoWithEmpresa[];
    },
  });

  // Sort projects: ORÇAMENTOS first (pinned), then by name
  const sortedProjetos = projetos?.slice().sort((a, b) => {
    // Pin ORÇAMENTOS first
    if (a.nome === 'ORÇAMENTOS') return -1;
    if (b.nome === 'ORÇAMENTOS') return 1;
    // Then by name
    return a.nome.localeCompare(b.nome);
  });

  const filteredProjetos = sortedProjetos?.filter((proj) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      proj.nome.toLowerCase().includes(searchLower) ||
      proj.empresas?.empresa.toLowerCase().includes(searchLower) ||
      proj.empresas?.codigo.toLowerCase().includes(searchLower) ||
      proj.os.toLowerCase().includes(searchLower);

    const matchesStatus = filterStatus === 'all' || proj.status_projeto === filterStatus;
    const matchesAprovacao = filterAprovacao === 'all' || proj.aprovacao_status === filterAprovacao;
    const matchesTipoContrato = filterTipoContrato === 'all' || proj.tipo_contrato === filterTipoContrato;

    return matchesSearch && matchesStatus && matchesAprovacao && matchesTipoContrato;
  });

  const handleEdit = (projeto: ProjetoWithEmpresa) => {
    setSelectedProjeto(projeto);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedProjeto(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!projetoToDelete) return;

    try {
      const { error } = await supabase
        .from('projetos')
        .delete()
        .eq('id', projetoToDelete.id);

      if (error) throw error;

      toast.success('Projeto excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
    } catch (error: any) {
      toast.error('Erro ao excluir projeto: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setProjetoToDelete(null);
    }
  };

  const confirmDelete = (projeto: ProjetoWithEmpresa) => {
    if (projeto.is_sistema) {
      toast.error('Não é possível excluir projetos do sistema');
      return;
    }
    setProjetoToDelete(projeto);
    setDeleteDialogOpen(true);
  };

  const handleSyncToOmie = async (projeto: ProjetoWithEmpresa) => {
    if (!projeto.os || projeto.os.startsWith('TEMP-')) {
      toast.error('Projeto precisa estar aprovado para sincronizar com Omie');
      return;
    }

    setSyncingProjectId(projeto.id);
    try {
      const result = await syncProjectToOmie(projeto.id);
      if (result.success) {
        toast.success(result.message || 'Projeto sincronizado com Omie!');
        queryClient.invalidateQueries({ queryKey: ['projetos'] });
      } else {
        toast.error(result.message || 'Erro ao sincronizar com Omie');
      }
    } catch (error: any) {
      toast.error('Erro inesperado ao sincronizar');
    } finally {
      setSyncingProjectId(null);
    }
  };

  const getOmieSyncBadge = (projeto: ProjetoWithEmpresa) => {
    const status = projeto.omie_sync_status;
    const isTemp = projeto.os?.startsWith('TEMP-');
    
    if (isTemp) {
      return (
        <span className="text-muted-foreground text-xs">-</span>
      );
    }

    switch (status) {
      case 'SYNCED':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30 gap-1">
                <Cloud className="h-3 w-3" />
                Sync
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sincronizado em {projeto.omie_last_sync_at ? new Date(projeto.omie_last_sync_at).toLocaleString('pt-BR') : '-'}</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'ERROR':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
                <CloudOff className="h-3 w-3" />
                Erro
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-destructive font-medium">Erro de sincronização</p>
              <p className="text-xs">{projeto.omie_last_error || 'Erro desconhecido'}</p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <CloudOff className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  const getAprovacaoBadge = (status: string | null) => {
    switch (status) {
      case 'APROVADO':
        return <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'PENDENTE_APROVACAO':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'REPROVADO':
        return <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Reprovado</Badge>;
      case 'RASCUNHO':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Rascunho</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  // @ts-ignore TS6133 - kept for future use
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ATIVO':
        return <Badge variant="default">Ativo</Badge>;
      case 'CONCLUIDO':
        return <Badge variant="secondary">Concluído</Badge>;
      case 'SUSPENSO':
        return <Badge variant="outline" className="text-yellow-500">Suspenso</Badge>;
      case 'CANCELADO':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant={status === 'ativo' ? 'default' : 'secondary'}>{status || '-'}</Badge>;
    }
  };

  const getTipoContratoBadge = (tipo: string | null) => {
    switch (tipo) {
      case 'PRECO_FECHADO':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">Preço Fechado</Badge>;
      case 'MAO_DE_OBRA':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">Mão de Obra</Badge>;
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FolderKanban className="h-6 w-6" />
              Projetos
            </h1>
            <p className="text-muted-foreground">
              Portfólio de projetos ganhos
            </p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OS, nome ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] minw-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="ATIVO">Ativo</SelectItem>
              <SelectItem value="CONCLUIDO">Concluído</SelectItem>
              <SelectItem value="SUSPENSO">Suspenso</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAprovacao} onValueChange={setFilterAprovacao}>
            <SelectTrigger className="w-[160px] minw-filter">
              <SelectValue placeholder="Aprovação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Aprovações</SelectItem>
              <SelectItem value="APROVADO">Aprovado</SelectItem>
              <SelectItem value="PENDENTE_APROVACAO">Pendente</SelectItem>
              <SelectItem value="REPROVADO">Reprovado</SelectItem>
              <SelectItem value="RASCUNHO">Rascunho</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterTipoContrato} onValueChange={setFilterTipoContrato}>
            <SelectTrigger className="w-[160px] minw-filter">
              <SelectValue placeholder="Tipo Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="PRECO_FECHADO">Preço Fechado</SelectItem>
              <SelectItem value="MAO_DE_OBRA">Mão de Obra</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TooltipProvider>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">OS</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-28">Omie</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredProjetos?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum projeto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjetos?.map((projeto) => (
                  <TableRow key={projeto.id} className={projeto.is_sistema ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {projeto.is_sistema && <Pin className="h-3 w-3 text-primary" />}
                        {projeto.os?.startsWith('TEMP-') ? (
                          <span className="text-muted-foreground text-sm italic">Pendente</span>
                        ) : (
                          <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                            {projeto.os}
                          </code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {projeto.nome}
                      {projeto.is_sistema && (
                        <span className="ml-2 text-xs text-muted-foreground">(Sistema)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {projeto.empresas ? (
                        <span>
                          <code className="bg-muted px-2 py-1 rounded text-sm mr-2">
                            {projeto.empresas.codigo}
                          </code>
                          {projeto.empresas.empresa}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getTipoContratoBadge(projeto.tipo_contrato)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(projeto.valor_contrato)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {projeto.data_inicio_planejada ? new Date(projeto.data_inicio_planejada).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {projeto.data_fim_planejada ? new Date(projeto.data_fim_planejada).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>{getAprovacaoBadge(projeto.aprovacao_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getOmieSyncBadge(projeto)}
                        {canEdit && !projeto.is_sistema && !projeto.os?.startsWith('TEMP-') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSyncToOmie(projeto)}
                            disabled={syncingProjectId === projeto.id}
                            title="Sincronizar com Omie"
                            className="h-7 w-7"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncingProjectId === projeto.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(projeto)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && !projeto.is_sistema && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(projeto)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </TooltipProvider>
      </div>

      <ProjetoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projeto={selectedProjeto}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['projetos'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto "{projetoToDelete?.nome}"?
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
