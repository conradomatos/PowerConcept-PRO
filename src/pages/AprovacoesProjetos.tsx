import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, AlertTriangle, FileCheck, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { syncProjectToOmie } from '@/services/omie/sync';
import type { Database } from '@/integrations/supabase/types';

type Projeto = Database['public']['Tables']['projetos']['Row'];
type Empresa = Database['public']['Tables']['empresas']['Row'];

type ProjetoWithEmpresa = Projeto & {
  empresas: Pick<Empresa, 'empresa' | 'codigo' | 'unidade'> | null;
};

export default function AprovacoesProjetos() {
  const { hasRole, isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjeto, setSelectedProjeto] = useState<ProjetoWithEmpresa | null>(null);
  const [actionType, setActionType] = useState<'aprovar' | 'reprovar' | 'view' | null>(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [loading, setLoading] = useState(false);

  const canApprove = hasRole('admin') || isSuperAdmin();

  const { data: projetosPendentes, isLoading } = useQuery({
    queryKey: ['projetos-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          *,
          empresas (empresa, codigo, unidade)
        `)
        .eq('aprovacao_status', 'PENDENTE_APROVACAO')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjetoWithEmpresa[];
    },
  });

  const { data: projetosRecentes } = useQuery({
    queryKey: ['projetos-recentes-aprovados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          *,
          empresas (empresa, codigo, unidade)
        `)
        .in('aprovacao_status', ['APROVADO', 'REPROVADO'])
        .order('aprovado_em', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as ProjetoWithEmpresa[];
    },
  });

  const handleAprovar = async () => {
    if (!selectedProjeto || !canApprove) return;

    setLoading(true);
    try {
      // Generate OS
      const { data: nextOs } = await supabase.rpc('generate_next_os');
      
      const { error } = await supabase
        .from('projetos')
        .update({
          aprovacao_status: 'APROVADO',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
          os: nextOs || `26${Date.now().toString().slice(-3)}`,
        })
        .eq('id', selectedProjeto.id);

      if (error) throw error;

      toast.success(`Projeto "${selectedProjeto.nome}" aprovado com sucesso! OS: ${nextOs}`);
      
      // Sync to Omie automatically after approval
      const syncResult = await syncProjectToOmie(selectedProjeto.id);
      if (syncResult.success) {
        toast.success('Projeto sincronizado com Omie automaticamente!');
      } else {
        toast.warning(`Aprovado, mas falha ao sincronizar com Omie: ${syncResult.message}`);
      }

      queryClient.invalidateQueries({ queryKey: ['projetos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['projetos-recentes-aprovados'] });
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      queryClient.invalidateQueries({ queryKey: ['home-omie-status'] });
      setSelectedProjeto(null);
      setActionType(null);
    } catch (error: any) {
      toast.error('Erro ao aprovar projeto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReprovar = async () => {
    if (!selectedProjeto || !canApprove) return;

    if (!motivoReprovacao.trim()) {
      toast.error('Informe o motivo da reprovação');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('projetos')
        .update({
          aprovacao_status: 'REPROVADO',
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
          motivo_reprovacao: motivoReprovacao.trim(),
        })
        .eq('id', selectedProjeto.id);

      if (error) throw error;

      toast.success(`Projeto "${selectedProjeto.nome}" reprovado.`);
      queryClient.invalidateQueries({ queryKey: ['projetos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['projetos-recentes-aprovados'] });
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      setSelectedProjeto(null);
      setActionType(null);
      setMotivoReprovacao('');
    } catch (error: any) {
      toast.error('Erro ao reprovar projeto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (projeto: ProjetoWithEmpresa, action: 'aprovar' | 'reprovar' | 'view') => {
    setSelectedProjeto(projeto);
    setActionType(action);
    setMotivoReprovacao('');
  };

  const closeDialog = () => {
    setSelectedProjeto(null);
    setActionType(null);
    setMotivoReprovacao('');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
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

  const getRiskBadge = (risk: string | null) => {
    switch (risk) {
      case 'BAIXO':
        return <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">Baixo</Badge>;
      case 'MEDIO':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Médio</Badge>;
      case 'ALTO':
        return <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/30">Alto</Badge>;
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  if (!canApprove) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>
                Somente administradores podem aprovar projetos.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileCheck className="h-6 w-6" />
            Aprovações de Projetos
          </h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de criação de projetos
          </p>
        </div>

        {/* Pending Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Projetos Pendentes de Aprovação
              {projetosPendentes && projetosPendentes.length > 0 && (
                <Badge variant="secondary" className="ml-2">{projetosPendentes.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : projetosPendentes?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>Nenhum projeto pendente de aprovação</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Solicitado em</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projetosPendentes?.map((projeto) => (
                    <TableRow key={projeto.id}>
                      <TableCell className="font-medium">{projeto.nome}</TableCell>
                      <TableCell>
                        {projeto.empresas ? (
                          <span>{projeto.empresas.codigo} - {projeto.empresas.empresa}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getTipoContratoBadge(projeto.tipo_contrato)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(projeto.valor_contrato)}
                      </TableCell>
                      <TableCell>
                        {formatDate(projeto.data_inicio_planejada)} - {formatDate(projeto.data_fim_planejada)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(projeto.solicitado_em)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(projeto, 'view')}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(projeto, 'aprovar')}
                            className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            title="Aprovar"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(projeto, 'reprovar')}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            title="Reprovar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Decisions */}
        {projetosRecentes && projetosRecentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Decisões Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Nome do Projeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decidido em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projetosRecentes.map((projeto) => (
                    <TableRow key={projeto.id}>
                      <TableCell>
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                          {projeto.os}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{projeto.nome}</TableCell>
                      <TableCell>
                        {projeto.aprovacao_status === 'APROVADO' ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30">
                            <XCircle className="h-3 w-3 mr-1" />
                            Reprovado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(projeto.aprovado_em)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View/Approve/Reject Dialog */}
      <Dialog open={!!selectedProjeto && !!actionType} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'aprovar' && 'Aprovar Projeto'}
              {actionType === 'reprovar' && 'Reprovar Projeto'}
              {actionType === 'view' && 'Detalhes do Projeto'}
            </DialogTitle>
            <DialogDescription>
              {selectedProjeto?.nome}
            </DialogDescription>
          </DialogHeader>

          {selectedProjeto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">
                    {selectedProjeto.empresas?.empresa || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Contrato</Label>
                  <p>{getTipoContratoBadge(selectedProjeto.tipo_contrato)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor do Contrato</Label>
                  <p className="font-medium font-mono">
                    {formatCurrency(selectedProjeto.valor_contrato)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Período Planejado</Label>
                  <p className="font-medium">
                    {formatDate(selectedProjeto.data_inicio_planejada)} - {formatDate(selectedProjeto.data_fim_planejada)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Risco de Escopo</Label>
                  <p>{getRiskBadge(selectedProjeto.risco_escopo)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Risco Liberação</Label>
                  <p>{getRiskBadge(selectedProjeto.risco_liberacao_cliente)}</p>
                </div>
              </div>

              {selectedProjeto.descricao && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="text-sm mt-1">{selectedProjeto.descricao}</p>
                </div>
              )}

              {selectedProjeto.observacoes_riscos && (
                <div>
                  <Label className="text-muted-foreground">Observações de Riscos</Label>
                  <p className="text-sm mt-1">{selectedProjeto.observacoes_riscos}</p>
                </div>
              )}

              {actionType === 'reprovar' && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="motivo">Motivo da Reprovação *</Label>
                  <Textarea
                    id="motivo"
                    value={motivoReprovacao}
                    onChange={(e) => setMotivoReprovacao(e.target.value)}
                    placeholder="Informe o motivo da reprovação..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>
              {actionType === 'view' ? 'Fechar' : 'Cancelar'}
            </Button>
            {actionType === 'aprovar' && (
              <Button onClick={handleAprovar} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? 'Aprovando...' : 'Aprovar Projeto'}
              </Button>
            )}
            {actionType === 'reprovar' && (
              <Button onClick={handleReprovar} disabled={loading} variant="destructive">
                {loading ? 'Reprovando...' : 'Reprovar Projeto'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
