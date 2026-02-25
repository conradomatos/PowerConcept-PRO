import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import {
  FileBarChart,
  Wrench,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TIPO_LABELS } from '@/components/frotas/ManutencaoForm';

// ===================== HELPERS =====================

function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { inicio: start.toISOString().slice(0, 10), fim: end.toISOString().slice(0, 10) };
}

function formatCurrency(v: number | null | undefined) {
  if (v === null || v === undefined) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatKm(km: number | null | undefined) {
  if (!km) return '-';
  return km.toLocaleString('pt-BR') + ' km';
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

function formatNumber(v: number | null | undefined, decimals = 2) {
  if (v === null || v === undefined) return '-';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ===================== SHARED FILTER HOOKS =====================

function useVeiculosFilter() {
  return useQuery({
    queryKey: ['veiculos-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('veiculos').select('id, placa, apelido').order('placa');
      if (error) throw error;
      return data as { id: string; placa: string; apelido: string | null }[];
    },
  });
}

function useProjetosFilter() {
  return useQuery({
    queryKey: ['projetos-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projetos').select('id, nome, os').order('nome');
      if (error) throw error;
      return data as { id: string; nome: string; os: string }[];
    },
  });
}

// ===================== TAB 1: KM POR PROJETO =====================

function TabKmPorProjeto() {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [filtroInicio, setFiltroInicio] = useState(defaultPeriod.inicio);
  const [filtroFim, setFiltroFim] = useState(defaultPeriod.fim);
  const [filtroProjeto, setFiltroProjeto] = useState('_todos');
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');
  const [precoKm, setPrecoKm] = useState(0);

  const { data: veiculos } = useVeiculosFilter();
  const { data: projetos } = useProjetosFilter();

  const { data: registrosKm } = useQuery({
    queryKey: ['rel-km-projeto', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase
        .from('registros_km')
        .select('veiculo_id, projeto_id, km_calculado, data_registro')
        .eq('tipo', 'volta');
      if (filtroInicio) q = q.gte('data_registro', filtroInicio);
      if (filtroFim) q = q.lte('data_registro', filtroFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; projeto_id: string | null; km_calculado: number | null; data_registro: string }[];
    },
  });

  const { data: despesas } = useQuery({
    queryKey: ['rel-despesas-projeto', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase
        .from('despesas_deslocamento')
        .select('veiculo_id, projeto_id, tipo, valor, data_despesa');
      if (filtroInicio) q = q.gte('data_despesa', filtroInicio);
      if (filtroFim) q = q.lte('data_despesa', filtroFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; projeto_id: string | null; tipo: string; valor: number; data_despesa: string | null }[];
    },
  });

  const projetoMap = useMemo(() => {
    const map: Record<string, { nome: string; os: string }> = {};
    projetos?.forEach((p) => { map[p.id] = { nome: p.nome, os: p.os }; });
    return map;
  }, [projetos]);

  const veiculoMap = useMemo(() => {
    const map: Record<string, { placa: string; apelido: string | null }> = {};
    veiculos?.forEach((v) => { map[v.id] = { placa: v.placa, apelido: v.apelido }; });
    return map;
  }, [veiculos]);

  type RowData = {
    projeto_id: string;
    projetoNome: string;
    veiculo_id: string;
    placa: string;
    apelido: string | null;
    kmTotal: number;
    pedagios: number;
    outrasDespesas: number;
    totalDeslocamento: number;
    valorKm: number | null;
    totalCobrar: number | null;
  };

  const rows = useMemo<RowData[]>(() => {
    const groupKey = (projetoId: string, veiculoId: string) => `${projetoId}::${veiculoId}`;
    const map = new Map<string, { projeto_id: string; veiculo_id: string; km: number; pedagios: number; outras: number }>();

    (registrosKm || []).forEach((r) => {
      if (!r.projeto_id) return;
      if (filtroProjeto !== '_todos' && r.projeto_id !== filtroProjeto) return;
      if (filtroVeiculo !== '_todos' && r.veiculo_id !== filtroVeiculo) return;
      const key = groupKey(r.projeto_id, r.veiculo_id);
      const existing = map.get(key) || { projeto_id: r.projeto_id, veiculo_id: r.veiculo_id, km: 0, pedagios: 0, outras: 0 };
      existing.km += r.km_calculado || 0;
      map.set(key, existing);
    });

    (despesas || []).forEach((d) => {
      if (!d.projeto_id) return;
      if (filtroProjeto !== '_todos' && d.projeto_id !== filtroProjeto) return;
      if (filtroVeiculo !== '_todos' && d.veiculo_id !== filtroVeiculo) return;
      const key = groupKey(d.projeto_id, d.veiculo_id);
      const existing = map.get(key) || { projeto_id: d.projeto_id, veiculo_id: d.veiculo_id, km: 0, pedagios: 0, outras: 0 };
      if (d.tipo === 'pedagio') {
        existing.pedagios += d.valor || 0;
      } else {
        existing.outras += d.valor || 0;
      }
      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((item) => {
        const proj = projetoMap[item.projeto_id];
        const veic = veiculoMap[item.veiculo_id];
        const totalDeslocamento = item.pedagios + item.outras;
        const valorKm = precoKm > 0 ? item.km * precoKm : null;
        const totalCobrar = valorKm !== null ? valorKm + item.pedagios + item.outras : null;

        return {
          projeto_id: item.projeto_id,
          projetoNome: proj ? `${proj.os} - ${proj.nome}` : item.projeto_id,
          veiculo_id: item.veiculo_id,
          placa: veic?.placa || '-',
          apelido: veic?.apelido || null,
          kmTotal: item.km,
          pedagios: item.pedagios,
          outrasDespesas: item.outras,
          totalDeslocamento,
          valorKm,
          totalCobrar,
        };
      })
      .sort((a, b) => a.projetoNome.localeCompare(b.projetoNome) || a.placa.localeCompare(b.placa));
  }, [registrosKm, despesas, filtroProjeto, filtroVeiculo, precoKm, projetoMap, veiculoMap]);

  // Group by projeto for subtotals
  const groupedByProjeto = useMemo(() => {
    const groups: { projetoNome: string; rows: RowData[]; subtotal: { km: number; pedagios: number; outras: number; total: number; valorKm: number | null; totalCobrar: number | null } }[] = [];
    const projetoOrder: string[] = [];
    const projetoMap2 = new Map<string, RowData[]>();

    rows.forEach((r) => {
      if (!projetoMap2.has(r.projetoNome)) {
        projetoOrder.push(r.projetoNome);
        projetoMap2.set(r.projetoNome, []);
      }
      projetoMap2.get(r.projetoNome)!.push(r);
    });

    projetoOrder.forEach((nome) => {
      const pRows = projetoMap2.get(nome)!;
      const sub = pRows.reduce(
        (acc, r) => ({
          km: acc.km + r.kmTotal,
          pedagios: acc.pedagios + r.pedagios,
          outras: acc.outras + r.outrasDespesas,
          total: acc.total + r.totalDeslocamento,
          valorKm: precoKm > 0 ? (acc.valorKm || 0) + (r.valorKm || 0) : null,
          totalCobrar: precoKm > 0 ? (acc.totalCobrar || 0) + (r.totalCobrar || 0) : null,
        }),
        { km: 0, pedagios: 0, outras: 0, total: 0, valorKm: precoKm > 0 ? 0 : null, totalCobrar: precoKm > 0 ? 0 : null },
      );
      groups.push({ projetoNome: nome, rows: pRows, subtotal: sub });
    });

    return groups;
  }, [rows, precoKm]);

  const totalGeral = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        km: acc.km + r.kmTotal,
        pedagios: acc.pedagios + r.pedagios,
        outras: acc.outras + r.outrasDespesas,
        total: acc.total + r.totalDeslocamento,
        valorKm: precoKm > 0 ? (acc.valorKm || 0) + (r.valorKm || 0) : null,
        totalCobrar: precoKm > 0 ? (acc.totalCobrar || 0) + (r.totalCobrar || 0) : null,
      }),
      { km: 0, pedagios: 0, outras: 0, total: 0, valorKm: precoKm > 0 ? 0 : null, totalCobrar: precoKm > 0 ? 0 : null },
    );
  }, [rows, precoKm]);

  const hasPrecoKm = precoKm > 0;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={filtroProjeto} onValueChange={setFiltroProjeto}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos</SelectItem>
                  {projetos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.os} - {p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos</SelectItem>
                  {veiculos?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.placa} {v.apelido ? `- ${v.apelido}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço por KM</Label>
              <CurrencyInput value={precoKm} onValueChange={setPrecoKm} placeholder="0,00" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">KM por Projeto — Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum dado encontrado no período</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">KM Total</TableHead>
                    <TableHead className="text-right">Pedágios R$</TableHead>
                    <TableHead className="text-right">Outras Desp. R$</TableHead>
                    <TableHead className="text-right">Total Desloc. R$</TableHead>
                    {hasPrecoKm && <TableHead className="text-right">Valor KM R$</TableHead>}
                    {hasPrecoKm && <TableHead className="text-right">Total a Cobrar R$</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedByProjeto.map((group) => (
                    <>
                      {group.rows.map((r, idx) => (
                        <TableRow key={`${r.projeto_id}-${r.veiculo_id}`}>
                          {idx === 0 && (
                            <TableCell rowSpan={group.rows.length} className="align-top font-medium text-sm">
                              {r.projetoNome}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex flex-col">
                              <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">{r.placa}</code>
                              {r.apelido && <span className="text-xs text-muted-foreground mt-0.5">{r.apelido}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatKm(r.kmTotal)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(r.pedagios)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(r.outrasDespesas)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(r.totalDeslocamento)}</TableCell>
                          {hasPrecoKm && <TableCell className="text-right font-mono text-sm">{formatCurrency(r.valorKm)}</TableCell>}
                          {hasPrecoKm && <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(r.totalCobrar)}</TableCell>}
                        </TableRow>
                      ))}
                      {/* Subtotal row */}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="text-sm font-semibold">Subtotal — {group.projetoNome}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatKm(group.subtotal.km)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(group.subtotal.pedagios)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(group.subtotal.outras)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(group.subtotal.total)}</TableCell>
                        {hasPrecoKm && <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(group.subtotal.valorKm)}</TableCell>}
                        {hasPrecoKm && <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(group.subtotal.totalCobrar)}</TableCell>}
                      </TableRow>
                    </>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Total Geral</TableCell>
                    <TableCell className="text-right font-mono">{formatKm(totalGeral.km)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalGeral.pedagios)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalGeral.outras)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalGeral.total)}</TableCell>
                    {hasPrecoKm && <TableCell className="text-right font-mono">{formatCurrency(totalGeral.valorKm)}</TableCell>}
                    {hasPrecoKm && <TableCell className="text-right font-mono">{formatCurrency(totalGeral.totalCobrar)}</TableCell>}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== TAB 2: CUSTO POR VEÍCULO =====================

function TabCustoPorVeiculo() {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [filtroInicio, setFiltroInicio] = useState(defaultPeriod.inicio);
  const [filtroFim, setFiltroFim] = useState(defaultPeriod.fim);
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');

  const { data: veiculosFilter } = useVeiculosFilter();

  const { data: veiculosFull } = useQuery({
    queryKey: ['veiculos-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, apelido, km_atual, status')
        .eq('status', 'ativo')
        .order('placa');
      if (error) throw error;
      return data as { id: string; placa: string; apelido: string | null; km_atual: number | null; status: string }[];
    },
  });

  const { data: abastecimentos } = useQuery({
    queryKey: ['rel-custos-abastecimentos', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase.from('abastecimentos').select('veiculo_id, valor_total, data_abastecimento');
      if (filtroInicio) q = q.gte('data_abastecimento', filtroInicio);
      if (filtroFim) q = q.lte('data_abastecimento', filtroFim + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; valor_total: number | null }[];
    },
  });

  const { data: manutencoes } = useQuery({
    queryKey: ['rel-custos-manutencoes', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase.from('manutencoes').select('veiculo_id, valor, data_realizada').eq('status', 'concluida');
      if (filtroInicio) q = q.gte('data_realizada', filtroInicio);
      if (filtroFim) q = q.lte('data_realizada', filtroFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; valor: number | null }[];
    },
  });

  const { data: registrosKm } = useQuery({
    queryKey: ['rel-custos-registros-km', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase.from('registros_km').select('veiculo_id, km_calculado, data_registro').eq('tipo', 'volta');
      if (filtroInicio) q = q.gte('data_registro', filtroInicio);
      if (filtroFim) q = q.lte('data_registro', filtroFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; km_calculado: number | null }[];
    },
  });

  const { data: despesas } = useQuery({
    queryKey: ['rel-custos-despesas', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase.from('despesas_deslocamento').select('veiculo_id, valor, data_despesa');
      if (filtroInicio) q = q.gte('data_despesa', filtroInicio);
      if (filtroFim) q = q.lte('data_despesa', filtroFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; valor: number }[];
    },
  });

  const { data: depreciacaoConfig } = useQuery({
    queryKey: ['depreciacao-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('depreciacao_config').select('veiculo_id, depreciacao_mensal');
      if (error) throw error;
      return data as { veiculo_id: string; depreciacao_mensal: number | null }[];
    },
  });

  const mesesPeriodo = useMemo(() => {
    if (!filtroInicio || !filtroFim) return 1;
    const diffMs = new Date(filtroFim).getTime() - new Date(filtroInicio).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;
    return Math.max(diffDays / 30, 0.1);
  }, [filtroInicio, filtroFim]);

  const custos = useMemo(() => {
    if (!veiculosFull) return [];
    return veiculosFull
      .map((v) => {
        const combustivel = (abastecimentos || []).filter((a) => a.veiculo_id === v.id).reduce((s, a) => s + (a.valor_total || 0), 0);
        const manutencao = (manutencoes || []).filter((m) => m.veiculo_id === v.id).reduce((s, m) => s + (m.valor || 0), 0);
        const deslocamento = (despesas || []).filter((d) => d.veiculo_id === v.id).reduce((s, d) => s + (d.valor || 0), 0);
        const kmRodado = (registrosKm || []).filter((r) => r.veiculo_id === v.id).reduce((s, r) => s + (r.km_calculado || 0), 0);
        const dep = (depreciacaoConfig || []).find((d) => d.veiculo_id === v.id);
        const depreciacao = dep?.depreciacao_mensal ? Math.round(dep.depreciacao_mensal * mesesPeriodo * 100) / 100 : 0;
        const custoTotal = combustivel + manutencao + deslocamento + depreciacao;
        const custoKm = kmRodado > 0 ? custoTotal / kmRodado : null;
        return { ...v, kmRodado, combustivel, manutencao, deslocamento, depreciacao, custoTotal, custoKm };
      })
      .filter((c) => filtroVeiculo === '_todos' || c.id === filtroVeiculo)
      .sort((a, b) => b.custoTotal - a.custoTotal);
  }, [veiculosFull, abastecimentos, manutencoes, despesas, registrosKm, depreciacaoConfig, mesesPeriodo, filtroVeiculo]);

  const totais = useMemo(() => custos.reduce(
    (acc, c) => ({ kmRodado: acc.kmRodado + c.kmRodado, combustivel: acc.combustivel + c.combustivel, manutencao: acc.manutencao + c.manutencao, deslocamento: acc.deslocamento + c.deslocamento, depreciacao: acc.depreciacao + c.depreciacao, custoTotal: acc.custoTotal + c.custoTotal }),
    { kmRodado: 0, combustivel: 0, manutencao: 0, deslocamento: 0, depreciacao: 0, custoTotal: 0 },
  ), [custos]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos</SelectItem>
                  {veiculosFilter?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.placa} {v.apelido ? `- ${v.apelido}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Custo por Veículo</CardTitle></CardHeader>
        <CardContent>
          {custos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum dado encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">KM Rodado</TableHead>
                    <TableHead className="text-right">Combustível</TableHead>
                    <TableHead className="text-right">Manutenção</TableHead>
                    <TableHead className="text-right">Deslocamento</TableHead>
                    <TableHead className="text-right">Depreciação</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Custo/KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {custos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">{c.placa}</code>
                          {c.apelido && <span className="text-xs text-muted-foreground mt-0.5">{c.apelido}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatKm(c.kmRodado)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.combustivel)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.manutencao)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.deslocamento)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.depreciacao)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(c.custoTotal)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{c.custoKm !== null ? formatCurrency(c.custoKm) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatKm(totais.kmRodado)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totais.combustivel)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totais.manutencao)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totais.deslocamento)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totais.depreciacao)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totais.custoTotal)}</TableCell>
                    <TableCell className="text-right font-mono">{totais.kmRodado > 0 ? formatCurrency(totais.custoTotal / totais.kmRodado) : '-'}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== TAB 3: EFICIÊNCIA DE COMBUSTÍVEL =====================

