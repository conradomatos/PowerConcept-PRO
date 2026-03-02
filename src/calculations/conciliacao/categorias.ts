import type { CategoriaGrupo, CategoriaItem, CategoriasStorage } from './types';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'powerconcept_categorias_v2';

// ===== KEYWORDS PRÉ-POPULADAS =====
const KEYWORDS_SEED: Record<string, string[]> = {
  'COMBUSTIVEIS': ['POSTO', 'COMBUST', 'SHELL', 'IPIRANGA', 'GASOLINA', 'BR MANIA', 'PETROBRAS', 'DIESEL'],
  'ALIMENTACAO (OPERACAO)': ['RESTAURANTE', 'LANCHONETE', 'LANCHES', 'PADARIA', 'PANIFICADORA', 'MARMITEX', 'REFEICAO', 'COMIDA', 'GRACIOSA', 'TIBAGI'],
  'ALIMENTACAO (DIRETORIA)': ['OUTBACK', 'MADERO', 'BARBACOA', 'COCO BAMBU', 'BUFFALO RANCH', 'CAMPODORO', 'MADALOSSO'],
  'ALIMENTACAO (ADMINISTRATIVO)': ['IFOOD', 'RAPPI', 'UBER EATS'],
  'MERCADO': ['MERCADO', 'SUPERMERCADO', 'HIPERMERCADO', 'ZANETTI', 'CONDOR', 'MUFFATO', 'ATACADAO'],
  'TELEFONIA E INTERNET': ['VIVO', 'CLARO', 'TIM', 'TELEFONICA', 'INTERNET', 'TELECOM'],
  'MATERIAIS APLICADOS NA PRESTAÇÃO DE SERVIÇOS': ['MAT CONSTR', 'ELETRICA', 'HIDRAULICA', 'FERRAGEM', 'LEROY', 'TELHA', 'CIMENTO'],
  'MANUTENCAO DE VEICULOS': ['BORRACHARIA', 'MECANICA', 'PNEU', 'AUTO CENTER', 'LAVA CAR', 'OFICINA', 'AUTOPECA'],
  'PEDAGIOS': ['PEDAGIO', 'ECOVIA', 'RODONORTE', 'EPR', 'ARTERIS', 'ECORODOVIAS', 'CCR'],
  'FERRAMENTAS': ['FERRAMENT', 'MAKITA', 'BOSCH', 'DEWALT', 'STANLEY'],
  'UNIFORMES E EPIS': ['EPI', 'UNIFORME', 'BOTA', 'CAPACETE', 'LUVA', 'PORTO EPI'],
  'SOFTWARES DE ENGENHARIA / OPERACIONAL': ['SOFTWARE', 'LICENCA', 'AUTODESK', 'AUTOCAD', 'REVIT'],
  'CURSOS E TREINAMENTOS OPERACIONAIS': ['CURSO', 'TREINAMENTO', 'CAPACITACAO', 'UDEMY', 'ALURA'],
  'DESPESAS COM HOSPEDAGENS': ['HOTEL', 'POUSADA', 'HOSTEL', 'AIRBNB', 'BOOKING'],
  'TRANSPORTE URBANO (TÁXI, UBER)': ['UBER', 'TAXI', '99POP', '99TAXI', 'CABIFY'],
  'ESTACIONAMENTOS': ['ESTACIONAMENTO', 'PARK'],
  'SEGUROS DE VEICULOS': ['PORTO SEGURO', 'SEGURO AUTO'],
  'EQUIPAMENTOS DE INFORMÁTICA': ['NOTEBOOK', 'COMPUTADOR', 'MONITOR', 'IMPRESSORA'],
};

// ===== STORAGE =====

export function loadCategoriasStorage(): CategoriasStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === 2) return parsed;
    }
  } catch (e) { /* ignore */ }

  const seed = getDefaultCategoriasStorage();
  saveCategoriasStorage(seed);
  return seed;
}

