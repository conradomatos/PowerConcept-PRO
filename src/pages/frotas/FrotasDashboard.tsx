import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Truck,
  GanttChart,
  DollarSign,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Fuel,
  Receipt,
  Car,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TIPO_LABELS } from '@/components/frotas/ManutencaoForm';

// ===================== HELPERS =====================

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatKm(km: number) {
  return km.toLocaleString('pt-BR') + ' km';
}

function formatNumber(v: number, decimals = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

// ===================== QUERIES =====================

function useVeiculosCount() {
  return useQuery({
    queryKey: ['dashboard-veiculos-count'],
    queryFn: async () => {
      const { count: ativos, error: e1 } = await supabase
        .from('veiculos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');
      if (e1) throw e1;

      const { count: total, error: e2 } = await supabase
        .from('veiculos')
        .select('*', { count: 'exact', head: true });
      if (e2) throw e2;

      return { ativos: ativos || 0, total: total || 0 };
    },
  });
}

function useKmMes() {
  const { start, end } = getMonthRange();
  return useQuery({
    queryKey: ['dashboard-km-mes', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registros_km')
        .select('km_calculado')
        .eq('tipo', 'volta')
        .gte('data_registro', start)
        .lte('data_registro', end);
      if (error) throw error;
      const totalKm = (data || []).reduce((s, r) => s + (r.km_calculado || 0), 0);
      return { totalKm, viagens: data?.length || 0 };
    },
  });
}

function useCustoMensal() {
  const { start, end } = getMonthRange();
  return useQuery({
    queryKey: ['dashboard-custo-mensal', start, end],
    queryFn: async () => {
      const [abastRes, manutRes, despRes] = await Promise.all([
        supabase
          .from('abastecimentos')
          .select('valor_total')
          .gte('data_abastecimento', start)
          .lte('data_abastecimento', end + 'T23:59:59'),
        supabase
          .from('manutencoes')
          .select('valor')
          .eq('status', 'concluida')
          .gte('data_realizada', start)
          .lte('data_realizada', end),
        supabase
          .from('despesas_deslocamento')
          .select('valor')
          .gte('data_despesa', start)
          .lte('data_despesa', end),
      ]);
      if (abastRes.error) throw abastRes.error;
      if (manutRes.error) throw manutRes.error;
      if (despRes.error) throw despRes.error;

      const combustivel = (abastRes.data || []).reduce((s, a) => s + (a.valor_total || 0), 0);
      const manutencao = (manutRes.data || []).reduce((s, m) => s + (m.valor || 0), 0);
      const outros = (despRes.data || []).reduce((s, d) => s + (d.valor || 0), 0);
      return { combustivel, manutencao, outros, total: combustivel + manutencao + outros };
    },
  });
}

function useManutencoesPendentes() {
  return useQuery({
    queryKey: ['dashboard-manut-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manutencoes')
        .select(`
          id, tipo, status, km_previsto, descricao,
          veiculos:veiculo_id (id, placa, apelido, km_atual)
        `)
        .in('status', ['atencao', 'vencida', 'critica'])
        .order('status', { ascending: true });
      if (error) throw error;

      type AlertRow = {
        id: string;
        tipo: string;
        status: string;
        km_previsto: number | null;
        descricao: string | null;
        veiculos: { id: string; placa: string; apelido: string | null; km_atual: number | null } | null;
      };

      const alertas = (data || []) as AlertRow[];
      const atencao = alertas.filter((a) => a.status === 'atencao').length;
      const vencida = alertas.filter((a) => a.status === 'vencida').length;
      const critica = alertas.filter((a) => a.status === 'critica').length;
      const total = atencao + vencida + critica;

      // Sort by severity: critica first, then vencida, then atencao
      const severityOrder: Record<string, number> = { critica: 0, vencida: 1, atencao: 2 };
      alertas.sort((a, b) => (severityOrder[a.status] ?? 3) - (severityOrder[b.status] ?? 3));

      return { alertas, atencao, vencida, critica, total };
    },
  });
}

