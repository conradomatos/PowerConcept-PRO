import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useMapeamentos, useBatchUpdateMapeamento, useMapeamentoStats, suggestContaDRE } from '@/hooks/useCategoriaMapeamento';
import { useCategoriasAtivas } from '@/hooks/useCategorias';
import { CONTAS_DRE } from '@/calculations/conciliacao/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Save, Wand2, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type FilterType = 'todos' | 'mapeados' | 'nao_mapeados';

// Fallback para AP baseado no prefixo (mesma lógica do useDREData)
// @ts-ignore TS6133 - kept for future use
function fallbackAP(cat: string): string {
  if (cat.startsWith('1.')) return '(-) - Custo dos Serviços Prestados';
  if (cat.startsWith('2.01') || cat.startsWith('2.02')) return '(-) - Despesas com Pessoal';
  if (cat.startsWith('2.05')) return '(-) - Despesas de Vendas e Marketing';
  if (cat.startsWith('2.03') || cat.startsWith('2.04') || cat.startsWith('2.06')) return '(-) - Despesas Administrativas';
  if (cat.startsWith('3.')) return '(-) - Despesas Financeiras';
  return '(-) - Despesas Administrativas';
}

function useMapeamentoTipos() {
  return useQuery({
    queryKey: ['omie-categoria-tipos'],
    queryFn: async () => {
      const [{ data: arData }, { data: apData }] = await Promise.all([
        supabase.from('omie_contas_receber').select('categoria').not('categoria', 'is', null),
        supabase.from('omie_contas_pagar').select('categoria').not('categoria', 'is', null),
      ]);

      const tipos = new Map<string, Set<'AR' | 'AP'>>();

      arData?.forEach(item => {
        if (!item.categoria) return;
        const set = tipos.get(item.categoria) || new Set();
        set.add('AR');
        tipos.set(item.categoria, set);
      });

      apData?.forEach(item => {
        if (!item.categoria) return;
        const set = tipos.get(item.categoria) || new Set();
        set.add('AP');
        tipos.set(item.categoria, set);
      });

      return tipos;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default function MapeamentoCategorias() {
  const { data: mapeamentos, isLoading } = useMapeamentos();
  void useCategoriasAtivas(); // categorias loaded for side effects
  const { data: stats } = useMapeamentoStats();
  const { data: tipos } = useMapeamentoTipos();
  const batchUpdate = useBatchUpdateMapeamento();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('todos');
  const [localOverrides, setLocalOverrides] = useState<Map<string, string>>(new Map());
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await supabase.functions.invoke('omie-financeiro', {
        body: { tipo: 'TODOS' },
      });

      if (response.error) {
        toast.error('Erro na sincronização: ' + response.error.message);
      } else {
        toast.success('Sincronização concluída! Descrições atualizadas.');
        window.location.reload();
      }
    } catch (err) {
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!mapeamentos) return [];
    return mapeamentos.filter((m: any) => {
      const contaDre = localOverrides.get(m.id) ?? m.conta_dre_override ?? (m.categorias_contabeis?.conta_dre || '');
      const isMapped = !!contaDre;

      if (filter === 'mapeados' && !isMapped) return false;
      if (filter === 'nao_mapeados' && isMapped) return false;

      if (search) {
        const term = search.toLowerCase();
        return m.codigo_omie.toLowerCase().includes(term) ||
          (m.descricao_omie || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [mapeamentos, search, filter, localOverrides]);

  const handleContaDREChange = (id: string, value: string) => {
    setLocalOverrides(prev => new Map(prev).set(id, value === '__clear__' ? '' : value));
  };

  const handleSaveAll = () => {
    const updates = Array.from(localOverrides.entries()).map(([id, val]) => ({
      id,
      conta_dre_override: val || null,
    }));
    if (updates.length === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }
    batchUpdate.mutate(updates, {
      onSuccess: () => setLocalOverrides(new Map()),
    });
  };

  const handleAutoSuggest = () => {
    if (!mapeamentos) return;
    const newOverrides = new Map(localOverrides);
    let count = 0;
    for (const m of mapeamentos as any[]) {
      const existing = m.conta_dre_override || m.categorias_contabeis?.conta_dre;
      if (existing) continue;

      const suggestion = suggestContaDRE(m.codigo_omie, m.conta_dre_omie);

      if (suggestion) {
        newOverrides.set(m.id, suggestion);
        count++;
      }
    }
    setLocalOverrides(newOverrides);
    toast.success(`${count} sugestões aplicadas. Salve para confirmar.`);
  };

  const totalMapeados = useMemo(() => {
    if (!mapeamentos) return 0;
    return (mapeamentos as any[]).filter((m: any) => {
      const val = localOverrides.get(m.id) ?? m.conta_dre_override ?? m.categorias_contabeis?.conta_dre;
      return !!val;
    }).length;
  }, [mapeamentos, localOverrides]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mapeamento Categorias Omie → DRE</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vincule os códigos de categoria do Omie às contas do DRE.
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="outline">
            Total: {mapeamentos?.length || 0} categorias
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
            Mapeados: {totalMapeados}
          </Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
            Pendentes: {(mapeamentos?.length || 0) - totalMapeados}
          </Badge>
          {localOverrides.size > 0 && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
              {localOverrides.size} alterações não salvas
            </Badge>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="mapeados">Mapeados</SelectItem>
              <SelectItem value="nao_mapeados">Não mapeados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Omie'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleAutoSuggest}>
            <Wand2 className="h-4 w-4 mr-1" /> Sugerir
          </Button>
          <Button size="sm" onClick={handleSaveAll} disabled={localOverrides.size === 0 || batchUpdate.isPending}>
            <Save className="h-4 w-4 mr-1" /> Salvar ({localOverrides.size})
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Código Omie</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[180px]">DRE Omie</TableHead>
                <TableHead className="w-[80px] text-right">Títulos</TableHead>
                <TableHead className="w-[320px]">Conta DRE</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {mapeamentos?.length === 0
                      ? 'Nenhuma categoria Omie encontrada. Sincronize os dados do Omie primeiro.'
                      : 'Nenhum resultado para o filtro aplicado.'
                    }
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((m: any) => {
                const currentVal = localOverrides.get(m.id) ?? m.conta_dre_override ?? m.categorias_contabeis?.conta_dre ?? '';
                const isMapped = !!currentVal;
                const qtd = stats?.get(m.codigo_omie)?.qtd || 0;
                const tipoSet = tipos?.get(m.codigo_omie);
                const isAR = tipoSet?.has('AR') ?? false;
                const isAP = tipoSet?.has('AP') ?? false;

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">{m.codigo_omie}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.descricao_omie || <span className="italic text-amber-500">Sincronize para carregar</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isAR && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs">
                            Receita
                          </Badge>
                        )}
                        {isAP && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30 text-xs">
                            Despesa
                          </Badge>
                        )}
                        {!isAR && !isAP && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{m.conta_dre_omie || '—'}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{qtd}</TableCell>
                    <TableCell>
                      <Select
                        value={currentVal || '__empty__'}
                        onValueChange={(v) => handleContaDREChange(m.id, v === '__empty__' ? '__clear__' : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">— Sem mapeamento —</SelectItem>
                          {CONTAS_DRE.map(c => (
                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isMapped ? 'default' : 'outline'} className={isMapped
                        ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                      }>
                        {isMapped ? 'Mapeado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