export function saveCategoriasStorage(data: CategoriasStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== SUGGEST CATEGORIA (compatível com Fase 4) =====

export function suggestCategoria(descricao: string): string {
  const storage = loadCategoriasStorage();
  if (!descricao) return storage.categoriaPadrao;

  const descUpper = descricao.toUpperCase().trim();

  for (const cat of storage.categorias) {
    if (!cat.ativa || !cat.keywords?.length) continue;
    for (const kw of cat.keywords) {
      if (kw && descUpper.includes(kw.toUpperCase())) {
        return cat.nome;
      }
    }
  }

  return storage.categoriaPadrao;
}

// ===== IMPORT/EXPORT EXCEL =====

export interface ImportRow {
  grupo: string;
  tipo: string;
  nome: string;
  contaDRE: string;
  tipoGasto: string;
  keywords: string;
  obs: string;
  ativa: string;
}

export interface ImportPreview {
  gruposEncontrados: number;
  categoriasEncontradas: number;
  novas: number;
  modificadas: number;
  semAlteracao: number;
  dados: ImportRow[];
}

export function gerarTemplateXlsx(): void {
  const rows: string[][] = [
    ['Grupo', 'Tipo', 'Nome da Categoria', 'Conta do DRE', 'Tipo de Gasto', 'Keywords', 'Observações', 'Ativa'],
    ['Despesas Diretas', 'Despesa', 'COMBUSTIVEIS', '(-) - Custo dos Serviços Prestados', 'Compras', 'POSTO, SHELL, IPIRANGA', '', 'Sim'],
    ['Receitas Diretas', 'Receita', 'RECEITAS DE SERVIÇOS', '(+) - Receita Bruta de Vendas', '', '', '', 'Sim'],
    ['Despesas Administrativas', 'Despesa', 'ALUGUEL', '(-) - Despesas Administrativas', '', '', '', 'Sim'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 30 }, { wch: 10 }, { wch: 45 }, { wch: 40 },
    { wch: 45 }, { wch: 50 }, { wch: 30 }, { wch: 6 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Categorias');
  XLSX.writeFile(wb, 'modelo_categorias.xlsx');
}

export function exportarCategoriasXlsx(storage: CategoriasStorage): void {
  
  const sortedGrupos = [...storage.grupos].sort((a, b) => a.ordem - b.ordem);
  const rows: string[][] = [['Grupo', 'Tipo', 'Nome da Categoria', 'Conta do DRE', 'Tipo de Gasto', 'Keywords', 'Observações', 'Ativa']];

  for (const grupo of sortedGrupos) {
    const cats = storage.categorias
      .filter(c => c.grupoId === grupo.id)
      .sort((a, b) => a.ordem - b.ordem);
    for (const cat of cats) {
      rows.push([
        grupo.nome,
        grupo.tipo,
        cat.nome,
        cat.contaDRE,
        cat.tipoGasto,
        cat.keywords.join(', '),
        cat.observacoes,
        cat.ativa ? 'Sim' : 'Não',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 30 }, { wch: 10 }, { wch: 45 }, { wch: 40 },
    { wch: 45 }, { wch: 50 }, { wch: 30 }, { wch: 6 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Categorias');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `categorias_contabeis_${today}.xlsx`);
}

export async function importarCategoriasXlsx(file: File, currentStorage: CategoriasStorage): Promise<ImportPreview> {
  
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Skip header row
  const dataRows = raw.slice(1).filter(r => r.some(cell => String(cell).trim()));
  const dados: ImportRow[] = dataRows.map(r => ({
    grupo: String(r[0] || '').trim(),
    tipo: String(r[1] || '').trim(),
    nome: String(r[2] || '').trim(),
    contaDRE: String(r[3] || '').trim(),
    tipoGasto: String(r[4] || '').trim(),
    keywords: String(r[5] || '').trim(),
    obs: String(r[6] || '').trim(),
    ativa: String(r[7] || '').trim(),
  })).filter(r => r.nome);

  const gruposSet = new Set(dados.map(d => d.grupo).filter(Boolean));
  let novas = 0, modificadas = 0, semAlteracao = 0;

  for (const row of dados) {
    const existing = currentStorage.categorias.find(c => c.nome.trim().toUpperCase() === row.nome.toUpperCase());
    if (!existing) {
      novas++;
    } else {
      const kwParsed = row.keywords ? row.keywords.split(',').map(k => k.trim().toUpperCase()).filter(Boolean).join(',') : '';
      const kwExisting = existing.keywords.join(',');
      const changed = existing.contaDRE !== row.contaDRE ||
        existing.tipoGasto !== row.tipoGasto ||
        kwExisting !== kwParsed ||
        existing.observacoes !== row.obs;
      if (changed) modificadas++;
      else semAlteracao++;
    }
  }

  return {
    gruposEncontrados: gruposSet.size,
    categoriasEncontradas: dados.length,
    novas,
    modificadas,
    semAlteracao,
    dados,
  };
}

function parseAtiva(val: string): boolean {
  if (!val || val.trim() === '') return true;
  return ['sim', 's', 'true', '1'].includes(val.trim().toLowerCase());
}

export function aplicarImportacao(storage: CategoriasStorage, dados: ImportRow[]): CategoriasStorage {
  const updated: CategoriasStorage = JSON.parse(JSON.stringify(storage));

  for (const row of dados) {
    if (!row.nome) continue;

    // Ensure group exists
    let grupo = updated.grupos.find(g => g.nome.trim().toUpperCase() === row.grupo.toUpperCase());
    if (!grupo && row.grupo) {
      const maxOrdem = Math.max(0, ...updated.grupos.map(g => g.ordem));
      grupo = {
        id: crypto.randomUUID(),
        nome: row.grupo.trim(),
        tipo: (row.tipo === 'Receita' ? 'Receita' : 'Despesa') as 'Receita' | 'Despesa',
        ordem: maxOrdem + 1,
        ativa: true,
      };
      updated.grupos.push(grupo);
    }

    const keywords = row.keywords ? row.keywords.split(',').map(k => k.trim().toUpperCase()).filter(Boolean) : [];
    const existing = updated.categorias.find(c => c.nome.trim().toUpperCase() === row.nome.toUpperCase());

    if (existing) {
      existing.contaDRE = row.contaDRE;
      existing.tipoGasto = row.tipoGasto;
      existing.keywords = keywords;
      existing.observacoes = row.obs;
      existing.ativa = parseAtiva(row.ativa);
      if (grupo) {
        existing.grupoId = grupo.id;
        existing.tipo = grupo.tipo;
      }
    } else if (grupo) {
      const catsInGroup = updated.categorias.filter(c => c.grupoId === grupo!.id);
      const maxOrdem = Math.max(0, ...catsInGroup.map(c => c.ordem));
      updated.categorias.push({
        id: crypto.randomUUID(),
        grupoId: grupo.id,
        nome: row.nome.trim(),
        tipo: grupo.tipo,
        contaDRE: row.contaDRE,
        tipoGasto: row.tipoGasto,
        keywords,
        observacoes: row.obs,
        ativa: parseAtiva(row.ativa),
        ordem: maxOrdem + 1,
      });
    }
  }

  return updated;
}

// ===== USAGE / TRANSFER =====

export function getCategoriaUsageCount(categoriaNome: string): number {
  const conciliacaoData = localStorage.getItem('powerconcept_ultima_conciliacao');
  if (!conciliacaoData) return 0;

  try {
    const data = JSON.parse(conciliacaoData);
    let count = 0;
    if (data.cartao?.length) {
      count += data.cartao.filter((t: any) => t.categoria?.toUpperCase() === categoriaNome.toUpperCase()).length;
    }
    if (data.conciliados?.length) {
      count += data.conciliados.filter((t: any) => t.categoria?.toUpperCase() === categoriaNome.toUpperCase()).length;
    }
    return count;
  } catch {
    return 0;
  }
}

export function transferirLancamentos(categoriaOrigem: string, categoriaDestino: string): number {
  const conciliacaoData = localStorage.getItem('powerconcept_ultima_conciliacao');
  if (!conciliacaoData) return 0;

  try {
    const data = JSON.parse(conciliacaoData);
    let transferred = 0;
    if (data.cartao?.length) {
      for (const t of data.cartao) {
        if (t.categoria?.toUpperCase() === categoriaOrigem.toUpperCase()) {
          t.categoria = categoriaDestino;
          transferred++;
        }
      }
    }
    if (data.conciliados?.length) {
      for (const t of data.conciliados) {
        if (t.categoria?.toUpperCase() === categoriaOrigem.toUpperCase()) {
          t.categoria = categoriaDestino;
          transferred++;
        }
      }
    }
    localStorage.setItem('powerconcept_ultima_conciliacao', JSON.stringify(data));
    return transferred;
  } catch {
    return 0;
  }
}

// ===== COMPATIBILIDADE Fase 4 =====
// Wrapper para imports existentes que usam CATEGORIAS_CONFIG
export const CATEGORIAS_CONFIG = {
  get categorias_validas() {
    const s = loadCategoriasStorage();
    return s.categorias.filter(c => c.ativa).map(c => c.nome);
  },
  get categoria_padrao() {
    return loadCategoriasStorage().categoriaPadrao;
  },
  get conta_corrente() {
    return loadCategoriasStorage().contaCorrente;
  },
  get fornecedor_categoria() {
    const s = loadCategoriasStorage();
    const map: Record<string, string> = {};
    for (const cat of s.categorias) {
      if (!cat.ativa) continue;
      for (const kw of cat.keywords) {
        if (kw) map[kw] = cat.nome;
      }
    }
    return map;
  },
  titular_departamento: {
    'CONRADO': 'DIRETORIA',
    'DEFAULT': 'OPERACAO',
  } as Record<string, string>,
};

// ===== SEED =====

function makeCat(grupoId: string, nome: string, tipo: 'Receita' | 'Despesa', contaDRE: string, ordem: number): CategoriaItem {
  return {
    id: crypto.randomUUID(),
    grupoId,
    nome,
    tipo,
    contaDRE,
    tipoGasto: '',
    keywords: KEYWORDS_SEED[nome] || [],
    observacoes: '',
    ativa: true,
    ordem,
  };
}

function getDefaultCategoriasStorage(): CategoriasStorage {
  const grupos: CategoriaGrupo[] = [
    { id: crypto.randomUUID(), nome: 'Receitas Diretas', tipo: 'Receita', ordem: 1, ativa: true },
    { id: crypto.randomUUID(), nome: 'Receitas Indiretas', tipo: 'Receita', ordem: 2, ativa: true },
    { id: crypto.randomUUID(), nome: 'Devoluções', tipo: 'Receita', ordem: 3, ativa: true },
    { id: crypto.randomUUID(), nome: 'Outras Entradas', tipo: 'Receita', ordem: 4, ativa: true },
    { id: crypto.randomUUID(), nome: 'Despesas Diretas', tipo: 'Despesa', ordem: 5, ativa: true },
    { id: crypto.randomUUID(), nome: 'Despesas de Vendas e Marketing', tipo: 'Despesa', ordem: 6, ativa: true },
    { id: crypto.randomUUID(), nome: 'Despesas com Pessoal', tipo: 'Despesa', ordem: 7, ativa: true },
    { id: crypto.randomUUID(), nome: 'Despesas Administrativas', tipo: 'Despesa', ordem: 8, ativa: true },
    { id: crypto.randomUUID(), nome: 'Despesas Financeiras / Bancos', tipo: 'Despesa', ordem: 9, ativa: true },
    { id: crypto.randomUUID(), nome: 'Impostos e Taxas', tipo: 'Despesa', ordem: 10, ativa: true },
    { id: crypto.randomUUID(), nome: 'Investimento', tipo: 'Despesa', ordem: 11, ativa: true },
    { id: crypto.randomUUID(), nome: 'Outras Despesas', tipo: 'Despesa', ordem: 12, ativa: true },
    { id: crypto.randomUUID(), nome: 'Devoluções de Vendas', tipo: 'Despesa', ordem: 13, ativa: true },
  ];

  const g = (nome: string) => grupos.find(gr => gr.nome === nome)!.id;

  const categorias: CategoriaItem[] = [
    // Grupo 1 — Receitas Diretas
    makeCat(g('Receitas Diretas'), 'Clientes - Venda de Mercadoria Fabricadas', 'Receita', '(+) - Receita Bruta de Vendas', 1),
    makeCat(g('Receitas Diretas'), 'RECEITAS DE SERVIÇOS', 'Receita', '(+) - Receita Bruta de Vendas', 2),
    makeCat(g('Receitas Diretas'), 'RECEITAS DE MATERIAIS', 'Receita', '(+) - Receita Bruta de Vendas', 3),
    makeCat(g('Receitas Diretas'), 'CLIENTES - TURNKEY', 'Receita', '(+) - Receita Bruta de Vendas', 4),
    makeCat(g('Receitas Diretas'), 'RECEITAS DE CONTRATOS DE SERVIÇOS', 'Receita', '(+) - Receita Bruta de Vendas', 5),

    // Grupo 2 — Receitas Indiretas
    makeCat(g('Receitas Indiretas'), 'DIVIDENDOS RECEBIDOS', 'Receita', '(+) - Outras Receitas', 1),
    makeCat(g('Receitas Indiretas'), 'RENDIMENTOS DE APLICAÇÕES', 'Receita', '(+) - Outras Receitas', 2),

    // Grupo 3 — Devoluções
    makeCat(g('Devoluções'), 'DEVOLUÇÕES DE COMPRA DE MERCADORIA DE REVENDA', 'Receita', '(+) - Recuperação de Despesas Variáveis', 1),
    makeCat(g('Devoluções'), 'DEVOLUÇÕES DE COMPRA DE MATERIAL DE CONSUMO', 'Receita', '(+) - Recuperação de Despesas Variáveis', 2),
    makeCat(g('Devoluções'), 'DEVOLUÇÕES DE COMPRA DE MATÉRIA PRIMA', 'Receita', '(+) - Recuperação de Despesas Variáveis', 3),
    makeCat(g('Devoluções'), 'DEVOLUÇÕES DE COMPRA DE ATIVO', 'Receita', '(-) - Ativos', 4),
    makeCat(g('Devoluções'), 'DEVOLUÇÕES DE COMPRA DE SERVIÇOS', 'Receita', '(+) - Recuperação de Despesas Variáveis', 5),
    makeCat(g('Devoluções'), 'ESTORNO DE PAGAMENTOS', 'Receita', '(-) - Outros Custos', 6),

    // Grupo 4 — Outras Entradas
    makeCat(g('Outras Entradas'), 'ADIANTAMENTO DE CLIENTES', 'Receita', '(-) - Ativos', 1),
    makeCat(g('Outras Entradas'), 'REEMBOLSO DE DESPESAS', 'Receita', '(+) - Recuperação de Despesas Variáveis', 2),
    makeCat(g('Outras Entradas'), 'EMPRESTIMOS BANCÁRIOS', 'Receita', '(-) - Despesas Financeiras', 3),
    makeCat(g('Outras Entradas'), 'VENDA DE ATIVOS', 'Receita', '(+) - Outras Receitas', 4),
    makeCat(g('Outras Entradas'), 'RECEITAS A IDENTIFICAR', 'Receita', '(+) - Outras Receitas', 5),
    makeCat(g('Outras Entradas'), 'EMPRESTIMOS RECEBIDOS - EMPRESAS DO GRUPO', 'Receita', '(-) - Ativos', 6),
    makeCat(g('Outras Entradas'), 'EMPRESTIMO RECEBIDOS - SOCIOS', 'Receita', '(+) - Outras Receitas', 7),

    // Grupo 5 — Despesas Diretas
    makeCat(g('Despesas Diretas'), 'MATERIAIS PARA REVENDA', 'Despesa', '(-) - Outros Custos', 1),
    makeCat(g('Despesas Diretas'), 'FRETE', 'Despesa', '(-) - Outros Custos', 2),
    makeCat(g('Despesas Diretas'), 'MATERIAIS APLICADOS NA PRESTAÇÃO DE SERVIÇOS', 'Despesa', '(-) - Custo dos Serviços Prestados', 3),
    makeCat(g('Despesas Diretas'), 'COMPRA DE SERVIÇOS', 'Despesa', '(-) - Custo dos Serviços Prestados', 4),
    makeCat(g('Despesas Diretas'), 'SOFTWARES DE ENGENHARIA / OPERACIONAL', 'Despesa', '(-) - Custo dos Serviços Prestados', 5),
    makeCat(g('Despesas Diretas'), 'COMBUSTIVEIS', 'Despesa', '(-) - Custo dos Serviços Prestados', 6),
    makeCat(g('Despesas Diretas'), 'UNIFORMES E EPIS', 'Despesa', '(-) - Custo dos Serviços Prestados', 7),
    makeCat(g('Despesas Diretas'), 'SEGURO DE OBRA', 'Despesa', '(-) - Custo dos Serviços Prestados', 8),
    makeCat(g('Despesas Diretas'), 'TAXAS E LICENCAS PROFISSIONAIS', 'Despesa', '(-) - Custo dos Serviços Prestados', 9),
    makeCat(g('Despesas Diretas'), 'LOCACAO DE EQUIPAMENTOS', 'Despesa', '(-) - Custo dos Serviços Prestados', 10),
    makeCat(g('Despesas Diretas'), 'ALIMENTACAO (ADMINISTRATIVO)', 'Despesa', '(-) - Despesas Administrativas', 11),
    makeCat(g('Despesas Diretas'), 'ALIMENTACAO (OPERACAO)', 'Despesa', '(-) - Custo dos Serviços Prestados', 12),
    makeCat(g('Despesas Diretas'), 'CURSOS E TREINAMENTOS OPERACIONAIS', 'Despesa', '(-) - Custo dos Serviços Prestados', 13),
    makeCat(g('Despesas Diretas'), 'DESPESAS COM HOSPEDAGENS', 'Despesa', '(-) - Custo dos Serviços Prestados', 14),
    makeCat(g('Despesas Diretas'), 'ESTACIONAMENTOS', 'Despesa', '(-) - Custo dos Serviços Prestados', 15),
    makeCat(g('Despesas Diretas'), 'EXAMES MEDICOS', 'Despesa', '(-) - Despesas com Pessoal', 16),
    makeCat(g('Despesas Diretas'), 'MANUTENCAO DE EQUIPAMENTOS', 'Despesa', '(-) - Custo dos Serviços Prestados', 17),
    makeCat(g('Despesas Diretas'), 'MOVEIS E UTENSILIOS', 'Despesa', '(-) - Ativos', 18),
    makeCat(g('Despesas Diretas'), 'MANUTENCAO PREDIAL', 'Despesa', '(-) - Despesas Administrativas', 19),
    makeCat(g('Despesas Diretas'), 'GRATIFICAÇÕES', 'Despesa', '(-) - Despesas Variáveis', 20),
    makeCat(g('Despesas Diretas'), 'VIGILANCIA E SEGURANCA PATRIMONIAL', 'Despesa', '(-) - Despesas Administrativas', 21),
    makeCat(g('Despesas Diretas'), 'PERDAS', 'Despesa', '(-) - Outros Custos', 22),

    // Grupo 6 — Despesas de Vendas e Marketing
    makeCat(g('Despesas de Vendas e Marketing'), 'COMISSOES', 'Despesa', '(-) - Outros Custos', 1),
    makeCat(g('Despesas de Vendas e Marketing'), 'MARKETING E PUBLICIDADE', 'Despesa', '(-) - Despesas Variáveis', 2),
    makeCat(g('Despesas de Vendas e Marketing'), 'DESPESAS DE VIAGENS', 'Despesa', '(-) - Despesas Variáveis', 3),
    makeCat(g('Despesas de Vendas e Marketing'), 'BONIFICACOES', 'Despesa', '(-) - Outros Custos', 4),
    makeCat(g('Despesas de Vendas e Marketing'), 'BRINDES', 'Despesa', '(-) - Despesas de Vendas e Marketing', 5),
    makeCat(g('Despesas de Vendas e Marketing'), 'REPRESENTACOES COMERCIAIS', 'Despesa', '(-) - Outros Custos', 6),

    // Grupo 7 — Despesas com Pessoal
    makeCat(g('Despesas com Pessoal'), 'FOPAG', 'Despesa', '(-) - Despesas com Pessoal', 1),
    makeCat(g('Despesas com Pessoal'), 'FERIAS', 'Despesa', '(-) - Despesas com Pessoal', 2),
    makeCat(g('Despesas com Pessoal'), 'RESCISOES', 'Despesa', '(-) - Despesas com Pessoal', 3),
    makeCat(g('Despesas com Pessoal'), '13º SALÁRIO', 'Despesa', '(-) - Despesas com Pessoal', 4),
    makeCat(g('Despesas com Pessoal'), 'INSS', 'Despesa', '(-) - Despesas com Pessoal', 5),
    makeCat(g('Despesas com Pessoal'), 'FGTS E MULTA DE FGTS', 'Despesa', '(-) - Despesas com Pessoal', 6),
    makeCat(g('Despesas com Pessoal'), 'IRRF RETIDO', 'Despesa', '(-) - Outros Tributos', 7),
    makeCat(g('Despesas com Pessoal'), 'PENSAO ALIMENTICIA', 'Despesa', '(-) - Despesas com Pessoal', 8),
    makeCat(g('Despesas com Pessoal'), 'PLANO DE SAUDE COLABORADORES', 'Despesa', '', 9),
    makeCat(g('Despesas com Pessoal'), 'VALE TRANSPORTE', 'Despesa', '(-) - Despesas com Pessoal', 10),
    makeCat(g('Despesas com Pessoal'), 'VALE ALIMENTACAO', 'Despesa', '(-) - Despesas com Pessoal', 11),
    makeCat(g('Despesas com Pessoal'), 'SEGURO DE VIDA', 'Despesa', '(-) - Despesas com Pessoal', 12),
    makeCat(g('Despesas com Pessoal'), 'OUTROS BENEFÍCIOS', 'Despesa', '(-) - Despesas com Pessoal', 13),
    makeCat(g('Despesas com Pessoal'), 'AJUDA DE CUSTO', 'Despesa', '(-) - Despesas com Pessoal', 14),
    makeCat(g('Despesas com Pessoal'), 'TERCEIROS SISTEMA S/INCRA', 'Despesa', '(-) - Despesas com Pessoal', 15),
    makeCat(g('Despesas com Pessoal'), 'HORA VIAGEM PAGA AO COLABORADOR', 'Despesa', '(-) - Despesas com Pessoal', 16),
    makeCat(g('Despesas com Pessoal'), 'REMUNERACAO DE AUTONOMOS', 'Despesa', '(-) - Despesas com Pessoal', 17),
    makeCat(g('Despesas com Pessoal'), 'REMUNERACAO DE AUTONOMOS ADMINISTRATIVO', 'Despesa', '(-) - Despesas com Pessoal', 18),
    makeCat(g('Despesas com Pessoal'), 'CONFRATERNIZACOES', 'Despesa', '(-) - Despesas com Pessoal', 19),

    // Grupo 8 — Despesas Administrativas
    makeCat(g('Despesas Administrativas'), 'ALUGUEL', 'Despesa', '(-) - Despesas Administrativas', 1),
    makeCat(g('Despesas Administrativas'), 'CONDOMINIO', 'Despesa', '(-) - Despesas Administrativas', 2),
    makeCat(g('Despesas Administrativas'), 'AGUA E ESGOTO', 'Despesa', '(-) - Despesas Administrativas', 3),
    makeCat(g('Despesas Administrativas'), 'ENERGIA ELETRICA', 'Despesa', '(-) - Despesas Administrativas', 4),
    makeCat(g('Despesas Administrativas'), 'TELEFONIA E INTERNET', 'Despesa', '(-) - Despesas Administrativas', 5),
    makeCat(g('Despesas Administrativas'), 'MATERIAIS DE ESCRITORIO', 'Despesa', '(-) - Despesas Administrativas', 6),
    makeCat(g('Despesas Administrativas'), 'IPTU', 'Despesa', '(-) - Despesas Administrativas', 7),
    makeCat(g('Despesas Administrativas'), 'HONORARIOS CONTABEIS', 'Despesa', '(-) - Despesas Administrativas', 8),
    makeCat(g('Despesas Administrativas'), 'HONORARIOS ADVOCATICIOS', 'Despesa', '(-) - Despesas Administrativas', 9),
    makeCat(g('Despesas Administrativas'), 'ANTECIPACAO DE DIVIDENDOS - CONRADO', 'Despesa', '(-) - Despesas Administrativas', 10),
    makeCat(g('Despesas Administrativas'), 'ANTECIPACAO DE DIVIDENDOS - SANDRO', 'Despesa', '(-) - Despesas Administrativas', 11),
    makeCat(g('Despesas Administrativas'), 'ANTECIPACAO DE DIVIDENDOS - GUILHERME', 'Despesa', '(-) - Despesas Administrativas', 12),
    makeCat(g('Despesas Administrativas'), 'BENS DE PEQUENO VALOR', 'Despesa', '(-) - Despesas Administrativas', 13),
    makeCat(g('Despesas Administrativas'), 'ALVARA DE FUNCIONAMENTO', 'Despesa', '(-) - Despesas Administrativas', 14),
    makeCat(g('Despesas Administrativas'), 'HONORARIOS DE CONSULTORIA', 'Despesa', '(-) - Despesas Administrativas', 15),
    makeCat(g('Despesas Administrativas'), 'ALIMENTACAO (DIRETORIA)', 'Despesa', '(-) - Despesas Administrativas', 16),

    // Grupo 9 — Despesas Financeiras / Bancos
    makeCat(g('Despesas Financeiras / Bancos'), 'JUROS SOBRE EMPRESTIMOS', 'Despesa', '(-) - Despesas Financeiras', 1),
    makeCat(g('Despesas Financeiras / Bancos'), 'MULTAS', 'Despesa', '(-) - Despesas Financeiras', 2),
    makeCat(g('Despesas Financeiras / Bancos'), 'PAGAMENTO DE EMPRESTIMOS', 'Despesa', '(-) - Despesas Financeiras', 3),
    makeCat(g('Despesas Financeiras / Bancos'), 'TARIFAS BANCARIAS', 'Despesa', '(-) - Despesas Financeiras', 4),
    makeCat(g('Despesas Financeiras / Bancos'), 'CARTORIO', 'Despesa', '(-) - Despesas Administrativas', 5),
    makeCat(g('Despesas Financeiras / Bancos'), 'TARIFAS DE BOLETOS', 'Despesa', '(-) - Despesas Financeiras', 6),

    // Grupo 10 — Impostos e Taxas
    makeCat(g('Impostos e Taxas'), 'ICMS', 'Despesa', '(-) - Deduções de Receita', 1),
    makeCat(g('Impostos e Taxas'), 'IPI', 'Despesa', '(-) - Deduções de Receita', 2),
    makeCat(g('Impostos e Taxas'), 'PIS', 'Despesa', '(-) - Deduções de Receita', 3),
    makeCat(g('Impostos e Taxas'), 'COFINS', 'Despesa', '(-) - Deduções de Receita', 4),
    makeCat(g('Impostos e Taxas'), 'IRPJ', 'Despesa', '(-) - Impostos', 5),
    makeCat(g('Impostos e Taxas'), 'CSLL', 'Despesa', '(-) - Impostos', 6),
    makeCat(g('Impostos e Taxas'), 'ISS', 'Despesa', '', 7),
    makeCat(g('Impostos e Taxas'), 'INSS RETIDO', 'Despesa', '(-) - Outros Tributos', 8),
    makeCat(g('Impostos e Taxas'), 'IPVA / DPVAT / LICENCIAMENTO', 'Despesa', '', 9),
    makeCat(g('Impostos e Taxas'), 'SOFTWARES ADMINISTRATIVOS', 'Despesa', '', 10),
    makeCat(g('Impostos e Taxas'), 'ISS TOMADO', 'Despesa', '(-) - Outros Tributos', 11),
    makeCat(g('Impostos e Taxas'), 'IOF', 'Despesa', '', 12),
    makeCat(g('Impostos e Taxas'), 'TARIFAS', 'Despesa', '', 13),
    makeCat(g('Impostos e Taxas'), 'IMPOSTOS SOBRE APLICAÇÕES', 'Despesa', '', 14),
    makeCat(g('Impostos e Taxas'), 'PIS/COFINS/CSLL', 'Despesa', '(-) - Impostos', 15),

    // Grupo 11 — Investimento
    makeCat(g('Investimento'), 'MÁQUINAS, EQUIPAMENTOS E INSTALAÇÕES INDUSTRIAIS', 'Despesa', '', 1),
    makeCat(g('Investimento'), 'VEÍCULOS', 'Despesa', '(-) - Ativos', 2),
    makeCat(g('Investimento'), 'INSTALAÇÕES', 'Despesa', '', 3),
    makeCat(g('Investimento'), 'EQUIPAMENTOS DE INFORMÁTICA', 'Despesa', '(-) - Ativos', 4),
    makeCat(g('Investimento'), 'MÓVEIS E UTENSÍLIOS', 'Despesa', '(-) - Ativos', 5),
    makeCat(g('Investimento'), 'INTEGRALIZACAO DE CAPITAL SUBSCRITO', 'Despesa', '', 6),
    makeCat(g('Investimento'), 'CONSORCIOS', 'Despesa', '(-) - Ativos', 7),
    makeCat(g('Investimento'), 'FERRAMENTAS', 'Despesa', '', 8),
    makeCat(g('Investimento'), 'IMOVEIS', 'Despesa', '(-) - Ativos', 9),
    makeCat(g('Investimento'), 'OUTRAS IMOBILIZACOES POR AQUISICAO', 'Despesa', '', 10),
    makeCat(g('Investimento'), 'DESPESAS COM CONSTRUÇÃO', 'Despesa', '(-) - Ativos', 11),

    // Grupo 12 — Outras Despesas
    makeCat(g('Outras Despesas'), 'ADIANTAMENTO A FORNECEDORES', 'Despesa', '', 1),
    makeCat(g('Outras Despesas'), 'COMPRA DE MATERIAIS', 'Despesa', '(-) - Outros Custos', 2),
    makeCat(g('Outras Despesas'), 'DESPESAS A IDENTIFICAR', 'Despesa', '', 3),
    makeCat(g('Outras Despesas'), 'MANUTENCAO DE VEICULOS', 'Despesa', '', 4),
    makeCat(g('Outras Despesas'), 'MENSALIDADE ASSOCIATIVA', 'Despesa', '', 5),
    makeCat(g('Outras Despesas'), 'TRANSPORTE URBANO (TÁXI, UBER)', 'Despesa', '', 6),
    makeCat(g('Outras Despesas'), 'TELEFONIA MÓVEL', 'Despesa', '', 7),
    makeCat(g('Outras Despesas'), 'SEGUROS DE VEICULOS', 'Despesa', '', 8),
    makeCat(g('Outras Despesas'), 'PEDAGIOS', 'Despesa', '', 9),
    makeCat(g('Outras Despesas'), 'MULTAS DE TRANSITO', 'Despesa', '', 10),
    makeCat(g('Outras Despesas'), 'MERCADO', 'Despesa', '', 11),
    makeCat(g('Outras Despesas'), 'EMPRESTIMO CONCEDIDOS - SOCIOS', 'Despesa', '(-) - Outras Deduções de Receita', 12),
    makeCat(g('Outras Despesas'), 'EMPRESTIMOS CONCEDIDOS - EMPRESAS DO GRUPO', 'Despesa', '(-) - Ativos', 13),

    // Grupo 13 — Devoluções de Vendas
    makeCat(g('Devoluções de Vendas'), 'DEVOLUÇÕES DE VENDAS DE MERCADORIA', 'Despesa', '(-) - Deduções de Receita', 1),
    makeCat(g('Devoluções de Vendas'), 'DEVOLUÇÕES DE VENDAS DE SERVIÇOS PRESTADOS', 'Despesa', '(-) - Deduções de Receita', 2),
  ];

  return {
    version: 2,
    grupos,
    categorias,
    categoriaPadrao: 'DESPESAS A IDENTIFICAR',
    contaCorrente: 'CARTAO DE CREDITO',
  };
}