function useUltimasAtividades() {
  return useQuery({
    queryKey: ['dashboard-ultimas-atividades'],
    queryFn: async () => {
      const [kmRes, abastRes, manutRes, despRes] = await Promise.all([
        supabase
          .from('registros_km')
          .select('id, created_at, km_calculado, tipo, veiculos:veiculo_id (placa, apelido)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('abastecimentos')
          .select('id, created_at, litros, valor_total, veiculos:veiculo_id (placa, apelido)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('manutencoes')
          .select('id, created_at, tipo, status, veiculos:veiculo_id (placa, apelido)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('despesas_deslocamento')
          .select('id, created_at, tipo, valor, veiculos:veiculo_id (placa, apelido)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      type ActivityItem = {
        id: string;
        created_at: string;
        category: 'km' | 'abastecimento' | 'manutencao' | 'despesa';
        description: string;
        placa: string;
        apelido: string | null;
      };

      const items: ActivityItem[] = [];

      (kmRes.data || []).forEach((r: any) => {
        items.push({
          id: `km-${r.id}`,
          created_at: r.created_at,
          category: 'km',
          description: `Registro KM ${r.tipo === 'volta' ? '(volta)' : '(ida)'} — ${r.km_calculado ? formatKm(r.km_calculado) : ''}`,
          placa: r.veiculos?.placa || '-',
          apelido: r.veiculos?.apelido || null,
        });
      });

      (abastRes.data || []).forEach((r: any) => {
        items.push({
          id: `abast-${r.id}`,
          created_at: r.created_at,
          category: 'abastecimento',
          description: `Abastecimento — ${r.litros ? formatNumber(r.litros) + 'L' : ''} ${r.valor_total ? formatCurrency(r.valor_total) : ''}`,
          placa: r.veiculos?.placa || '-',
          apelido: r.veiculos?.apelido || null,
        });
      });

      (manutRes.data || []).forEach((r: any) => {
        items.push({
          id: `manut-${r.id}`,
          created_at: r.created_at,
          category: 'manutencao',
          description: `Manutenção ${TIPO_LABELS[r.tipo] || r.tipo} — ${r.status}`,
          placa: r.veiculos?.placa || '-',
          apelido: r.veiculos?.apelido || null,
        });
      });

      (despRes.data || []).forEach((r: any) => {
        items.push({
          id: `desp-${r.id}`,
          created_at: r.created_at,
          category: 'despesa',
          description: `Despesa ${r.tipo || ''} — ${r.valor ? formatCurrency(r.valor) : ''}`,
          placa: r.veiculos?.placa || '-',
          apelido: r.veiculos?.apelido || null,
        });
      });

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return items.slice(0, 10);
    },
  });
}

function useEficienciaCombustivel() {
  const { start, end } = getMonthRange();
  return useQuery({
    queryKey: ['dashboard-eficiencia', start, end],
    queryFn: async () => {
      const [abastRes, veicRes] = await Promise.all([
        supabase
          .from('abastecimentos')
          .select('veiculo_id, km_por_litro')
          .gte('data_abastecimento', start)
          .lte('data_abastecimento', end + 'T23:59:59'),
        supabase
          .from('veiculos')
          .select('id, placa, apelido, media_km_litro_ref')
          .eq('status', 'ativo'),
      ]);
      if (abastRes.error) throw abastRes.error;
      if (veicRes.error) throw veicRes.error;

      const veicMap = new Map<string, { placa: string; apelido: string | null; ref: number | null }>();
      (veicRes.data || []).forEach((v: any) => {
        veicMap.set(v.id, { placa: v.placa, apelido: v.apelido, ref: v.media_km_litro_ref });
      });

      // Group abastecimentos by veiculo, calc avg km_por_litro
      const grouped = new Map<string, number[]>();
      (abastRes.data || []).forEach((a: any) => {
        if (!a.km_por_litro || a.km_por_litro <= 0) return;
        const arr = grouped.get(a.veiculo_id) || [];
        arr.push(a.km_por_litro);
        grouped.set(a.veiculo_id, arr);
      });

      type EfRow = {
        veiculo_id: string;
        placa: string;
        apelido: string | null;
        mediaKmL: number;
        refKmL: number | null;
        desvioPct: number | null;
      };

      const rows: EfRow[] = [];
      grouped.forEach((vals, veiculoId) => {
        const veic = veicMap.get(veiculoId);
        if (!veic) return;
        const media = vals.reduce((s, v) => s + v, 0) / vals.length;
        const desvio = veic.ref && veic.ref > 0 ? ((media - veic.ref) / veic.ref) * 100 : null;
        rows.push({
          veiculo_id: veiculoId,
          placa: veic.placa,
          apelido: veic.apelido,
          mediaKmL: media,
          refKmL: veic.ref,
          desvioPct: desvio,
        });
      });

      // Sort by desvio ascending (worst first)
      rows.sort((a, b) => (a.desvioPct ?? 0) - (b.desvioPct ?? 0));
      return rows.slice(0, 5);
    },
  });
}

// ===================== COMPONENTS =====================

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'km': return <Car className="h-4 w-4 text-blue-500" />;
    case 'abastecimento': return <Fuel className="h-4 w-4 text-green-500" />;
    case 'manutencao': return <Wrench className="h-4 w-4 text-orange-500" />;
    case 'despesa': return <Receipt className="h-4 w-4 text-purple-500" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'atencao':
      return <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Atenção</Badge>;
    case 'vencida':
      return <Badge variant="default" className="bg-orange-500/20 text-orange-500 border-orange-500/30">Vencida</Badge>;
    case 'critica':
      return <Badge variant="default" className="bg-red-500/20 text-red-500 border-red-500/30">Crítica</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getDesvioBadge(desvio: number | null) {
  if (desvio === null) return <Badge variant="outline">-</Badge>;
  const label = `${desvio >= 0 ? '+' : ''}${formatNumber(desvio, 1)}%`;
  if (desvio >= -10) return <Badge variant="default" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">{label}</Badge>;
  if (desvio >= -20) return <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{label}</Badge>;
  return <Badge variant="default" className="bg-red-500/20 text-red-500 border-red-500/30">{label}</Badge>;
}

// ===================== MAIN PAGE =====================

export default function FrotasDashboard() {
  const navigate = useNavigate();
  const { user, loading, hasAnyRole } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const { data: veiculosCount, isLoading: loadingVeiculos } = useVeiculosCount();
  const { data: kmMes, isLoading: loadingKm } = useKmMes();
  const { data: custoMensal, isLoading: loadingCusto } = useCustoMensal();
  const { data: manutPendentes, isLoading: loadingManut } = useManutencoesPendentes();
  const { data: atividades, isLoading: loadingAtividades } = useUltimasAtividades();
  const { data: eficiencia, isLoading: loadingEficiencia } = useEficienciaCombustivel();

  const manutCardColor = useMemo(() => {
    if (!manutPendentes) return '';
    if (manutPendentes.total === 0) return 'text-emerald-500';
    if (manutPendentes.total <= 2) return 'text-yellow-500';
    return 'text-red-500';
  }, [manutPendentes]);

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
            Sua conta foi criada, mas você ainda não tem permissão para acessar o sistema.
            Entre em contato com um administrador para liberar seu acesso.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Gestão de Frotas</h2>
          <p className="text-muted-foreground">Visão geral da frota de veículos</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {/* Card 1: Total Veículos */}
          {loadingVeiculos ? (
            <CardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Veículos</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{veiculosCount?.ativos ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {veiculosCount?.ativos} ativos de {veiculosCount?.total} total
                </p>
              </CardContent>
            </Card>
          )}

          {/* Card 2: KM no Mês */}
          {loadingKm ? (
            <CardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">KM no Mês</CardTitle>
                <GanttChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatKm(kmMes?.totalKm ?? 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {kmMes?.viagens ?? 0} viagens registradas
                </p>
              </CardContent>
            </Card>
          )}

          {/* Card 3: Custo Mensal */}
          {loadingCusto ? (
            <CardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(custoMensal?.total ?? 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Combustível {formatCurrency(custoMensal?.combustivel ?? 0)} | Manutenção {formatCurrency(custoMensal?.manutencao ?? 0)} | Outros {formatCurrency(custoMensal?.outros ?? 0)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Card 4: Manutenções Pendentes */}
          {loadingManut ? (
            <CardSkeleton />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manutenções Pendentes</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${manutCardColor}`}>
                  {manutPendentes?.total ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {manutPendentes?.atencao ?? 0} atenção | {manutPendentes?.vencida ?? 0} vencidas | {manutPendentes?.critica ?? 0} críticas
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Alertas Ativos + Eficiência side by side on lg */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Alertas Ativos */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingManut ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !manutPendentes?.alertas?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">Nenhum alerta ativo</p>
                  <p className="text-xs">Todos os veículos estão em dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {manutPendentes.alertas.map((alerta) => (
                    <div key={alerta.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="mt-0.5">
                        {alerta.status === 'critica' && <div className="h-3 w-3 rounded-full bg-red-500" />}
                        {alerta.status === 'vencida' && <div className="h-3 w-3 rounded-full bg-orange-500" />}
                        {alerta.status === 'atencao' && <div className="h-3 w-3 rounded-full bg-yellow-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">
                            {alerta.veiculos?.placa || '-'}
                          </code>
                          {alerta.veiculos?.apelido && (
                            <span className="text-xs text-muted-foreground">{alerta.veiculos.apelido}</span>
                          )}
                          {getStatusBadge(alerta.status)}
                        </div>
                        <p className="text-sm mt-1">
                          {TIPO_LABELS[alerta.tipo] || alerta.tipo}
                          {alerta.descricao && <span className="text-muted-foreground"> — {alerta.descricao}</span>}
                        </p>
                        {alerta.km_previsto && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            KM previsto: {formatKm(alerta.km_previsto)}
                            {alerta.veiculos?.km_atual != null && (
                              <> | KM atual: {formatKm(alerta.veiculos.km_atual)}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Veículos com Menor Eficiência */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Menor Eficiência
              </CardTitle>
              <p className="text-xs text-muted-foreground">Top 5 piores KM/L no mês</p>
            </CardHeader>
            <CardContent>
              {loadingEficiencia ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : !eficiencia?.length ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum dado de abastecimento no mês
                </div>
              ) : (
                <div className="space-y-3">
                  {eficiencia.map((row) => (
                    <div key={row.veiculo_id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-bold">
                            {row.placa}
                          </code>
                          {row.apelido && (
                            <span className="text-xs text-muted-foreground truncate">{row.apelido}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatNumber(row.mediaKmL)} KM/L
                          {row.refKmL !== null && <> | Ref: {formatNumber(row.refKmL)}</>}
                        </p>
                      </div>
                      {getDesvioBadge(row.desvioPct)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Últimas Atividades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Últimas Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAtividades ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !atividades?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma atividade registrada
              </div>
            ) : (
              <div className="space-y-1">
                {atividades.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{item.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {item.placa}
                        </code>
                        {item.apelido && (
                          <span className="text-xs text-muted-foreground">{item.apelido}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
