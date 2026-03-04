import { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RevisionSelector } from '@/components/orcamentos/RevisionSelector';
import { StatusBadge } from '@/components/orcamentos/StatusBadge';
import { LockBanner } from '@/components/orcamentos/LockBanner';
import { useRevisions } from '@/hooks/orcamentos/useRevisions';
import { useRevisionLock } from '@/hooks/orcamentos/useRevisionLock';
import { useBudgetSummary } from '@/hooks/orcamentos/useBudgetSummary';
import { useCreateProjectFromBudget } from '@/hooks/orcamentos/useCreateProjectFromBudget';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  FolderPlus,
  FileText,
  Building2,
  MapPin,
} from 'lucide-react';
import type { BudgetRevision, RevisionStatus } from '@/lib/orcamentos/types';

export default function OrcamentoDetail() {
  const { id: budgetId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isGodMode, loading: authLoading } = useAuth();

  const [selectedRevisionId, setSelectedRevisionId] = useState<string | undefined>();

  // Fetch budget details - hook must be called unconditionally
  const { data: budget, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          cliente:empresas!budgets_cliente_id_fkey(id, empresa, codigo)
        `)
        .eq('id', budgetId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });

  const { revisions, isLoading: revisionsLoading, createRevision, sendRevision, approveRevision, rejectRevision } = useRevisions(budgetId);

  // Handle revision selection from querystring
  useEffect(() => {
    if (revisions.length === 0) return;
    
    const revFromUrl = searchParams.get('rev');
    
    if (revFromUrl && revisions.find(r => r.id === revFromUrl)) {
      // URL has valid revision - use it
      if (selectedRevisionId !== revFromUrl) {
        setSelectedRevisionId(revFromUrl);
      }
    } else if (!selectedRevisionId) {
      // No revision selected - use latest and update URL
      const latestRevision = revisions[0];
      setSelectedRevisionId(latestRevision.id);
      setSearchParams({ rev: latestRevision.id }, { replace: true });
    }
  }, [revisions, searchParams, selectedRevisionId, setSearchParams]);

  const selectedRevision = revisions.find((r) => r.id === selectedRevisionId) as BudgetRevision | undefined;
  const lockState = useRevisionLock(selectedRevision || null);
  const { summary } = useBudgetSummary(selectedRevision?.id);
  const { createProject } = useCreateProjectFromBudget();

  const canManage = isGodMode();
  const canApprove = isGodMode();

  // Handle revision change from dropdown
  const handleRevisionChange = (id: string) => {
    setSelectedRevisionId(id);
    setSearchParams({ rev: id });
  };

  const handleCreateNewRevision = async () => {
    const newRevision = await createRevision.mutateAsync(selectedRevisionId);
    if (newRevision) {
      setSelectedRevisionId(newRevision.id);
      setSearchParams({ rev: newRevision.id });
    }
  };

  const handleSend = async () => {
    if (selectedRevisionId) {
      await sendRevision.mutateAsync(selectedRevisionId);
    }
  };

  const handleApprove = async () => {
    if (selectedRevisionId) {
      await approveRevision.mutateAsync(selectedRevisionId);
    }
  };

  const handleReject = async () => {
    if (selectedRevisionId) {
      await rejectRevision.mutateAsync(selectedRevisionId);
    }
  };

  const handleCreateProject = async () => {
    if (!budget || !selectedRevision || !summary) return;
    const projeto = await createProject.mutateAsync({
      budget: {
        id: budget.id,
        cliente_id: budget.cliente_id,
        obra_nome: budget.obra_nome,
        local: budget.local ?? undefined,
      },
      revision: selectedRevision,
      summary,
    });
    if (projeto) {
      navigate(`/projetos`);
    }
  };

  // Only super_admin can access this page - check after all hooks
  if (!authLoading && !isGodMode()) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Esta página é exclusiva para administradores master.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  if (budgetLoading || revisionsLoading || authLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!budget) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Orçamento não encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/orcamentos')}>
            Voltar para lista
          </Button>
        </div>
      </Layout>
    );
  }

  // Check if we're on a sub-route
  const _isSubRoute = location.pathname !== `/orcamentos/${budgetId}`; void _isSubRoute;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{budget.budget_number}</h1>
              {selectedRevision && (
                <StatusBadge status={selectedRevision.status as RevisionStatus} />
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {budget.cliente?.empresa || 'Cliente não definido'}
              </span>
              {budget.local && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {budget.local}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Budget Info & Actions Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Obra</p>
                  <p className="font-medium">{budget.obra_nome}</p>
                </div>
                <Separator orientation="vertical" className="h-10 hidden sm:block" />
                <div>
                  <p className="text-sm text-muted-foreground">Revisão</p>
                  <RevisionSelector
                    revisions={revisions}
                    selectedRevisionId={selectedRevisionId}
                    onSelect={handleRevisionChange}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canManage && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateNewRevision}
                      disabled={createRevision.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Revisão
                    </Button>

                    {lockState.canSend && (
                      <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={sendRevision.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Enviar
                      </Button>
                    )}
                  </>
                )}

                {canApprove && lockState.canApprove && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleApprove}
                      disabled={approveRevision.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleReject}
                      disabled={rejectRevision.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reprovar
                    </Button>
                  </>
                )}

                {lockState.canCreateProject && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleCreateProject}
                    disabled={createProject.isPending || !summary}
                  >
                    <FolderPlus className="h-4 w-4 mr-1" />
                    {createProject.isPending ? 'Criando...' : 'Criar Projeto'}
                  </Button>
                )}

                <Button size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lock Banner */}
        {lockState.isLocked && lockState.lockReason && (
          <LockBanner
            message={lockState.lockReason}
            onCreateNewRevision={handleCreateNewRevision}
            showCreateButton={canManage}
          />
        )}

        {/* Content Area - Always show Outlet for nested routes */}
        <Outlet context={{ budget, selectedRevision, lockState }} />
      </div>
    </Layout>
  );
}
