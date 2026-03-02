import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Building2,
  FileSpreadsheet,
  Play,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  Loader2,
  FileText,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { executarConciliacaoFromData } from '@/calculations/conciliacao/engine';
import type { ResultadoConciliacao, LancamentoBanco, LancamentoOmie } from '@/calculations/conciliacao/types';
import { gerarRelatorioMD, gerarExcelDivergencias, gerarRelatorioPDF } from '@/calculations/conciliacao/outputs';
import { useConciliacaoStorage, rehydrateBanco, rehydrateOmie, rehydrateResultado } from '@/hooks/useConciliacaoStorage';
import ImportPreviewCard from '@/components/conciliacao/ImportPreviewCard';
import ResultTabs from '@/components/conciliacao/ResultTabs';

interface ParsedFileInfo {
  file: File | null;
  rowCount: number;
  period?: string;
  contasCorrentes?: string[];
  valorTotal?: number;
  fileName: string;
  parsedBanco?: LancamentoBanco[];
  parsedOmie?: LancamentoOmie[];
  saldoAnterior?: number | null;
}

type FileType = 'banco' | 'omie';

const ACCEPT_MAP: Record<FileType, string> = {
  banco: '.xlsx,.xls,.csv',
  omie: '.xlsx,.xls',
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TIPO_MAP: Record<FileType, 'extrato_banco' | 'extrato_omie'> = {
  banco: 'extrato_banco',
  omie: 'extrato_omie',
};

function parseExcelDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
    const parts = value.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function detectPeriod(rows: Record<string, unknown>[]): string {
  const dateKeys = ['data', 'Data', 'DATA', 'date', 'Date', 'dt_lancamento', 'data_lancamento', 'Data Lançamento'];
  for (const row of rows) {
    for (const key of dateKeys) {
      if (row[key] != null) {
        const d = parseExcelDate(row[key]);
        if (d) {
          const month = String(d.getMonth() + 1).padStart(2, '0');
          return `${month}/${d.getFullYear()}`;
        }
      }
    }
    for (const [, val] of Object.entries(row)) {
      const d = parseExcelDate(val);
      if (d && d.getFullYear() > 2000) {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${month}/${d.getFullYear()}`;
      }
    }
    break;
  }
  return '--';
}

function extractContasCorrentes(rows: Record<string, unknown>[]): string[] {
  const keys = ['conta_corrente', 'Conta Corrente', 'conta', 'Conta', 'cc'];
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of keys) {
      if (row[key] != null && String(row[key]).trim()) {
        set.add(String(row[key]).trim());
      }
    }
  }
  return Array.from(set);
}

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

export default function Conciliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { saveImport, loadImports, deleteImport, saveResultado, loadResultado, invalidateResultado } = useConciliacaoStorage();

  const now = new Date();
  const initialPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [periodoRef, setPeriodoRef] = useState(initialPeriodo);
  const [files, setFiles] = useState<Record<FileType, ParsedFileInfo | null>>({
    banco: null, omie: null,
  });
  const [savedSources, setSavedSources] = useState<Record<FileType, boolean>>({
    banco: false, omie: false,
  });

  const [resultado, setResultado] = useState<ResultadoConciliacao | null>(null);
  const [processando, setProcessando] = useState(false);
  const [loadingImports, setLoadingImports] = useState(false);
  const [activeTab, setActiveTab] = useState('conciliados');

  const bancoRef = useRef<HTMLInputElement>(null);
  const omieRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const refs: Record<FileType, React.RefObject<HTMLInputElement>> = {
    banco: bancoRef, omie: omieRef,
  };

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  // Load saved imports when period changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoadingImports(true);
      setFiles({ banco: null, omie: null });
      setSavedSources({ banco: false, omie: false });
      setResultado(null);

      try {
        const imports = await loadImports(periodoRef);
        if (cancelled) return;

        const newFiles: Record<FileType, ParsedFileInfo | null> = { banco: null, omie: null };
        const newSaved: Record<FileType, boolean> = { banco: false, omie: false };

        if (imports.extratoBanco) {
          const d = imports.extratoBanco;
          newFiles.banco = {
            file: null, fileName: d.nome_arquivo || 'Extrato banco',
            rowCount: d.total_lancamentos,
            parsedBanco: rehydrateBanco(d.dados as any[]),
            saldoAnterior: d.saldo_anterior,
          };
          newSaved.banco = true;
        }

        if (imports.extratoOmie) {
          const d = imports.extratoOmie;
          newFiles.omie = {
            file: null, fileName: d.nome_arquivo || 'Extrato Omie',
            rowCount: d.total_lancamentos,
            parsedOmie: rehydrateOmie(d.dados as any[]),
            saldoAnterior: d.saldo_anterior,
          };
          newSaved.omie = true;
        }

        setFiles(newFiles);
        setSavedSources(newSaved);

        // Load saved resultado
        try {
          const savedResultado = await loadResultado(periodoRef);
          if (!cancelled && savedResultado) {
            const rehydrated = rehydrateResultado(savedResultado);
            setResultado(rehydrated);
          }
        } catch {
          // ignore
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingImports(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [periodoRef, user]);

  const handleFile = useCallback((type: FileType, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        const info: ParsedFileInfo = { file, fileName: file.name, rowCount: rows.length };

        if (type === 'banco') {
          info.period = detectPeriod(rows);
        } else if (type === 'omie') {
          info.period = detectPeriod(rows);
          info.contasCorrentes = extractContasCorrentes(rows);
        }

        const { parseBanco, parseOmie, workbookToRows } = await import('@/calculations/conciliacao/parsers');

        if (type === 'banco') {
          const bancoRows = await workbookToRows(file);
          const { lancamentos, saldoAnterior } = parseBanco(bancoRows);
          info.parsedBanco = lancamentos;
          info.saldoAnterior = saldoAnterior;
          info.rowCount = lancamentos.length;
        } else if (type === 'omie') {
          const omieRows = await workbookToRows(file);
          const { lancamentos, saldoAnterior } = parseOmie(omieRows);
          info.parsedOmie = lancamentos;
          info.saldoAnterior = saldoAnterior;
          info.rowCount = lancamentos.length;
        }

        setFiles((prev) => ({ ...prev, [type]: info }));
        setSavedSources((prev) => ({ ...prev, [type]: false }));

        // Invalidate saved resultado since source data changed
        try {
          await invalidateResultado(periodoRef);
          setResultado(null);
        } catch {
          // ignore
        }

        try {
          const valorTotal = type === 'banco'
            ? (info.parsedBanco || []).reduce((s, b) => s + Math.abs(b.valor), 0)
            : (info.parsedOmie || []).reduce((s, o) => s + Math.abs(o.valor), 0);

          const dados = type === 'banco' ? info.parsedBanco : info.parsedOmie;

          await saveImport({
            tipo: TIPO_MAP[type],
            periodoRef,
            nomeArquivo: file.name,
            totalLancamentos: info.rowCount,
            valorTotal,
            saldoAnterior: info.saldoAnterior ?? undefined,
            dados: dados || [],
          });

          setSavedSources((prev) => ({ ...prev, [type]: true }));
          const label = periodoRefToLabel(periodoRef);
          toast.success(`${file.name} salvo para ${label}`);
        } catch {
          toast.success(`${file.name} carregado — ${info.rowCount} registros`);
          toast.error('Erro ao salvar no banco de dados');
        }
      } catch {
        toast.error(`Erro ao parsear ${file.name}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [periodoRef, saveImport]);

  const handleDrop = useCallback(
    (type: FileType) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(type, file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (type: FileType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(type, file);
      e.target.value = '';
    },
    [handleFile]
  );

  const removeFile = useCallback(async (type: FileType) => {
    try {
      await deleteImport(TIPO_MAP[type], periodoRef);
      await invalidateResultado(periodoRef);
      toast.success('Arquivo removido');
    } catch {
      // ignore
    }
    setFiles((prev) => ({ ...prev, [type]: null }));
    setSavedSources((prev) => ({ ...prev, [type]: false }));
    setResultado(null);
  }, [periodoRef, deleteImport, invalidateResultado]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const canExecute = files.banco && files.omie && !processando;

  const handleDownloadRelatorio = () => {
    if (!resultado) return;
    try { gerarRelatorioMD(resultado); toast.success('Download do relatório .md iniciado'); }
    catch { toast.error('Falha ao gerar relatório'); }
  };

  const handleDownloadDivergencias = () => {
    if (!resultado) return;
    try { gerarExcelDivergencias(resultado); toast.success('Download do Excel de divergências iniciado'); }
    catch { toast.error('Falha ao gerar Excel de divergências'); }
  };

  const handleDownloadPDF = () => {
    if (!resultado) return;
    try { gerarRelatorioPDF(resultado); toast.success('Download do relatório PDF iniciado'); }
    catch { toast.error('Falha ao gerar PDF'); }
  };

  const handleExecute = async () => {
    const bancoInfo = files.banco;
    const omieInfo = files.omie;
    if (!bancoInfo || !omieInfo) return;

    setProcessando(true);
    setResultado(null);
    try {
      let result: ResultadoConciliacao;
      const hasParsedData = bancoInfo.parsedBanco && omieInfo.parsedOmie;

      if (hasParsedData) {
        result = executarConciliacaoFromData(
          bancoInfo.parsedBanco!, omieInfo.parsedOmie!,
          [], undefined,
          bancoInfo.saldoAnterior ?? null, omieInfo.saldoAnterior ?? null,
        );
      } else {
        toast.error('Dados insuficientes para executar a conciliação');
        return;
      }

      setResultado(result);
      setActiveTab('conciliados');
      toast.success(`Conciliação concluída: ${result.totalConciliados} matches, ${result.totalDivergencias} divergências`);

      try {
        await saveResultado(periodoRef, result);
        const label = periodoRefToLabel(periodoRef);
        toast.success(`Conciliação salva para ${label}`);
      } catch {
        toast.error('Erro ao salvar resultado no banco de dados');
      }
    } catch (err: any) {
      toast.error('Erro na conciliação: ' + (err.message || 'erro desconhecido'));
    } finally {
      setProcessando(false);
    }
  };

  const handleKPIClick = (tab: string) => {
    if (!resultado) return;
    setActiveTab(tab);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cardConfigs: {
    type: FileType;
    title: string;
    icon: typeof Building2;
    headerClass: string;
    iconClass: string;
  }[] = [
      { type: 'banco', title: 'Extrato Bancário (Sicredi)', icon: Building2, headerClass: 'bg-blue-50 dark:bg-blue-950/30', iconClass: 'text-blue-600' },
      { type: 'omie', title: 'Extrato Omie', icon: FileSpreadsheet, headerClass: 'bg-green-50 dark:bg-green-950/30', iconClass: 'text-green-600' },
    ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
              Conciliação Financeira
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Compare extrato bancário vs Omie para identificar divergências
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

        {/* Loading indicator */}
        {loadingImports && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando dados salvos...
          </div>
        )}

        {/* Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cardConfigs.map(({ type, title, icon, headerClass, iconClass }) => (
            <ImportPreviewCard
              key={type}
              type={type}
              title={title}
              icon={icon}
              headerClass={headerClass}
              iconClass={iconClass}
              info={files[type]}
              isSaved={savedSources[type]}
              accept={ACCEPT_MAP[type]}
              onRemove={() => removeFile(type)}
              onDrop={handleDrop(type)}
              onInputChange={handleInputChange(type)}
              inputRef={refs[type]}
            />
          ))}
        </div>

        {/* Account filter info */}
        {resultado && resultado.contaCorrenteSelecionada && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Conta: {resultado.contaCorrenteSelecionada} ({resultado.totalOmieFiltrado} de {resultado.totalOmieOriginal} lançamentos)
                  </p>
                  {resultado.contasExcluidas && resultado.contasExcluidas.length > 0 && (
                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                      Excluídos: {resultado.contasExcluidas.map(c => `${c.nome} (${c.count})`).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner de lançamentos zerados */}
        {resultado && resultado.lancamentosZerados && resultado.lancamentosZerados.total > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {resultado.lancamentosZerados.total} lançamentos com valor R$ 0,00 foram ignorados ({resultado.lancamentosZerados.banco} do banco, {resultado.lancamentosZerados.omie} do Omie).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner de lançamentos futuros */}
        {resultado && resultado.lancamentosFuturos && resultado.lancamentosFuturos.quantidade > 0 && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Período: até <strong>{resultado.lancamentosFuturos.ultimaDataBanco}</strong> (última data do extrato).{' '}
                  {resultado.lancamentosFuturos.quantidade} lançamentos futuros do Omie excluídos
                  (R$ {resultado.lancamentosFuturos.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action + Results */}
        <div className="space-y-4">
          <Button onClick={handleExecute} disabled={!canExecute} className="gap-2" size="lg">
            {processando ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
            ) : (
              <><Play className="h-4 w-4" /> Executar Conciliação</>
            )}
          </Button>

          {/* KPI Cards — clickable */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`cursor-pointer transition-shadow hover:shadow-md ${activeTab === 'conciliados' && resultado ? 'ring-2 ring-primary/30' : ''}`} onClick={() => handleKPIClick('conciliados')}>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-2xl font-bold">{resultado?.totalConciliados ?? 0}</p>
                <p className="text-xs text-muted-foreground">Conciliados</p>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer transition-shadow hover:shadow-md ${activeTab === 'divergencias' && resultado ? 'ring-2 ring-primary/30' : ''}`} onClick={() => handleKPIClick('divergencias')}>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-2xl font-bold">{resultado?.totalDivergencias ?? 0}</p>
                <p className="text-xs text-muted-foreground">Divergências</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => handleKPIClick('divergencias')}>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-2xl font-bold text-red-600">
                  {resultado?.divergencias.filter(d => d.tipo === 'B*').length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">A Receber (atraso)</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => handleKPIClick('divergencias')}>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <p className="text-2xl font-bold text-orange-600">
                  {resultado?.divergencias.filter(d => d.tipo === 'G').length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">A Pagar (atraso)</p>
              </CardContent>
            </Card>
          </div>

          {/* Matching Summary */}
          {resultado && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Resultado do Matching</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['A', 'B', 'C', 'D'].map(cam => (
                    <div key={cam} className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Camada {cam}</p>
                      <p className="text-lg font-bold">{resultado.camadaCounts[cam] || 0}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result Tabs */}
          {resultado && (
            <div ref={tabsRef}>
              <ResultTabs resultado={resultado} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}

          {/* Download buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!resultado} onClick={handleDownloadRelatorio} className="gap-2">
              <Download className="h-4 w-4" /> Relatório (.md)
            </Button>
            <Button variant="outline" disabled={!resultado} onClick={handleDownloadPDF} className="gap-2">
              <FileText className="h-4 w-4" /> Relatório (.pdf)
            </Button>
            <Button variant="outline" disabled={!resultado} onClick={handleDownloadDivergencias} className="gap-2">
              <Download className="h-4 w-4" /> Divergências (.xlsx)
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
