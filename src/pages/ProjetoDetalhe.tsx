import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { useProjetoDetalhe } from '@/hooks/useProjetoDetalhe';
import { useAuth } from '@/hooks/useAuth';
import { syncProjectToOmie } from '@/services/omie/sync';
import ProjetoForm from '@/components/ProjetoForm';
import { toast } from 'sonner';

/** Formata valor monetário; retorna "–" para null/undefined/0 */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '–';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** Badge de aprovação reutilizável */
function getAprovacaoBadge(status: string | null) {
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
      return <Badge variant="outline">–</Badge>;
  }
}

function getStatusBadge(status: string | null) {
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
      return <Badge variant="outline">{status || '–'}</Badge>;
  }
}

function getTipoContratoBadge(tipo: string | null) {
  switch (tipo) {
    case 'PRECO_FECHADO':
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">Preço Fechado</Badge>;
    case 'MAO_DE_OBRA':
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">Mão de Obra</Badge>;
    default:
      return <span className="text-muted-foreground">–</span>;
  }
}

function getRiscoBadge(nivel: string | null) {
  switch (nivel) {
    case 'BAIXO':
      return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">Baixo</Badge>;
    case 'MEDIO':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Médio</Badge>;
    case 'ALTO':
      return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">Alto</Badge>;
    default:
      return <span className="text-muted-foreground">–</span>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleString('pt-BR');
}

/** Item de definição usado na dl grid */
function DlItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { data: projeto, isLoading, isError } = useProjetoDetalhe(id);

  const [formOpen, setFormOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const canEdit = hasRole('admin') || hasRole('rh');

  const handleSync = async () => {
    if (!projeto) return;
    setSyncing(true);
    try {
      const result = await syncProjectToOmie(projeto.id);
      if (result.success) {
        toast.success(result.message || 'Projeto sincronizado com Omie!');
        queryClient.invalidateQueries({ queryKey: ['projeto-detalhe', id] });
        queryClient.invalidateQueries({ queryKey: ['projetos'] });
      } else {
        toast.error(result.message || 'Erro ao sincronizar com Omie');
      }
    } catch {
      toast.error('Erro inesperado ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // --- Loading state ---
  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // --- Error state ---
  if (isError || !projeto) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="rounded-lg border bg-card p-8 text-center space-y-4">
            <h2 className="text-lg font-semibold">Projeto não encontrado</h2>
            <p className="text-muted-foreground">O projeto solicitado não existe ou foi removido.</p>
            <Button onClick={() => navigate('/projetos')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Projetos
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const isTemp = projeto.os?.startsWith('TEMP-');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projetos')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Projetos
            </Button>
            {!isTemp && (
              <code className="bg-primary/10 text-primary px-3 py-1 rounded text-sm font-bold">
                {projeto.os}
              </code>
            )}
            <h1 className="text-xl font-semibold">{projeto.nome}</h1>
            {getStatusBadge(projeto.status_projeto)}
            {getAprovacaoBadge(projeto.aprovacao_status)}
          </div>
          {canEdit && (
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList>
            <TabsTrigger value="geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="omie">Omie</TabsTrigger>
          </TabsList>

          {/* Aba Visão Geral */}
          <TabsContent value="geral" className="mt-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <DlItem label="Cliente">
                {projeto.empresas ? (
                  <span>
                    <code className="bg-muted px-2 py-0.5 rounded text-sm mr-2">{projeto.empresas.codigo}</code>
                    {projeto.empresas.empresa}
                    {projeto.empresas.unidade && <span className="text-muted-foreground ml-1">– {projeto.empresas.unidade}</span>}
                  </span>
                ) : '–'}
              </DlItem>

              <DlItem label="Tipo de Contrato">
                {getTipoContratoBadge(projeto.tipo_contrato)}
              </DlItem>

              <DlItem label="Valor do Contrato">
                {formatCurrency(projeto.valor_contrato)}
              </DlItem>

              <DlItem label="Horas Previstas">
                {projeto.horas_previstas ? `${projeto.horas_previstas}h` : '–'}
              </DlItem>

              <DlItem label="Início Planejado">
                {formatDate(projeto.data_inicio_planejada)}
              </DlItem>

              <DlItem label="Fim Planejado">
                {formatDate(projeto.data_fim_planejada)}
              </DlItem>

              <DlItem label="Início Real">
                {formatDate(projeto.data_inicio_real)}
              </DlItem>

              <DlItem label="Fim Real">
                {formatDate(projeto.data_fim_real)}
              </DlItem>

              <DlItem label="Risco de Escopo">
                {getRiscoBadge(projeto.risco_escopo)}
              </DlItem>

              <DlItem label="Risco Liberação Cliente">
                {getRiscoBadge(projeto.risco_liberacao_cliente)}
              </DlItem>

              {projeto.observacoes_riscos && (
                <div className="md:col-span-2 space-y-1">
                  <dt className="text-sm text-muted-foreground">Observações sobre Riscos</dt>
                  <dd className="text-sm whitespace-pre-wrap">{projeto.observacoes_riscos}</dd>
                </div>
              )}

              {projeto.descricao && (
                <div className="md:col-span-2 space-y-1">
                  <dt className="text-sm text-muted-foreground">Descrição / Observações</dt>
                  <dd className="text-sm whitespace-pre-wrap">{projeto.descricao}</dd>
                </div>
              )}

              {projeto.tem_aditivos && (
                <>
                  <DlItem label="Valor Aditivos Previsto">
                    {formatCurrency(projeto.valor_aditivos_previsto)}
                  </DlItem>
                  {projeto.observacoes_aditivos && (
                    <DlItem label="Observações Aditivos">
                      {projeto.observacoes_aditivos}
                    </DlItem>
                  )}
                </>
              )}
            </dl>
          </TabsContent>

          {/* Aba Omie */}
          <TabsContent value="omie" className="mt-6">
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Integração Omie</h3>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <DlItem label="Status de Sincronização">
                  {projeto.omie_sync_status === 'SYNCED' && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30 gap-1">
                      <Cloud className="h-3 w-3" />
                      Sincronizado
                    </Badge>
                  )}
                  {projeto.omie_sync_status === 'ERROR' && (
                    <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
                      <CloudOff className="h-3 w-3" />
                      Erro
                    </Badge>
                  )}
                  {(!projeto.omie_sync_status || projeto.omie_sync_status === 'PENDING') && (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                      <CloudOff className="h-3 w-3" />
                      Pendente
                    </Badge>
                  )}
                </DlItem>

                <DlItem label="Código Omie">
                  {projeto.omie_codigo ? String(projeto.omie_codigo) : '–'}
                </DlItem>

                <DlItem label="Código Interno (codInt)">
                  {projeto.omie_codint || '–'}
                </DlItem>

                <DlItem label="Última Sincronização">
                  {formatDateTime(projeto.omie_last_sync_at)}
                </DlItem>
              </dl>

              {/* Bloco de erro */}
              {projeto.omie_sync_status === 'ERROR' && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="text-sm font-medium text-destructive">Erro de sincronização</p>
                  <p className="text-sm text-muted-foreground">{projeto.omie_last_error || 'Erro desconhecido'}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Tentar novamente
                  </Button>
                </div>
              )}

              {/* Botão sync para projetos sem erro */}
              {canEdit && !isTemp && projeto.omie_sync_status !== 'ERROR' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar com Omie'}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ProjetoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projeto={projeto}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['projeto-detalhe', id] });
          queryClient.invalidateQueries({ queryKey: ['projetos'] });
        }}
      />
    </Layout>
  );
}
