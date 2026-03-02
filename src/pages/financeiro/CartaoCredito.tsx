import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  CreditCard,
  Download,
  Loader2,
  Upload,
  X,
  DollarSign,
  Globe,
  Receipt,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  Search,
} from 'lucide-react';
import { parseCartaoFromText, csvToText, workbookToRows } from '@/calculations/conciliacao/parsers';
import { suggestCategoria } from '@/calculations/conciliacao/categorias';
import { gerarExcelImportacaoCartao } from '@/calculations/conciliacao/outputs';
import { useConciliacaoStorage, rehydrateCartao } from '@/hooks/useConciliacaoStorage';
import type { TransacaoCartao, CartaoInfo, ResultadoConciliacao } from '@/calculations/conciliacao/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function buildPeriodOptions(): { label: string; value: string }[] {
  const now = new Date();
  const options: { label: string; value: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ label, value });
  }
  return options;
}

function periodoRefToLabel(ref: string): string {
  const [year, month] = ref.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function formatBRL(valor: number): string {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CartaoCredito() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { saveImport, loadImports } = useConciliacaoStorage();

  const now = new Date();
  const initialPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [periodoRef, setPeriodoRef] = useState(initialPeriodo);
  const [transacoes, setTransacoes] = useState<TransacaoCartao[]>([]);
  const [cartaoInfo, setCartaoInfo] = useState<CartaoInfo>({ vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 });
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('transacoes');

  const fileRef = useRef<HTMLInputElement>(null);
  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  // Derived data
  const importaveis = useMemo(() => transacoes.filter(t => !t.isPagamentoFatura && !t.isEstorno), [transacoes]);
  const pagamentosEstornos = useMemo(() => transacoes.filter(t => t.isPagamentoFatura || t.isEstorno), [transacoes]);
  const estornos = useMemo(() => transacoes.filter(t => t.isEstorno), [transacoes]);

  // Group by category
  const porCategoria = useMemo(() => {
    const groups: Record<string, { transacoes: TransacaoCartao[]; total: number }> = {};
    for (const t of importaveis) {
      const cat = t.categoriaSugerida || 'SEM CATEGORIA';
      if (!groups[cat]) groups[cat] = { transacoes: [], total: 0 };
      groups[cat].transacoes.push(t);
      groups[cat].total += t.valor;
    }
    return Object.entries(groups).sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total));
  }, [importaveis]);

  // Search filter
  const filteredImportaveis = useMemo(() => {
    if (!searchTerm) return importaveis;
    const term = searchTerm.toLowerCase();
    return importaveis.filter(t =>
      t.descricao.toLowerCase().includes(term) ||
      t.titular?.toLowerCase().includes(term) ||
      t.categoriaSugerida?.toLowerCase().includes(term)
    );
  }, [importaveis, searchTerm]);

  // Auto-load saved fatura on period change
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setTransacoes([]);
      setCartaoInfo({ vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 });
      setFileName(null);
      setIsSaved(false);

      try {
        const imports = await loadImports(periodoRef);
        if (cancelled) return;

        if (imports.faturaCartao) {
          const d = imports.faturaCartao;
          const rehydrated = rehydrateCartao(d.dados as any[]);
          // Re-apply category suggestions
          for (const t of rehydrated) {
            if (!t.isPagamentoFatura && !t.isEstorno) {
              t.categoriaSugerida = suggestCategoria(t.descricao);
            }
          }
          setTransacoes(rehydrated);
          setCartaoInfo(d.metadata?.cartaoInfo || { vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 });
          setFileName(d.nome_arquivo || 'Fatura salva');
          setIsSaved(true);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [periodoRef, user]);

  const handleFile = useCallback(async (file: File) => {
    try {
      const fname = file.name.toLowerCase();
      let text: string;
      if (fname.endsWith('.csv')) {
        text = await csvToText(file);
      } else {
        const rows = await workbookToRows(file);
        text = rows.map(r => (r || []).join(';')).join('\n');
      }

      const result = parseCartaoFromText(text);

      // Apply category suggestions
      for (const t of result.transacoes) {
        if (!t.isPagamentoFatura && !t.isEstorno) {
          t.categoriaSugerida = suggestCategoria(t.descricao);
        }
      }

      setTransacoes(result.transacoes);
      setCartaoInfo(result.info);
      setFileName(file.name);
      setIsSaved(false);

      // Save to Supabase
      try {
        await saveImport({
          tipo: 'fatura_cartao',
          periodoRef,
          nomeArquivo: file.name,
          totalLancamentos: result.transacoes.length,
          valorTotal: result.info.valorTotal,
          dados: result.transacoes,
          metadata: { cartaoInfo: result.info },
        });
        setIsSaved(true);
        toast.success(`${file.name} salvo para ${periodoRefToLabel(periodoRef)}`);
      } catch {
        toast.success(`${file.name} carregado — ${result.transacoes.length} transações`);
        toast.error('Erro ao salvar no banco de dados');
      }
    } catch {
      toast.error(`Erro ao parsear ${file.name}`);
    }
  }, [periodoRef, saveImport]);

  const handleRemove = useCallback(() => {
    setTransacoes([]);
    setCartaoInfo({ vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 });
    setFileName(null);
    setIsSaved(false);
  }, []);

  const handleGerarImportacao = useCallback(() => {
    if (!transacoes.length) return;
    try {
      const [year, month] = periodoRef.split('-');
      const fakeResult = {
        cartaoTransacoes: importaveis,
        cartaoInfo,
        mesLabel: MONTHS[Number(month) - 1],
        anoLabel: year,
      } as ResultadoConciliacao;
      gerarExcelImportacaoCartao(fakeResult);
      toast.success('Download da planilha de importação iniciado');
    } catch {
      toast.error('Erro ao gerar planilha');
    }
  }, [transacoes, cartaoInfo, periodoRef, importaveis]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const hasData = transacoes.length > 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Cartão de Crédito
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Importe faturas, mapeie categorias e gere planilhas para o Omie
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className="text-sm text-muted-foreground">Ref:</span>
            <Select value={periodoRef} onValueChange={setPeriodoRef}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando fatura salva...
          </div>
        )}

        {/* Upload Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">Fatura do Cartão</h3>
            </div>

            {!fileName ? (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Arraste ou clique para importar</p>
                <p className="text-xs text-muted-foreground mt-1">Aceita .csv do Sicredi</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{fileName}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemove}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>{transacoes.length} transações</p>
                  <p>Total: {formatBRL(cartaoInfo.valorTotal)}</p>
                  {cartaoInfo.vencimento && <p>Vencimento: {cartaoInfo.vencimento}</p>}
                  {cartaoInfo.situacao && <p>Situação: {cartaoInfo.situacao}</p>}
                </div>
                {isSaved && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Salvo
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards */}
        {hasData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card><CardContent className="p-3 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold">{formatBRL(cartaoInfo.valorTotal)}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <span className="text-lg mb-1 block">🇧🇷</span>
              <p className="text-lg font-bold">{formatBRL(cartaoInfo.despesasBrasil)}</p>
              <p className="text-xs text-muted-foreground">Brasil</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <Globe className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold">{formatBRL(cartaoInfo.despesasExterior)}</p>
              <p className="text-xs text-muted-foreground">Exterior</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <CreditCard className="h-4 w-4 mx-auto text-gray-500 mb-1" />
              <p className="text-lg font-bold">{transacoes.length}</p>
              <p className="text-xs text-muted-foreground">Transações</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold">{importaveis.length}</p>
              <p className="text-xs text-muted-foreground">Importáveis</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <RotateCcw className="h-4 w-4 mx-auto text-orange-500 mb-1" />
              <p className="text-lg font-bold">{estornos.length}</p>
              <p className="text-xs text-muted-foreground">Estornos</p>
            </CardContent></Card>
          </div>
        )}

        {/* Generate Import Button */}
        {hasData && (
          <Button onClick={handleGerarImportacao} className="gap-2" variant="default">
            <Download className="h-4 w-4" /> Gerar Importação Omie (.xlsx)
          </Button>
        )}

        {/* Tabs */}
        {hasData && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="transacoes">Transações ({importaveis.length})</TabsTrigger>
              <TabsTrigger value="pagamentos">Pagamentos/Estornos ({pagamentosEstornos.length})</TabsTrigger>
              <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
            </TabsList>

            <TabsContent value="transacoes" className="space-y-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm h-8 text-sm"
                />
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-left">Parcela</th>
                      <th className="p-2 text-right">Valor</th>
                      <th className="p-2 text-left">Titular</th>
                      <th className="p-2 text-left">Categoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredImportaveis.slice(0, 100).map((t, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">{t.dataStr}</td>
                        <td className="p-2 max-w-[250px] truncate">{t.descricao}</td>
                        <td className="p-2 text-xs">{t.parcela || ''}</td>
                        <td className={`p-2 text-right font-mono ${t.valor < 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatBRL(t.valor)}
                        </td>
                        <td className="p-2 text-xs">{t.titular || ''}</td>
                        <td className="p-2 text-xs">{t.categoriaSugerida || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-semibold">
                    <tr>
                      <td colSpan={4} className="p-2">Total</td>
                      <td className="p-2 text-right font-mono">
                        {formatBRL(filteredImportaveis.reduce((s, t) => s + t.valor, 0))}
                      </td>
                      <td colSpan={2} className="p-2 text-xs text-muted-foreground">
                        {filteredImportaveis.length > 100 ? `Mostrando 100 de ${filteredImportaveis.length}` : `${filteredImportaveis.length} transações`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="pagamentos">
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentosEstornos.map((t, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">{t.dataStr}</td>
                        <td className="p-2 max-w-[300px] truncate">{t.descricao}</td>
                        <td className="p-2 text-xs">
                          {t.isPagamentoFatura ? 'Pagamento' : t.isEstorno ? 'Estorno' : '—'}
                        </td>
                        <td className={`p-2 text-right font-mono ${t.valor > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatBRL(t.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-semibold">
                    <tr>
                      <td colSpan={4} className="p-2">Total</td>
                      <td className="p-2 text-right font-mono">
                        {formatBRL(pagamentosEstornos.reduce((s, t) => s + t.valor, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="categorias" className="space-y-2">
              {porCategoria.map(([cat, data]) => (
                <Collapsible key={cat}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                        <span className="font-medium text-sm">{cat}</span>
                        <span className="text-xs text-muted-foreground">({data.transacoes.length} transações)</span>
                      </div>
                      <span className={`font-mono font-semibold text-sm ${data.total < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatBRL(data.total)}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pr-2 pb-2">
                      <table className="w-full text-xs">
                        <tbody>
                          {data.transacoes.map((t, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-1 text-muted-foreground w-8">{i + 1}</td>
                              <td className="p-1 w-16">{t.dataStr}</td>
                              <td className="p-1 max-w-[250px] truncate">{t.descricao}</td>
                              <td className={`p-1 text-right font-mono ${t.valor < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatBRL(t.valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
