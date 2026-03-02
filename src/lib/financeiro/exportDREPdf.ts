import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DREAnual, DRERelatorio } from '@/calculations/conciliacao/types';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface ExportDREOptions {
  dreAnual: DREAnual;
  dre: DRERelatorio;
  visao: 'mensal' | 'anual';
  tipo: 'sintetico' | 'analitico';
  includeAV: boolean;
  includeMargens: boolean;
  includeAH: boolean;
  periodoLabel: string;
  mes: string;
  ano: string;
}

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function formatAV(valor: number, receitaLiquida: number): string {
  if (receitaLiquida === 0) return '—';
  return `${((valor / receitaLiquida) * 100).toFixed(1)}%`;
}

function getReceitaLiquida(relatorio: DRERelatorio): number {
  return relatorio.secoes[0]?.subtotal?.valor ?? 0;
}

// Margin names mapped to subtotal names
const MARGEM_MAP: Record<string, string> = {
  'LUCRO BRUTO': 'Margem Bruta',
  'RESULTADO OPERACIONAL (EBITDA)': 'Margem EBITDA',
  'RESULTADO LÍQUIDO DO EXERCÍCIO': 'Margem Líquida',
};

type RowStyle = 'normal' | 'header' | 'subtotal' | 'total' | 'margem' | 'categoria';

interface TableRow {
  cells: string[];
  style: RowStyle;
  negativeIndices?: number[]; // column indices with negative values
}

function buildMensalRows(dre: DRERelatorio, opts: ExportDREOptions): { head: string[]; rows: TableRow[] } {
  const rl = getReceitaLiquida(dre);
  const head = ['Conta', 'Valor'];
  if (opts.includeAV) head.push('AV%');

  const rows: TableRow[] = [];

  for (const secao of dre.secoes) {
    // Section header
    rows.push({ cells: [secao.titulo, '', ...(opts.includeAV ? [''] : [])], style: 'header' });

    for (const linha of secao.linhas) {
      const row: string[] = [`  (${linha.sinal}) ${linha.nome}`, formatBRL(linha.valor)];
      if (opts.includeAV) row.push(formatAV(linha.valor, rl));
      const neg: number[] = linha.valor < 0 ? [1] : [];
      rows.push({ cells: row, style: 'normal', negativeIndices: neg });

      // Analytic: show categories
      if (opts.tipo === 'analitico' && linha.categorias?.length) {
        for (const cat of linha.categorias) {
          const catRow = [`      · ${cat}`, '', ...(opts.includeAV ? [''] : [])];
          rows.push({ cells: catRow, style: 'categoria' });
        }
      }
    }

    // Subtotal
    if (secao.subtotal) {
      const st = secao.subtotal;
      const isTotal = st.tipo === 'total';
      const stRow = [`(=) ${st.nome}`, formatBRL(st.valor)];
      if (opts.includeAV) stRow.push(formatAV(st.valor, rl));
      const neg: number[] = st.valor < 0 ? [1] : [];
      rows.push({ cells: stRow, style: isTotal ? 'total' : 'subtotal', negativeIndices: neg });

      // Margins
      if (opts.includeMargens && MARGEM_MAP[st.nome] && rl !== 0) {
        const pct = ((st.valor / rl) * 100).toFixed(1) + '%';
        rows.push({ cells: [`    ${MARGEM_MAP[st.nome]}`, pct, ...(opts.includeAV ? [''] : [])], style: 'margem' });
      }
    }
  }

  return { head, rows };
}

