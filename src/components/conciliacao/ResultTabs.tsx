import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable, { type ColumnDef, ValueCell, formatDateBR } from './DataTable';
import type { ResultadoConciliacao, Match, Divergencia, LancamentoBanco, LancamentoOmie } from '@/calculations/conciliacao/types';

interface ResultTabsProps {
  resultado: ResultadoConciliacao;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const CAMADA_BG: Record<string, string> = {
  A: 'bg-green-500/10',
  B: 'bg-yellow-500/10',
  C: 'bg-orange-500/10',
  D: 'bg-red-500/10',
};

export default function ResultTabs({ resultado, activeTab, onTabChange }: ResultTabsProps) {
  const [divFilter, setDivFilter] = useState<string>('all');

  // === Conciliados ===
  const matchCols: ColumnDef<Match>[] = useMemo(() => [
    { key: '#', label: '#', render: (_, i) => <span className="text-muted-foreground">{i + 1}</span>, sortable: false },
    { key: 'banco.dataStr', label: 'Data Banco', render: r => formatDateBR(r.banco.data), getValue: r => r.banco.data?.getTime() ?? 0 },
    { key: 'banco.descricao', label: 'Descrição Banco', render: r => <span className="truncate max-w-[200px] inline-block">{r.banco.descricao}</span> },
    { key: 'banco.valor', label: 'Valor Banco', align: 'right', render: r => <ValueCell value={r.banco.valor} />, getValue: r => r.banco.valor },
    { key: 'sep', label: '↔', sortable: false, align: 'center', render: () => <span className="text-muted-foreground">↔</span> },
    { key: 'omie.dataStr', label: 'Data Omie', render: r => formatDateBR(r.omie.data), getValue: r => r.omie.data?.getTime() ?? 0 },
    { key: 'omie.descricao', label: 'Descrição Omie', render: r => <span className="truncate max-w-[200px] inline-block">{r.omie.clienteFornecedor}</span> },
    { key: 'omie.valor', label: 'Valor Omie', align: 'right', render: r => {
      const diff = Math.abs(r.banco.valor - r.omie.valor);
      return <span className={diff > 0.001 ? 'font-bold underline' : ''}><ValueCell value={r.omie.valor} /></span>;
    }, getValue: r => r.omie.valor },
    { key: 'camada', label: 'Camada', align: 'center', render: r => (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CAMADA_BG[r.camada] || ''}`}>{r.camada}</span>
    ) },
  ], []);

  // === Divergências ===
  const divTypes = useMemo(() => {
    const s = new Set(resultado.divergencias.map(d => d.tipoNome));
    return Array.from(s).sort();
  }, [resultado.divergencias]);

  const filteredDiv = useMemo(() => {
    if (divFilter === 'all') return resultado.divergencias;
    return resultado.divergencias.filter(d => d.tipoNome === divFilter);
  }, [resultado.divergencias, divFilter]);

  const divCols: ColumnDef<Divergencia>[] = useMemo(() => [
    { key: '#', label: '#', render: (_, i) => <span className="text-muted-foreground">{i + 1}</span>, sortable: false },
    { key: 'fonte', label: 'Origem' },
    { key: 'data', label: 'Data' },
    { key: 'descricao', label: 'Descrição', render: r => <span className="truncate max-w-[250px] inline-block">{r.descricao || r.nome || '—'}</span> },
    { key: 'valor', label: 'Valor', align: 'right', render: r => <ValueCell value={r.valor} />, getValue: r => r.valor },
    { key: 'tipoNome', label: 'Tipo', render: r => {
      if (r.tipo === 'F') {
        const isAlta = r.confianca === 'alta';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isAlta ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'border border-red-300 text-red-700 dark:border-red-700 dark:text-red-400'}`}>
            {r.tipoNome}
          </span>
        );
      }
      return r.tipoNome;
    }},
    { key: 'acao', label: 'Ação', render: r => <span className="truncate max-w-[200px] inline-block text-muted-foreground text-xs">{r.acao || ''}</span> },
  ], []);

  // === Sem Match ===
  const semMatchBanco = useMemo(() => resultado.banco.filter(b => !b.matched), [resultado.banco]);
  const semMatchOmie = useMemo(() => resultado.omieSicredi.filter(o => !o.matched), [resultado.omieSicredi]);

  const smBancoCols: ColumnDef<LancamentoBanco>[] = useMemo(() => [
    { key: '#', label: '#', render: (_, i) => <span className="text-muted-foreground">{i + 1}</span>, sortable: false },
    { key: 'dataStr', label: 'Data', render: r => formatDateBR(r.data) },
    { key: 'descricao', label: 'Descrição' },
    { key: 'valor', label: 'Valor', align: 'right', render: r => <ValueCell value={r.valor} />, getValue: r => r.valor },
  ], []);

  const smOmieCols: ColumnDef<LancamentoOmie>[] = useMemo(() => [
    { key: '#', label: '#', render: (_, i) => <span className="text-muted-foreground">{i + 1}</span>, sortable: false },
    { key: 'dataStr', label: 'Data', render: r => formatDateBR(r.data) },
    { key: 'clienteFornecedor', label: 'Descrição' },
    { key: 'valor', label: 'Valor', align: 'right', render: r => <ValueCell value={r.valor} />, getValue: r => r.valor },
    { key: 'categoria', label: 'Categoria' },
  ], []);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="conciliados" className="text-xs">
          Conciliados ({resultado.totalConciliados})
        </TabsTrigger>
        <TabsTrigger value="divergencias" className="text-xs">
          Divergências ({resultado.totalDivergencias})
        </TabsTrigger>
        <TabsTrigger value="sem-match" className="text-xs">
          Sem Match ({semMatchBanco.length + semMatchOmie.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="conciliados">
        <DataTable
          columns={matchCols}
          data={resultado.matches}
          searchKeys={['banco.descricao', 'omie.clienteFornecedor']}
          totalLabel="Total conciliados"
          totalValue={resultado.matches.reduce((s, m) => s + m.banco.valor, 0)}
          rowClassName={r => CAMADA_BG[r.camada] || ''}
        />
      </TabsContent>

      <TabsContent value="divergencias">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtrar:</span>
            <Select value={divFilter} onValueChange={setDivFilter}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {divTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={divCols}
            data={filteredDiv}
            searchKeys={['descricao', 'nome', 'fonte', 'tipoNome']}
            totalLabel="Total divergências"
            totalValue={filteredDiv.reduce((s, d) => s + d.valor, 0)}
          />
        </div>
      </TabsContent>

      <TabsContent value="sem-match">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">No Banco mas não no Omie ({semMatchBanco.length})</h4>
            <DataTable
              columns={smBancoCols}
              data={semMatchBanco}
              searchKeys={['descricao', 'nome']}
              totalLabel="Total"
              totalValue={semMatchBanco.reduce((s, b) => s + b.valor, 0)}
            />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">No Omie mas não no Banco ({semMatchOmie.length})</h4>
            <DataTable
              columns={smOmieCols}
              data={semMatchOmie}
              searchKeys={['clienteFornecedor', 'categoria']}
              totalLabel="Total"
              totalValue={semMatchOmie.reduce((s, o) => s + o.valor, 0)}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
