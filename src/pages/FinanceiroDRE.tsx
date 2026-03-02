import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { buildDREEstrutura, buildDREAnual, buildDREComDados, buildDREAnualComDados } from '@/calculations/conciliacao/dre';
import type { DRELinha, DRESecao, DREAnual } from '@/calculations/conciliacao/types';
import { useDREData } from '@/hooks/useDREData';
import { useCategoriasAtivas } from '@/hooks/useCategorias';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, FileText, AlertTriangle, TrendingUp, TrendingDown, DollarSign, BarChart3, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { exportDREtoPDF } from '@/lib/financeiro/exportDREPdf';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SyncButton } from '@/components/rentabilidade/SyncButton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ANOS = ['2025', '2026'];

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function formatAbrev(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(valor / 1_000).toFixed(1)}k`;
  return valor.toFixed(0);
}

function formatAV(valor: number, receitaLiquida: number): string {
  if (receitaLiquida === 0) return '—';
  return `${((valor / receitaLiquida) * 100).toFixed(1)}%`;
}

// ─── Monthly view components ───

function DRELinhaRow({ linha, expandAll, showAV, receitaLiquida }: {
  linha: DRELinha; expandAll: boolean; showAV: boolean; receitaLiquida: number;
}) {
  const [localExpanded, setLocalExpanded] = useState(expandAll);
  const hasCategorias = linha.categorias && linha.categorias.length > 0;

  useEffect(() => {
    setLocalExpanded(expandAll);
  }, [expandAll]);

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between py-1.5 px-3 rounded-sm transition-colors",
          hasCategorias && "hover:bg-muted/10 cursor-pointer",
        )}
        
        onClick={() => hasCategorias && setLocalExpanded(prev => !prev)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasCategorias ? (
            <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", localExpanded && "rotate-90")} />
          ) : (
            <div className="w-3.5 shrink-0" />
          )}
          <span className="text-sm text-muted-foreground shrink-0">({linha.sinal})</span>
          <span className="text-sm truncate">{linha.nome}</span>
          {hasCategorias && (
            <span className="text-xs text-muted-foreground shrink-0">({linha.categorias!.length})</span>
          )}
          {!hasCategorias && linha.tipo === 'conta' && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs shrink-0">
              Sem categorias
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className={cn(
            "text-sm font-mono tabular-nums w-32 text-right",
            linha.valor > 0 && "text-emerald-400",
            linha.valor < 0 && "text-red-400",
            linha.valor === 0 && "text-muted-foreground",
          )}>
            {formatBRL(linha.valor)}
          </span>
          {showAV && (
            <span className="font-mono tabular-nums w-16 text-right text-muted-foreground text-xs">
              {formatAV(linha.valor, receitaLiquida)}
            </span>
          )}
        </div>
      </div>
      {localExpanded && hasCategorias && (
        <div className="ml-10 mb-2 py-1 px-3 bg-muted/5 rounded border-l-2 border-muted">
          {linha.categorias!.map((cat, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="text-xs text-muted-foreground">· {cat}</span>
              <span className="text-xs text-muted-foreground font-mono">R$ 0,00</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MargemRow({ nome, valor }: { nome: string; valor: number }) {
  return (
    <div className="flex items-center justify-between py-0.5 px-3 ml-6">
      <span className="text-xs italic text-muted-foreground">{nome}</span>
      <span className={cn(
        "text-xs italic font-mono tabular-nums",
        valor >= 0 ? "text-emerald-400/70" : "text-red-400/70",
      )}>
        {valor.toFixed(1)}%
      </span>
    </div>
  );
}

function DRESubtotalRow({ linha, showAV, receitaLiquida, margemNome, margemValor }: {
  linha: DRELinha; showAV: boolean; receitaLiquida: number;
  margemNome?: string; margemValor?: number;
}) {
  const isTotal = linha.tipo === 'total';
  return (
    <>
      <div className={cn(
        "flex items-center justify-between py-2 px-3",
        isTotal ? "bg-muted/10 border-t-2 border-b-2 border-primary/30 mt-2" : "bg-muted/5",
      )}>
        <span className={cn("font-bold", isTotal ? "text-base" : "text-sm")}>
          (=) {linha.nome}
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <span className={cn(
            "font-mono font-bold tabular-nums w-32 text-right",
            isTotal ? "text-base" : "text-sm",
            linha.valor > 0 && "text-emerald-400",
            linha.valor < 0 && "text-red-400",
            linha.valor === 0 && "text-muted-foreground",
          )}>
            {formatBRL(linha.valor)}
          </span>
          {showAV && (
            <span className="font-mono tabular-nums w-16 text-right text-muted-foreground text-xs font-bold">
              {formatAV(linha.valor, receitaLiquida)}
            </span>
          )}
        </div>
      </div>
      {margemNome !== undefined && margemValor !== undefined && receitaLiquida !== 0 && (
        <MargemRow nome={margemNome} valor={margemValor} />
      )}
    </>
  );
}

function DRESecaoBlockMensal({ secao, expandAll, showAV, receitaLiquida }: {
  secao: DRESecao; expandAll: boolean; showAV: boolean; receitaLiquida: number;
}) {
  const margemMap: Record<string, string> = {
    'LUCRO BRUTO': 'Margem Bruta',
    'RESULTADO OPERACIONAL (EBITDA)': 'Margem EBITDA',
    'RESULTADO LÍQUIDO DO EXERCÍCIO': 'Margem Líquida',
  };
  const margemNome = secao.subtotal ? margemMap[secao.subtotal.nome] : undefined;
  const margemValor = margemNome && receitaLiquida !== 0 && secao.subtotal
    ? (secao.subtotal.valor / receitaLiquida) * 100
    : undefined;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{secao.titulo}</h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      {secao.linhas.map(l => (
        <DRELinhaRow key={l.id} linha={l} expandAll={expandAll} showAV={showAV} receitaLiquida={receitaLiquida} />
      ))}
      {secao.subtotal && (
        <>
          <Separator className="my-1" />
          <DRESubtotalRow
            linha={secao.subtotal}
            showAV={showAV}
            receitaLiquida={receitaLiquida}
            margemNome={margemNome}
            margemValor={margemValor}
          />
        </>
      )}
    </div>
  );
}

// ─── Annual view ───

function DREAnualView({ dreAnual, showAV, showAH, expandAll }: {
  dreAnual: DREAnual; showAV: boolean; showAH: boolean; expandAll: boolean;
}) {
  const acumRL = 0; // receita liquida acumulada — zero for now

  // Flatten all lines from all sections for the table
  type FlatRow = { type: 'header'; titulo: string } | { type: 'linha'; linha: DRELinha; sectionIdx: number } | { type: 'separator' } | { type: 'subtotal'; linha: DRELinha; margemNome?: string } | { type: 'margem'; nome: string };
  
  const rows: FlatRow[] = [];
  const acum = dreAnual.acumulado;

  acum.secoes.forEach((secao, si) => {
    rows.push({ type: 'header', titulo: secao.titulo });
    secao.linhas.forEach(l => rows.push({ type: 'linha', linha: l, sectionIdx: si }));
    rows.push({ type: 'separator' });
    if (secao.subtotal) {
      const margemMap: Record<string, string> = {
        'LUCRO BRUTO': 'Margem Bruta',
        'RESULTADO OPERACIONAL (EBITDA)': 'Margem EBITDA',
        'RESULTADO LÍQUIDO DO EXERCÍCIO': 'Margem Líquida',
      };
      const mn = margemMap[secao.subtotal.nome];
      rows.push({ type: 'subtotal', linha: secao.subtotal, margemNome: mn });
      if (mn) rows.push({ type: 'margem', nome: mn });
    }
  });

  // Helper to get value for a line in a specific month
  // @ts-ignore TS6133 - kept for future use
  const getMonthVal = (sectionIdx: number, linhaIdx: number, monthIdx: number): number => {
    const mDre = dreAnual.meses[monthIdx];
    if (!mDre || !mDre.secoes[sectionIdx]) return 0;
    const l = mDre.secoes[sectionIdx].linhas[linhaIdx];
    return l ? l.valor : 0;
  };

  const getSubtotalVal = (sectionIdx: number, monthIdx: number): number => {
    const mDre = dreAnual.meses[monthIdx];
    if (!mDre || !mDre.secoes[sectionIdx]) return 0;
    return mDre.secoes[sectionIdx].subtotal?.valor ?? 0;
  };

  // Track linha index within section for getMonthVal
  let currentSection = -1;
  let linhaInSection = -1;

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="flex border-b pb-1 mb-2">
          <div className="min-w-[250px] sticky left-0 bg-background z-10 text-xs text-muted-foreground font-bold px-3 py-1">
            Conta
          </div>
          {MESES_ABREV.map(m => (
            <div key={m} className="min-w-[80px] text-xs text-muted-foreground text-right px-1 py-1 font-bold">{m}</div>
          ))}
          <div className="min-w-[90px] text-xs text-muted-foreground text-right px-1 py-1 font-bold">ACUM.</div>
          {showAV && (
            <div className="min-w-[60px] text-xs text-muted-foreground text-right px-1 py-1 font-bold">AV%</div>
          )}
        </div>

        {/* Rows */}
        {rows.map((row, ri) => {
          if (row.type === 'header') {
            currentSection++;
            linhaInSection = -1;
            return (
              <div key={ri} className="flex items-center gap-2 mt-4 mb-1 px-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{row.titulo}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            );
          }
          if (row.type === 'separator') {
            return <Separator key={ri} className="my-1" />;
          }
          if (row.type === 'margem') {
            return (
              <div key={ri} className="flex">
                <div className="min-w-[250px] sticky left-0 bg-background z-10 px-3 py-0.5 pl-9">
                  <span className="text-xs italic text-muted-foreground">{row.nome}</span>
                </div>
                {MESES_ABREV.map((_, mi) => (
                  <div key={mi} className="min-w-[80px] text-xs text-right px-1 py-0.5 text-muted-foreground italic">—</div>
                ))}
                <div className="min-w-[90px] text-xs text-right px-1 py-0.5 text-muted-foreground italic font-mono">0.0%</div>
                {showAV && <div className="min-w-[60px]" />}
              </div>
            );
          }
          if (row.type === 'subtotal') {
            const sIdx = currentSection;
            const isTotal = row.linha.tipo === 'total';
            return (
              <div key={ri} className={cn("flex", isTotal ? "bg-muted/10 border-t border-b border-primary/30" : "bg-muted/5")}>
                <div className="min-w-[250px] sticky left-0 bg-inherit z-10 px-3 py-1.5">
                  <span className={cn("font-bold", isTotal ? "text-sm" : "text-xs")}>(=) {row.linha.nome}</span>
                </div>
                {MESES_ABREV.map((_, mi) => {
                  const v = getSubtotalVal(sIdx, mi);
                  return (
                    <TooltipProvider key={mi}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "min-w-[80px] text-right px-1 py-1.5 font-mono font-bold",
                            isTotal ? "text-xs" : "text-[11px]",
                            v > 0 && "text-emerald-400", v < 0 && "text-red-400", v === 0 && "text-muted-foreground",
                          )}>
                            {formatAbrev(v)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent><p>{formatBRL(v)}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
                <div className={cn(
                  "min-w-[90px] text-right px-1 py-1.5 font-mono font-bold",
                  isTotal ? "text-xs" : "text-[11px]",
                  row.linha.valor > 0 && "text-emerald-400",
                  row.linha.valor < 0 && "text-red-400",
                  row.linha.valor === 0 && "text-muted-foreground",
                )}>
                  {formatAbrev(row.linha.valor)}
                </div>
                {showAV && (
                  <div className="min-w-[60px] text-right px-1 py-1.5 text-xs text-muted-foreground font-mono font-bold">
                    {formatAV(row.linha.valor, acumRL)}
                  </div>
                )}
              </div>
            );
          }
          // row.type === 'linha'
          linhaInSection++;
          const sIdx = currentSection;
          const lIdx = linhaInSection;
          const l = row.linha;
          // @ts-ignore TS6133
          const hasCats = l.categorias && l.categorias.length > 0; void hasCats;

          return (
            <AnualLinhaRow
              key={ri}
              linha={l}
              sectionIdx={sIdx}
              linhaIdx={lIdx}
              dreAnual={dreAnual}
              showAV={showAV}
              showAH={showAH}
              acumRL={acumRL}
              expandAll={expandAll}
            />
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function AnualLinhaRow({ linha, sectionIdx, linhaIdx, dreAnual, showAV, showAH, acumRL, expandAll }: {
  linha: DRELinha; sectionIdx: number; linhaIdx: number; dreAnual: DREAnual;
  showAV: boolean; showAH: boolean; acumRL: number; expandAll: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(expandAll);
  const hasCats = linha.categorias && linha.categorias.length > 0;
  const isDespesa = linha.sinal === '-';

  useEffect(() => {
    setLocalExpanded(expandAll);
  }, [expandAll]);

  const monthValues = MESES_ABREV.map((_, mi) => {
    const mDre = dreAnual.meses[mi];
    if (!mDre?.secoes[sectionIdx]) return 0;
    return mDre.secoes[sectionIdx].linhas[linhaIdx]?.valor ?? 0;
  });

  return (
    <>
      <div
        className={cn("flex", hasCats && "hover:bg-muted/10 cursor-pointer")}
        onClick={() => hasCats && setLocalExpanded(p => !p)}
      >
        <div className="min-w-[250px] sticky left-0 bg-background z-10 px-3 py-1 flex items-center gap-1.5">
          {hasCats ? (
            <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", localExpanded && "rotate-90")} />
          ) : (
            <div className="w-3 shrink-0" />
          )}
          <span className="text-xs text-muted-foreground">({linha.sinal})</span>
          <span className="text-xs truncate">{linha.nome}</span>
          {hasCats && <span className="text-[10px] text-muted-foreground">({linha.categorias!.length})</span>}
        </div>
        {monthValues.map((v, mi) => (
          <TooltipProvider key={mi}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "min-w-[80px] text-right px-1 py-1 font-mono text-[11px]",
                  v > 0 && "text-emerald-400", v < 0 && "text-red-400", v === 0 && "text-muted-foreground",
                )}>
                  <div>{formatAbrev(v)}</div>
                  {showAH && mi > 0 && (
                    <AHBadge current={v} previous={monthValues[mi - 1]} isDespesa={isDespesa} />
                  )}
                  {showAH && mi === 0 && (
                    <span className="text-[9px] text-muted-foreground">—</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent><p>{formatBRL(v)}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        <div className={cn(
          "min-w-[90px] text-right px-1 py-1 font-mono text-[11px]",
          linha.valor > 0 && "text-emerald-400", linha.valor < 0 && "text-red-400", linha.valor === 0 && "text-muted-foreground",
        )}>
          {formatAbrev(linha.valor)}
        </div>
        {showAV && (
          <div className="min-w-[60px] text-right px-1 py-1 text-[11px] text-muted-foreground font-mono">
            {formatAV(linha.valor, acumRL)}
          </div>
        )}
      </div>
      {localExpanded && hasCats && (
        <div className="bg-muted/5 border-l-2 border-muted ml-4">
          {linha.categorias!.map((cat, ci) => (
            <div key={ci} className="flex">
              <div className="min-w-[250px] sticky left-0 bg-inherit z-10 px-3 py-0.5 pl-10">
                <span className="text-[10px] text-muted-foreground">· {cat}</span>
              </div>
              {MESES_ABREV.map((_, mi) => (
                <div key={mi} className="min-w-[80px] text-right px-1 py-0.5 font-mono text-[10px] text-muted-foreground">0</div>
              ))}
              <div className="min-w-[90px] text-right px-1 py-0.5 font-mono text-[10px] text-muted-foreground">0</div>
              {showAV && <div className="min-w-[60px]" />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AHBadge({ current, previous, isDespesa }: { current: number; previous: number; isDespesa: boolean }) {
  if (previous === 0) return <span className="text-[9px] text-muted-foreground">—</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = pct >= 0;
  // For expenses, increase = bad (red); for revenue, increase = good (green)
  const isGood = isDespesa ? !isPositive : isPositive;
  return (
    <span className={cn("text-[9px]", isGood ? "text-emerald-400/70" : "text-red-400/70")}>
      ({isPositive ? '+' : ''}{pct.toFixed(0)}%)
    </span>
  );
}

// ─── Main page ───

export default function FinanceiroDRE() {
  const now = new Date();
  const [mes, setMes] = useState(MESES[now.getMonth()]);
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [visao, setVisao] = useState<'mensal' | 'anual'>('mensal');
  const [expandAllCounter, setExpandAllCounter] = useState(0);
  const [expandAllState, setExpandAllState] = useState(false);

  const handleExpandAll = () => {
    setExpandAllState(true);
    setExpandAllCounter(prev => prev + 1);
  };
  const handleCollapseAll = () => {
    setExpandAllState(false);
    setExpandAllCounter(prev => prev + 1);
  };
  const [showAV, setShowAV] = useState(true);
  const [showAH, setShowAH] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfTipo, setPdfTipo] = useState<'sintetico' | 'analitico'>('analitico');
  const [pdfVisao, setPdfVisao] = useState<'mensal' | 'anual'>('mensal');
  const [pdfIncludeAV, setPdfIncludeAV] = useState(true);
  const [pdfIncludeMargens, setPdfIncludeMargens] = useState(true);
  const [pdfIncludeAH, setPdfIncludeAH] = useState(false);

  const periodo = `${mes} ${ano}`;
  const queryClient = useQueryClient();
  const { data: dreResult } = useDREData(Number(ano));
  const dreData = dreResult?.dados;
  const { data: categoriasDB } = useCategoriasAtivas();

  const { data: lastSync } = useQuery({
    queryKey: ['dre-last-sync'],
    queryFn: async () => {
      const { data } = await supabase
        .from('omie_sync_log')
        .select('finalizado_em')
        .eq('status', 'SUCESSO')
        .order('finalizado_em', { ascending: false })
        .limit(1)
        .single();
      return data?.finalizado_em ?? null;
    },
  });

  const handleSyncComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['dre-data'] });
    queryClient.invalidateQueries({ queryKey: ['dre-last-sync'] });
  };

  const dre = useMemo(() => {
    if (dreData && categoriasDB) {
      const mesNum = MESES.indexOf(mes) + 1;
      return buildDREComDados(periodo, dreData, mesNum, categoriasDB);
    }
    return buildDREEstrutura(periodo);
  }, [periodo, dreData, categoriasDB, mes]);

  const dreAnual = useMemo(() => {
    if (dreData && categoriasDB) {
      return buildDREAnualComDados(Number(ano), dreData, categoriasDB);
    }
    return buildDREAnual(Number(ano));
  }, [ano, dreData, categoriasDB]);

  const hasDadosReais = dreData && dreData.length > 0;
  const unmappedCategories = dreResult?.unmapped ?? [];

  // Compute KPI values from DRE structure
  const receitaBruta = dre.secoes[0]?.linhas[0]?.valor ?? 0;
  void dre.secoes[0]?.linhas[1]?.valor; // deducoes
  const receitaLiquida = dre.secoes[0]?.subtotal?.valor ?? 0;
  const custoCSP = dre.secoes[1]?.linhas[0]?.valor ?? 0;
  const custoOutros = dre.secoes[1]?.linhas[1]?.valor ?? 0;
  const custosTotais = Math.abs(custoCSP) + Math.abs(custoOutros);
  const ebitda = dre.secoes[2]?.subtotal?.valor ?? 0;
  const resultadoLiquido = dre.resultado?.valor ?? 0;

  const margemRL = receitaBruta !== 0 ? (receitaLiquida / receitaBruta * 100) : 0;
  const margemCustos = receitaLiquida !== 0 ? (custosTotais / Math.abs(receitaLiquida) * 100) : 0;
  const margemEBITDA = receitaLiquida !== 0 ? (ebitda / Math.abs(receitaLiquida) * 100) : 0;
  const margemLiquida = receitaLiquida !== 0 ? (resultadoLiquido / Math.abs(receitaLiquida) * 100) : 0;

  const kpis = [
    { label: 'Receita Líquida', valor: receitaLiquida, margem: `${margemRL.toFixed(1)}% s/RB`, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Custos Totais', valor: -custosTotais, margem: `${margemCustos.toFixed(1)}% s/RL`, icon: TrendingDown, color: 'text-red-400' },
    { label: 'EBITDA', valor: ebitda, margem: `Margem ${margemEBITDA.toFixed(1)}%`, icon: DollarSign, color: ebitda >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Resultado Líquido', valor: resultadoLiquido, margem: `Margem ${margemLiquida.toFixed(1)}%`, icon: BarChart3, color: resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> DRE — Demonstrativo de Resultado
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">Demonstrativo de resultado do exercício.</p>
          {hasDadosReais && (
              <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                Dados Omie
              </Badge>
            )}
            {hasDadosReais && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-help border-b border-dashed border-muted-foreground/40">
                      Impostos por alíquota
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Impostos calculados sobre receita bruta (Lucro Presumido):</p>
                    <p className="text-xs mt-1">ISS 3% · PIS 0,65% · COFINS 3% → Deduções</p>
                    <p className="text-xs">IRPJ 4,80% · CSLL 2,88% → Impostos s/ Lucro</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {lastSync && (
            <p className="text-xs text-muted-foreground mt-1">
              Última sincronização: {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={mes} onValueChange={setMes} disabled={visao === 'anual'}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Vision toggle */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Visão:</span>
            <Button
              variant={visao === 'mensal' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setVisao('mensal')}
            >
              Mensal
            </Button>
            <Button
              variant={visao === 'anual' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setVisao('anual')}
            >
              Anual
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Analysis toggles */}
          <Button
            variant={showAV ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAV(!showAV)}
            className="text-xs h-7 px-2"
          >
            AV%
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant={showAH ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowAH(!showAH)}
                    disabled={visao !== 'anual'}
                    className="text-xs h-7 px-2"
                  >
                    AH%
                  </Button>
                </span>
              </TooltipTrigger>
              {visao !== 'anual' && (
                <TooltipContent><p>Disponível na visão anual</p></TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Expand/Collapse */}
          <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={handleExpandAll}>
            <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expandir
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={handleCollapseAll}>
            <Minimize2 className="h-3.5 w-3.5 mr-1" /> Recolher
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Export */}
          <Button variant="outline" size="sm" onClick={() => setPdfDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <SyncButton lastSyncAt={lastSync} onSyncComplete={handleSyncComplete} />
        </div>

        {/* Orphan categories alert */}
        {unmappedCategories.length > 0 && (
          <Alert className="border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>{unmappedCategories.length} categorias Omie não mapeadas</AlertTitle>
            <AlertDescription>
              {(() => {
                const arTotal = unmappedCategories.filter(u => u.tipo === 'AR').reduce((s, u) => s + u.total, 0);
                const apTotal = unmappedCategories.filter(u => u.tipo === 'AP').reduce((s, u) => s + u.total, 0);
                const parts: string[] = [];
                if (arTotal > 0) parts.push(`${formatBRL(arTotal)} em receitas`);
                if (apTotal > 0) parts.push(`${formatBRL(apTotal)} em despesas`);
                return parts.length > 0 ? `${parts.join(', ')} usando classificação automática. ` : 'Usando classificação automática. ';
              })()}
              <Link to="/financeiro/mapeamento-categorias" className="underline ml-1">Vincular na página de mapeamento →</Link>
            </AlertDescription>
          </Alert>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(kpi => (
            <div key={kpi.label} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <kpi.icon className="h-3.5 w-3.5" />
                {kpi.label}
              </div>
              <p className={cn("text-lg font-bold font-mono tabular-nums", kpi.color)}>
                {formatBRL(kpi.valor)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.margem}</p>
            </div>
          ))}
        </div>

        {/* DRE Table */}
        <div className="border rounded-lg p-4 sm:p-6">
          <div className="text-center mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Demonstrativo de Resultado do Exercício (DRE)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Período: {visao === 'mensal' ? periodo : `Janeiro a Dezembro ${ano}`}
            </p>
          </div>

          {visao === 'mensal' ? (
            <>
              {/* Column headers */}
              <div className="flex items-center justify-end gap-4 mb-2 px-3">
                <span className="text-xs text-muted-foreground w-32 text-right">Valor</span>
                {showAV && <span className="text-xs text-muted-foreground w-16 text-right">AV%</span>}
              </div>
              {dre.secoes.map(secao => (
                <DRESecaoBlockMensal
                  key={`${secao.id}-${expandAllCounter}`}
                  secao={secao}
                  expandAll={expandAllState}
                  showAV={showAV}
                  receitaLiquida={receitaLiquida}
                />
              ))}
            </>
          ) : (
            <DREAnualView key={expandAllCounter} dreAnual={dreAnual} showAV={showAV} showAH={showAH} expandAll={expandAllState} />
          )}
        </div>

        {/* PDF Export Dialog */}
        <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exportar DRE em PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de relatório:</Label>
                <RadioGroup value={pdfTipo} onValueChange={(v) => setPdfTipo(v as 'sintetico' | 'analitico')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sintetico" id="pdf-sintetico" />
                    <Label htmlFor="pdf-sintetico" className="text-sm">Sintético — Apenas contas e subtotais</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="analitico" id="pdf-analitico" />
                    <Label htmlFor="pdf-analitico" className="text-sm">Analítico — Com detalhamento por categoria</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Visão:</Label>
                <RadioGroup value={pdfVisao} onValueChange={(v) => setPdfVisao(v as 'mensal' | 'anual')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mensal" id="pdf-mensal" />
                    <Label htmlFor="pdf-mensal" className="text-sm">Mensal — Apenas o mês selecionado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="anual" id="pdf-anual" />
                    <Label htmlFor="pdf-anual" className="text-sm">Anual — Todos os meses + acumulado</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Incluir:</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pdf-av" checked={pdfIncludeAV} onCheckedChange={(c) => setPdfIncludeAV(!!c)} />
                    <Label htmlFor="pdf-av" className="text-sm">Análise vertical (AV%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pdf-margens" checked={pdfIncludeMargens} onCheckedChange={(c) => setPdfIncludeMargens(!!c)} />
                    <Label htmlFor="pdf-margens" className="text-sm">Indicadores gerenciais (margens)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pdf-ah" checked={pdfIncludeAH} onCheckedChange={(c) => setPdfIncludeAH(!!c)} disabled={pdfVisao === 'mensal'} />
                    <Label htmlFor="pdf-ah" className={cn("text-sm", pdfVisao === 'mensal' && "text-muted-foreground")}>
                      Análise horizontal (AH%) — apenas visão anual
                    </Label>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Período: {pdfVisao === 'mensal' ? periodo : `Janeiro a Dezembro ${ano}`}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                setPdfDialogOpen(false);
                if (!hasDadosReais) {
                  toast({ title: 'Importe dados financeiros antes de exportar.', variant: 'destructive' });
                  return;
                }
                exportDREtoPDF({
                  dreAnual,
                  dre,
                  visao: pdfVisao,
                  tipo: pdfTipo,
                  includeAV: pdfIncludeAV,
                  includeMargens: pdfIncludeMargens,
                  includeAH: pdfIncludeAH,
                  periodoLabel: periodo,
                  mes,
                  ano,
                });
                toast({ title: 'PDF exportado com sucesso!' });
              }}>
                Exportar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