function buildAnualRows(dreAnual: DREAnual, opts: ExportDREOptions): { head: string[]; rows: TableRow[] } {
  const acumRL = getReceitaLiquida(dreAnual.acumulado);
  const head = ['Conta', ...MESES_ABREV, 'Acum.'];
  if (opts.includeAV) head.push('AV%');

  const rows: TableRow[] = [];
  const acum = dreAnual.acumulado;

  for (let si = 0; si < acum.secoes.length; si++) {
    const secao = acum.secoes[si];

    // Section header
    rows.push({ cells: [secao.titulo, ...Array(MESES_ABREV.length + 1 + (opts.includeAV ? 1 : 0)).fill('')], style: 'header' });

    for (let li = 0; li < secao.linhas.length; li++) {
      const linha = secao.linhas[li];
      const monthVals = MESES_ABREV.map((_, mi) => {
        const mDre = dreAnual.meses[mi];
        return mDre?.secoes[si]?.linhas[li]?.valor ?? 0;
      });

      const row = [
        `(${linha.sinal}) ${linha.nome}`,
        ...monthVals.map(v => formatBRL(v)),
        formatBRL(linha.valor),
      ];
      if (opts.includeAV) row.push(formatAV(linha.valor, acumRL));

      const neg: number[] = [];
      monthVals.forEach((v, i) => { if (v < 0) neg.push(i + 1); });
      if (linha.valor < 0) neg.push(MESES_ABREV.length + 1);

      rows.push({ cells: row, style: 'normal', negativeIndices: neg });

      if (opts.tipo === 'analitico' && linha.categorias?.length) {
        for (const cat of linha.categorias) {
          rows.push({ cells: [`    · ${cat}`, ...Array(MESES_ABREV.length + 1 + (opts.includeAV ? 1 : 0)).fill('')], style: 'categoria' });
        }
      }
    }

    // Subtotal
    if (secao.subtotal) {
      const st = secao.subtotal;
      const isTotal = st.tipo === 'total';
      const stMonths = MESES_ABREV.map((_, mi) => {
        const mDre = dreAnual.meses[mi];
        return mDre?.secoes[si]?.subtotal?.valor ?? 0;
      });

      const stRow = [
        `(=) ${st.nome}`,
        ...stMonths.map(v => formatBRL(v)),
        formatBRL(st.valor),
      ];
      if (opts.includeAV) stRow.push(formatAV(st.valor, acumRL));

      const neg: number[] = [];
      stMonths.forEach((v, i) => { if (v < 0) neg.push(i + 1); });
      if (st.valor < 0) neg.push(MESES_ABREV.length + 1);

      rows.push({ cells: stRow, style: isTotal ? 'total' : 'subtotal', negativeIndices: neg });

      if (opts.includeMargens && MARGEM_MAP[st.nome] && acumRL !== 0) {
        const pct = ((st.valor / acumRL) * 100).toFixed(1) + '%';
        const margemRow = [`    ${MARGEM_MAP[st.nome]}`, ...Array(MESES_ABREV.length).fill(''), pct];
        if (opts.includeAV) margemRow.push('');
        rows.push({ cells: margemRow, style: 'margem' });
      }
    }
  }

  return { head, rows };
}

export function exportDREtoPDF(opts: ExportDREOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(14);
  doc.text('Demonstração do Resultado do Exercício (DRE)', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  const periodoText = opts.visao === 'mensal' ? opts.periodoLabel : `Janeiro a Dezembro ${opts.ano}`;
  doc.text(periodoText, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

  const { head, rows } = opts.visao === 'mensal'
    ? buildMensalRows(opts.dre, opts)
    : buildAnualRows(opts.dreAnual, opts);

  const body = rows.map(r => r.cells);

  autoTable(doc, {
    startY: 28,
    head: [head],
    body,
    theme: 'grid',
    styles: {
      fontSize: opts.visao === 'anual' ? 6.5 : 9,
      cellPadding: 1.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: opts.visao === 'anual' ? 50 : 120 },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const rowIdx = data.row.index;
      const rowMeta = rows[rowIdx];
      if (!rowMeta) return;

      // Right-align value columns
      if (data.column.index > 0) {
        data.cell.styles.halign = 'right';
      }

      // Style based on row type
      switch (rowMeta.style) {
        case 'header':
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [40, 40, 40];
          break;
        case 'subtotal':
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = 'bold';
          break;
        case 'total':
          data.cell.styles.fillColor = [200, 200, 210];
          data.cell.styles.fontStyle = 'bold';
          break;
        case 'margem':
          data.cell.styles.fontStyle = 'italic';
          data.cell.styles.textColor = [120, 120, 120];
          data.cell.styles.fontSize = opts.visao === 'anual' ? 5.5 : 8;
          break;
        case 'categoria':
          data.cell.styles.textColor = [140, 140, 140];
          data.cell.styles.fontSize = opts.visao === 'anual' ? 5.5 : 7.5;
          break;
      }

      // Negative values in red
      if (rowMeta.negativeIndices?.includes(data.column.index)) {
        data.cell.styles.textColor = [200, 50, 50];
      }
    },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    const now = new Date();
    const dateStr = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(`Gerado em ${dateStr}`, 14, pageH - 8);
    doc.text('PowerConcept', pageW - 14, pageH - 8, { align: 'right' });
  }

  // Save
  const fileName = opts.visao === 'mensal'
    ? `DRE_${opts.ano}_${opts.mes}.pdf`
    : `DRE_${opts.ano}_Anual.pdf`;
  doc.save(fileName);
}