function TabEficienciaCombustivel() {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [filtroInicio, setFiltroInicio] = useState(defaultPeriod.inicio);
  const [filtroFim, setFiltroFim] = useState(defaultPeriod.fim);
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');

  const { data: veiculosFilter } = useVeiculosFilter();

  const { data: veiculosFull } = useQuery({
    queryKey: ['veiculos-eficiencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, apelido, media_km_litro_ref, status')
        .eq('status', 'ativo')
        .order('placa');
      if (error) throw error;
      return data as { id: string; placa: string; apelido: string | null; media_km_litro_ref: number | null; status: string }[];
    },
  });

  const { data: abastecimentos } = useQuery({
    queryKey: ['rel-eficiencia-abastecimentos', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase.from('abastecimentos').select('veiculo_id, litros, valor_total, km_por_litro, data_abastecimento');
      if (filtroInicio) q = q.gte('data_abastecimento', filtroInicio);
      if (filtroFim) q = q.lte('data_abastecimento', filtroFim + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      return data as { veiculo_id: string; litros: number | null; valor_total: number | null; km_por_litro: number | null }[];
    },
  });

  type EficienciaRow = {
    id: string;
    placa: string;
    apelido: string | null;
    totalLitros: number;
    totalValor: number;
    mediaPrecoL: number | null;
    mediaKmL: number | null;
    kmLRef: number | null;
    desvioPct: number | null;
  };

  const rows = useMemo<EficienciaRow[]>(() => {
    if (!veiculosFull) return [];

    return veiculosFull
      .filter((v) => filtroVeiculo === '_todos' || v.id === filtroVeiculo)
      .map((v) => {
        const abs = (abastecimentos || []).filter((a) => a.veiculo_id === v.id);
        const totalLitros = abs.reduce((s, a) => s + (a.litros || 0), 0);
        const totalValor = abs.reduce((s, a) => s + (a.valor_total || 0), 0);
        const mediaPrecoL = totalLitros > 0 ? totalValor / totalLitros : null;
        const comKmL = abs.filter((a) => a.km_por_litro && a.km_por_litro > 0);
        const mediaKmL = comKmL.length > 0 ? comKmL.reduce((s, a) => s + (a.km_por_litro || 0), 0) / comKmL.length : null;
        const kmLRef = v.media_km_litro_ref;
        const desvioPct = mediaKmL !== null && kmLRef && kmLRef > 0 ? ((mediaKmL - kmLRef) / kmLRef) * 100 : null;

        return {
          id: v.id,
          placa: v.placa,
          apelido: v.apelido,
          totalLitros,
          totalValor,
          mediaPrecoL,
          mediaKmL,
          kmLRef,
          desvioPct,
        };
      })
      .filter((r) => r.totalLitros > 0)
      .sort((a, b) => b.totalValor - a.totalValor);
  }, [veiculosFull, abastecimentos, filtroVeiculo]);

  const getDesvioBadge = (desvio: number | null) => {
    if (desvio === null) return <Badge variant="outline">-</Badge>;
    const label = `${desvio >= 0 ? '+' : ''}${formatNumber(desvio, 1)}%`;
    if (desvio >= -10) return <Badge variant="default" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">{label}</Badge>;
    if (desvio >= -20) return <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{label}</Badge>;
    return <Badge variant="default" className="bg-red-500/20 text-red-500 border-red-500/30">{label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos</SelectItem>
                  {veiculosFilter?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.placa} {v.apelido ? `- ${v.apelido}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Eficiência de Combustível</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum dado encontrado no período</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">Total Litros</TableHead>
                    <TableHead className="text-right">Total R$</TableHead>
                    <TableHead className="text-right">Média Preço/L</TableHead>
                    <TableHead className="text-right">Média KM/L</TableHead>
                    <TableHead className="text-right">KM/L Referência</TableHead>
                    <TableHead className="text-center">Desvio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">{r.placa}</code>
                          {r.apelido && <span className="text-xs text-muted-foreground mt-0.5">{r.apelido}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatNumber(r.totalLitros)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(r.totalValor)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.mediaPrecoL !== null ? `R$ ${formatNumber(r.mediaPrecoL, 3)}` : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.mediaKmL !== null ? formatNumber(r.mediaKmL) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.kmLRef !== null ? formatNumber(r.kmLRef) : '-'}</TableCell>
                      <TableCell className="text-center">{getDesvioBadge(r.desvioPct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== TAB 4: HISTÓRICO DE MANUTENÇÃO =====================

function TabHistoricoManutencao() {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [filtroInicio, setFiltroInicio] = useState(defaultPeriod.inicio);
  const [filtroFim, setFiltroFim] = useState(defaultPeriod.fim);
  const [filtroVeiculo, setFiltroVeiculo] = useState('_todos');
  const [filtroTipo, setFiltroTipo] = useState('_todos');

  const { data: veiculosFilter } = useVeiculosFilter();

  const { data: manutencoes, isLoading } = useQuery({
    queryKey: ['rel-historico-manut', filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase
        .from('manutencoes')
        .select(`
          id, veiculo_id, tipo, descricao, km_realizado, valor, fornecedor, data_realizada,
          veiculos:veiculo_id (placa, apelido)
        `)
        .eq('status', 'concluida')
        .order('data_realizada', { ascending: false });
      if (filtroInicio) q = q.gte('data_realizada', filtroInicio);
      if (filtroFim) q = q.lte('data_realizada', filtroFim);
      const { data, error } = await q;
      if (error) throw error;
      return data as {
        id: string; veiculo_id: string; tipo: string; descricao: string | null;
        km_realizado: number | null; valor: number | null; fornecedor: string | null;
        data_realizada: string | null;
        veiculos: { placa: string; apelido: string | null } | null;
      }[];
    },
  });

  const filtered = useMemo(() => {
    if (!manutencoes) return [];
    return manutencoes.filter((m) => {
      if (filtroVeiculo !== '_todos' && m.veiculo_id !== filtroVeiculo) return false;
      if (filtroTipo !== '_todos' && m.tipo !== filtroTipo) return false;
      return true;
    });
  }, [manutencoes, filtroVeiculo, filtroTipo]);

  const resumo = useMemo(() => {
    const totalGasto = filtered.reduce((s, m) => s + (m.valor || 0), 0);
    const qtd = filtered.length;
    const media = qtd > 0 ? totalGasto / qtd : 0;
    return { totalGasto, qtd, media };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.totalGasto)}</div>
            <p className="text-xs text-muted-foreground">manutenções concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.qtd}</div>
            <p className="text-xs text-muted-foreground">manutenções no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Manutenção</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.media)}</div>
            <p className="text-xs text-muted-foreground">valor médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos</SelectItem>
                  {veiculosFilter?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.placa} {v.apelido ? `- ${v.apelido}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos</SelectItem>
                  {Object.entries(TIPO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{filtered.length} manutenção{filtered.length !== 1 ? 'ões' : ''} concluída{filtered.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma manutenção concluída encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Realizada</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">KM</TableHead>
                    <TableHead className="text-right">Valor R$</TableHead>
                    <TableHead>Fornecedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(m.data_realizada)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit">{m.veiculos?.placa || '-'}</code>
                          {m.veiculos?.apelido && <span className="text-xs text-muted-foreground mt-0.5">{m.veiculos.apelido}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{TIPO_LABELS[m.tipo] || m.tipo}</TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate" title={m.descricao || ''}>{m.descricao || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatKm(m.km_realizado)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(m.valor)}</TableCell>
                      <TableCell className="text-sm">{m.fornecedor || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== MAIN PAGE =====================

export default function FrotasRelatorios() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6" />
            Relatórios da Frota
          </h1>
          <p className="text-muted-foreground">Relatórios prontos para análise e faturamento</p>
        </div>

        <Tabs defaultValue="km-projeto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="km-projeto">KM por Projeto</TabsTrigger>
            <TabsTrigger value="custo-veiculo">Custo por Veículo</TabsTrigger>
            <TabsTrigger value="eficiencia">Eficiência Combustível</TabsTrigger>
            <TabsTrigger value="historico">Histórico Manutenção</TabsTrigger>
          </TabsList>

          <TabsContent value="km-projeto">
            <TabKmPorProjeto />
          </TabsContent>

          <TabsContent value="custo-veiculo">
            <TabCustoPorVeiculo />
          </TabsContent>

          <TabsContent value="eficiencia">
            <TabEficienciaCombustivel />
          </TabsContent>

          <TabsContent value="historico">
            <TabHistoricoManutencao />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
