import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, X, ChevronDown, ChevronUp, CheckCircle2, Database } from 'lucide-react';
import DataTable, { type ColumnDef, ValueCell, formatDateBR } from './DataTable';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao } from '@/calculations/conciliacao/types';

interface ImportPreviewCardProps {
  type: 'banco' | 'omie' | 'cartao';
  title: string;
  icon: React.ElementType;
  headerClass: string;
  iconClass: string;
  info: {
    fileName: string;
    rowCount: number;
    period?: string;
    contasCorrentes?: string[];
    valorTotal?: number;
    parsedBanco?: LancamentoBanco[];
    parsedOmie?: LancamentoOmie[];
    parsedCartao?: TransacaoCartao[];
  } | null;
  isSaved: boolean;
  accept: string;
  onRemove: () => void;
  onDrop: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const bancoCols: ColumnDef<LancamentoBanco>[] = [
  { key: 'dataStr', label: 'Data', render: r => formatDateBR(r.data) },
  { key: 'descricao', label: 'Descrição' },
  { key: 'valor', label: 'Valor', align: 'right', render: r => <ValueCell value={r.valor} />, getValue: r => r.valor },
  { key: 'saldo', label: 'Saldo', align: 'right', render: r => r.saldo != null ? <ValueCell value={r.saldo} /> : <span className="text-muted-foreground">—</span>, getValue: r => r.saldo ?? 0 },
];

const omieCols: ColumnDef<LancamentoOmie>[] = [
  { key: 'dataStr', label: 'Data', render: r => formatDateBR(r.data) },
  { key: 'clienteFornecedor', label: 'Descrição' },
  { key: 'valor', label: 'Valor', align: 'right', render: r => <ValueCell value={r.valor} />, getValue: r => r.valor },
  { key: 'categoria', label: 'Categoria' },
  { key: 'notaFiscal', label: 'NF' },
];

const cartaoCols: ColumnDef<TransacaoCartao>[] = [
  { key: 'dataStr', label: 'Data', render: r => formatDateBR(r.data) },
  { key: 'descricao', label: 'Descrição' },
  { key: 'valor', label: 'Valor', align: 'right', render: r => <ValueCell value={r.valor} />, getValue: r => r.valor },
  { key: 'categoriaSugerida', label: 'Categoria Mapeada' },
];

export default function ImportPreviewCard({
  type, title, icon: Icon, headerClass, iconClass,
  info, isSaved, accept,
  onRemove, onDrop, onInputChange, inputRef,
}: ImportPreviewCardProps) {
  const [open, setOpen] = useState(false);

  const getData = () => {
    if (type === 'banco') return info?.parsedBanco || [];
    if (type === 'omie') return info?.parsedOmie || [];
    return info?.parsedCartao || [];
  };

  const getColumns = (): ColumnDef<any>[] => {
    if (type === 'banco') return bancoCols;
    if (type === 'omie') return omieCols;
    return cartaoCols;
  };

  const getSearchKeys = () => {
    if (type === 'banco') return ['descricao', 'nome', 'documento'];
    if (type === 'omie') return ['clienteFornecedor', 'categoria', 'notaFiscal', 'documento'];
    return ['descricao', 'categoriaSugerida', 'titular'];
  };

  const totalValue = () => {
    const d = getData() as any[];
    return d.reduce((s: number, r: any) => s + (r.valor || 0), 0);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${headerClass} py-3 px-4`}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {info ? (
          <Collapsible open={open} onOpenChange={setOpen}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate max-w-[180px]">{info.fileName}</span>
                <div className="flex items-center gap-1">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{info.rowCount} lançamentos</p>
                {info.period && info.period !== '--' && <p>Período: {info.period}</p>}
                {info.contasCorrentes && info.contasCorrentes.length > 0 && (
                  <p>Contas: {info.contasCorrentes.join(', ')}</p>
                )}
                {info.valorTotal != null && <p>Total: {formatCurrency(info.valorTotal)}</p>}
              </div>
              <div className="flex items-center gap-2">
                {isSaved ? (
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                    <Database className="h-3 w-3 mr-1" /> Salvo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Carregado
                  </Badge>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                    {open ? 'Ocultar' : 'Ver dados'}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="mt-3">
              <DataTable
                columns={getColumns()}
                data={getData()}
                searchKeys={getSearchKeys()}
                totalLabel="Total"
                totalValue={totalValue()}
                pageSize={50}
              />
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors"
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Arraste ou clique para carregar</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onInputChange}
        />
      </CardContent>
    </Card>
  );
}
