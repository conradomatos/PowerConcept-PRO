import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import CollaboratorForm from '@/components/CollaboratorForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatCPF } from '@/lib/cpf';
import { Plus, Search, Pencil, Eye, DollarSign, Target } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Collaborator = Database['public']['Tables']['collaborators']['Row'];

export default function Collaborators() {
  const navigate = useNavigate();
  const { user, loading, hasAnyRole, hasRole } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [equipeFilter, setEquipeFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCollaborator, setViewCollaborator] = useState<Collaborator | null>(null);

  const canEdit = hasRole('admin') || hasRole('rh');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchCollaborators = async () => {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .order('full_name');

    if (!error && data) {
      setCollaborators(data);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (user && hasAnyRole()) {
      fetchCollaborators();
    }
  }, [user, hasAnyRole]);

  // Get unique equipes for filter
  const uniqueEquipes = useMemo(() => 
    [...new Set(collaborators.map(c => c.equipe).filter(Boolean))].sort() as string[],
    [collaborators]
  );

  const filteredCollaborators = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    
    return collaborators.filter((c) => {
      const matchesSearch = searchLower === '' || 
        c.full_name.toLowerCase().includes(searchLower) ||
        c.cpf.includes(search.replace(/\D/g, '')) ||
        (c.department?.toLowerCase().includes(searchLower) ?? false) ||
        (c.position?.toLowerCase().includes(searchLower) ?? false) ||
        (c.equipe?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesEquipe = equipeFilter === 'all' || c.equipe === equipeFilter;

      return matchesSearch && matchesStatus && matchesEquipe;
    });
  }, [collaborators, search, statusFilter, equipeFilter]);

  const handleEdit = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setFormOpen(true);
  };

  const handleView = (collaborator: Collaborator) => {
    setViewCollaborator(collaborator);
    setViewOpen(true);
  };

  const handleNew = () => {
    setSelectedCollaborator(null);
    setFormOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default">Ativo</Badge>;
      case 'afastado':
        return <Badge variant="secondary">Afastado</Badge>;
      case 'desligado':
        return <Badge variant="outline">Desligado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!hasAnyRole()) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Pendente</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Colaboradores</h2>
            <p className="text-muted-foreground">Gerencie os colaboradores da empresa</p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Colaborador
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, cargo ou departamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="afastado">Afastado</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={equipeFilter} onValueChange={setEquipeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {uniqueEquipes.map((equipe) => (
                <SelectItem key={equipe} value={equipe}>{equipe}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredCollaborators.length} colaborador{filteredCollaborators.length !== 1 && 'es'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredCollaborators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search || statusFilter !== 'all'
                  ? 'Nenhum colaborador encontrado com os filtros aplicados'
                  : 'Nenhum colaborador cadastrado'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollaborators.map((collaborator) => (
                      <TableRow key={collaborator.id}>
                        <TableCell className="font-medium">{collaborator.full_name}</TableCell>
                        <TableCell>{formatCPF(collaborator.cpf)}</TableCell>
                        <TableCell>{collaborator.position || '-'}</TableCell>
                        <TableCell>{collaborator.department || '-'}</TableCell>
                        <TableCell>{collaborator.equipe || '-'}</TableCell>
                        <TableCell>{getStatusBadge(collaborator.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleView(collaborator)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Ver detalhes</p></TooltipContent>
                            </Tooltip>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/collaborators/${collaborator.id}/costs`)}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Vigencia Salarial</p></TooltipContent>
                            </Tooltip>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/collaborators/${collaborator.id}/defaults`)}
                                >
                                  <Target className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Padroes de Alocacao</p></TooltipContent>
                            </Tooltip>
                            {canEdit && (
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(collaborator)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar colaborador</p></TooltipContent>
                              </Tooltip>
                            )}
                          </div>
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

      {/* Form Dialog */}
      <CollaboratorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        collaborator={selectedCollaborator}
        onSuccess={fetchCollaborators}
      />

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Colaborador</DialogTitle>
          </DialogHeader>
          {viewCollaborator && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium">{viewCollaborator.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPF</p>
                  <p className="font-medium">{formatCPF(viewCollaborator.cpf)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium">
                    {viewCollaborator.birth_date
                      ? format(new Date(viewCollaborator.birth_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de Admissão</p>
                  <p className="font-medium">
                    {format(new Date(viewCollaborator.hire_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de Desligamento</p>
                  <p className="font-medium">
                    {viewCollaborator.termination_date
                      ? format(new Date(viewCollaborator.termination_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{getStatusBadge(viewCollaborator.status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cargo</p>
                  <p className="font-medium">{viewCollaborator.position || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Departamento</p>
                  <p className="font-medium">{viewCollaborator.department || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Equipe</p>
                  <p className="font-medium">{viewCollaborator.equipe || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{viewCollaborator.email || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{viewCollaborator.phone || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
