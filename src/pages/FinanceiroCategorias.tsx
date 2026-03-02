import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import {
  loadCategoriasStorage,
  saveCategoriasStorage,
  exportarCategoriasXlsx,
  importarCategoriasXlsx,
  aplicarImportacao,
  getCategoriaUsageCount,
  transferirLancamentos,
  gerarTemplateXlsx,
} from '@/calculations/conciliacao/categorias';
import type { ImportPreview } from '@/calculations/conciliacao/categorias';
import type { CategoriaGrupo, CategoriaItem, CategoriasStorage } from '@/calculations/conciliacao/types';
import { CONTAS_DRE } from '@/calculations/conciliacao/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Pencil, Trash2, X, AlertTriangle, Upload, Download, TrendingUp, TrendingDown, FileDown, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceiroCategorias() {
  const [storage, setStorage] = useState<CategoriasStorage>(() => loadCategoriasStorage());
  const [searchTerm, setSearchTerm] = useState('');
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Grupo dialog
  const [grupoDialog, setGrupoDialog] = useState<{ open: boolean; grupo: Partial<CategoriaGrupo> | null }>({ open: false, grupo: null });
  // Categoria dialog
  const [catDialog, setCatDialog] = useState<{ open: boolean; cat: Partial<CategoriaItem> | null; defaultGrupoId?: string }>({ open: false, cat: null });
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'grupo' | 'categoria'; id: string; nome: string }>({ open: false, type: 'grupo', id: '', nome: '' });
  // Transfer dialog (for categories with usage)
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; catId: string; catNome: string; usageCount: number; targetCat: string }>({ open: false, catId: '', catNome: '', usageCount: 0, targetCat: '' });
  // Import dialog
  const [importDialog, setImportDialog] = useState<{ open: boolean; preview: ImportPreview | null; fileName: string }>({ open: false, preview: null, fileName: '' });
  // Import wizard (step 1: template/select file)
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  // Keyword input
  const [kwInput, setKwInput] = useState('');
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persist = useCallback((updated: CategoriasStorage) => {
    setStorage(updated);
    saveCategoriasStorage(updated);
  }, []);

  // Counters
  const stats = useMemo(() => {
    const gruposReceita = storage.grupos.filter(g => g.tipo === 'Receita').length;
    const gruposDespesa = storage.grupos.filter(g => g.tipo === 'Despesa').length;
    const catsReceita = storage.categorias.filter(c => c.tipo === 'Receita').length;
    const catsDespesa = storage.categorias.filter(c => c.tipo === 'Despesa').length;
    const semDRE = storage.categorias.filter(c => !c.contaDRE).length;
    return { gruposReceita, gruposDespesa, catsReceita, catsDespesa, semDRE };
  }, [storage]);

  // Search filter
  const filteredGrupos = useMemo(() => {
    const sorted = [...storage.grupos].sort((a, b) => a.ordem - b.ordem);
    if (!searchTerm) return sorted;
    const term = searchTerm.toUpperCase();
    const grupoIdsWithMatch = new Set<string>();
    storage.categorias.forEach(cat => {
      const nameMatch = cat.nome.toUpperCase().includes(term);
      const kwMatch = cat.keywords.some(kw => kw.toUpperCase().includes(term));
      if (nameMatch || kwMatch) grupoIdsWithMatch.add(cat.grupoId);
    });
    return sorted.filter(g => grupoIdsWithMatch.has(g.id) || g.nome.toUpperCase().includes(term));
  }, [storage, searchTerm]);

  const gruposReceita = useMemo(() => filteredGrupos.filter(g => g.tipo === 'Receita'), [filteredGrupos]);
  const gruposDespesa = useMemo(() => filteredGrupos.filter(g => g.tipo === 'Despesa'), [filteredGrupos]);

  const totalCatsReceita = useMemo(() => storage.categorias.filter(c => c.tipo === 'Receita').length, [storage]);
  const totalCatsDespesa = useMemo(() => storage.categorias.filter(c => c.tipo === 'Despesa').length, [storage]);

  // Auto-open accordions when searching
  useEffect(() => {
    if (searchTerm) {
      setOpenAccordions(filteredGrupos.map(g => g.id));
    }
  }, [searchTerm, filteredGrupos]);

  const getCatsForGrupo = useCallback((grupoId: string) => {
    let cats = storage.categorias
      .filter(c => c.grupoId === grupoId)
      .sort((a, b) => a.ordem - b.ordem);
    if (searchTerm) {
      const term = searchTerm.toUpperCase();
      cats = cats.filter(c =>
        c.nome.toUpperCase().includes(term) ||
        c.keywords.some(kw => kw.toUpperCase().includes(term))
      );
    }
    return cats;
  }, [storage, searchTerm]);

  // ===== GRUPO CRUD =====
  const handleSaveGrupo = () => {
    const g = grupoDialog.grupo;
    if (!g?.nome?.trim()) { toast.error('Nome é obrigatório'); return; }
    const updated = { ...storage };
    if (g.id) {
      updated.grupos = updated.grupos.map(gr => gr.id === g.id ? { ...gr, nome: g.nome!, tipo: g.tipo || gr.tipo } : gr);
    } else {
      const maxOrdem = Math.max(0, ...updated.grupos.map(gr => gr.ordem));
      updated.grupos = [...updated.grupos, {
        id: crypto.randomUUID(),
        nome: g.nome!.trim(),
        tipo: g.tipo || 'Despesa',
        ordem: maxOrdem + 1,
        ativa: true,
      }];
    }
    persist(updated);
    setGrupoDialog({ open: false, grupo: null });
    toast.success(g.id ? 'Grupo atualizado' : 'Grupo criado');
  };

  const handleDeleteGrupo = () => {
    const cats = storage.categorias.filter(c => c.grupoId === deleteDialog.id);
    if (cats.length > 0) {
      toast.error(`Grupo tem ${cats.length} categorias. Remova-as primeiro.`);
      setDeleteDialog({ ...deleteDialog, open: false });
      return;
    }
    const updated = { ...storage, grupos: storage.grupos.filter(g => g.id !== deleteDialog.id) };
    persist(updated);
    setDeleteDialog({ ...deleteDialog, open: false });
    toast.success('Grupo excluído');
  };

  // ===== CATEGORIA CRUD =====
  const handleSaveCat = () => {
    const c = catDialog.cat;
    if (!c?.nome?.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!c?.grupoId) { toast.error('Selecione um grupo'); return; }
    const grupo = storage.grupos.find(g => g.id === c.grupoId);
    const updated = { ...storage };
    if (c.id) {
      updated.categorias = updated.categorias.map(cat => cat.id === c.id ? {
        ...cat,
        grupoId: c.grupoId!,
        nome: c.nome!.trim(),
        tipo: grupo?.tipo || cat.tipo,
        contaDRE: c.contaDRE || '',
        tipoGasto: c.tipoGasto || '',
        keywords: c.keywords || [],
        observacoes: c.observacoes || '',
        ativa: c.ativa ?? true,
      } : cat);
    } else {
      const catsInGroup = updated.categorias.filter(cat => cat.grupoId === c.grupoId);
      const maxOrdem = Math.max(0, ...catsInGroup.map(cat => cat.ordem));
      updated.categorias = [...updated.categorias, {
        id: crypto.randomUUID(),
        grupoId: c.grupoId!,
        nome: c.nome!.trim(),
        tipo: grupo?.tipo || 'Despesa',
        contaDRE: c.contaDRE || '',
        tipoGasto: c.tipoGasto || '',
        keywords: c.keywords || [],
        observacoes: c.observacoes || '',
        ativa: c.ativa ?? true,
        ordem: maxOrdem + 1,
      }];
    }
    persist(updated);
    setCatDialog({ open: false, cat: null });
    toast.success(c.id ? 'Categoria atualizada' : 'Categoria criada');
  };

  // Delete category with usage check
  const handleDeleteCatClick = (catId: string, catNome: string) => {
    const usageCount = getCategoriaUsageCount(catNome);
    if (usageCount > 0) {
      setTransferDialog({ open: true, catId, catNome, usageCount, targetCat: storage.categoriaPadrao });
    } else {
      setDeleteDialog({ open: true, type: 'categoria', id: catId, nome: catNome });
    }
  };

  const handleDeleteCat = () => {
    const updated = { ...storage, categorias: storage.categorias.filter(c => c.id !== deleteDialog.id) };
    persist(updated);
    setDeleteDialog({ ...deleteDialog, open: false });
    toast.success('Categoria excluída');
  };

  const handleTransferAndDelete = () => {
    const transferred = transferirLancamentos(transferDialog.catNome, transferDialog.targetCat);
    const updated = { ...storage, categorias: storage.categorias.filter(c => c.id !== transferDialog.catId) };
    persist(updated);
    setTransferDialog({ ...transferDialog, open: false });
    toast.success(`${transferred} lançamentos transferidos. Categoria excluída.`);
  };

  // Keyword chip management
  const addKeyword = () => {
    const kw = kwInput.trim().toUpperCase();
    if (!kw || !catDialog.cat) return;
    const current = catDialog.cat.keywords || [];
    if (current.includes(kw)) { setKwInput(''); return; }
    setCatDialog({ ...catDialog, cat: { ...catDialog.cat, keywords: [...current, kw] } });
    setKwInput('');
  };

  const removeKeyword = (kw: string) => {
    if (!catDialog.cat) return;
    setCatDialog({ ...catDialog, cat: { ...catDialog.cat, keywords: (catDialog.cat.keywords || []).filter(k => k !== kw) } });
  };

  const handleKwKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  // Import/Export
  const handleExport = () => {
    try {
      exportarCategoriasXlsx(storage);
      toast.success('Arquivo exportado com sucesso');
    } catch (err) {
      toast.error('Erro ao exportar');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preview = await importarCategoriasXlsx(file, storage);
      setImportDialog({ open: true, preview, fileName: file.name });
    } catch (err) {
      toast.error('Erro ao ler arquivo');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (!importDialog.preview) return;
    const updated = aplicarImportacao(storage, importDialog.preview.dados);
    persist(updated);
    setImportDialog({ open: false, preview: null, fileName: '' });
    toast.success(`Importação concluída: ${importDialog.preview.novas} novas, ${importDialog.preview.modificadas} atualizadas`);
  };

  // Settings
  const handleCategoriaPadraoChange = (val: string) => {
    persist({ ...storage, categoriaPadrao: val });
  };

  const handleContaCorrenteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    persist({ ...storage, contaCorrente: e.target.value });
  };

  // Render a section of groups (Receita or Despesa)
  const renderGrupoAccordion = (grupos: CategoriaGrupo[]) => (
    <Accordion
      type="multiple"
      value={openAccordions}
      onValueChange={setOpenAccordions}
      className="space-y-2"
    >
      {grupos.map(grupo => {
        const cats = getCatsForGrupo(grupo.id);
        const totalCats = storage.categorias.filter(c => c.grupoId === grupo.id).length;
        return (
          <AccordionItem key={grupo.id} value={grupo.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className="font-semibold">{grupo.nome}</span>
                <Badge variant={grupo.tipo === 'Receita' ? 'default' : 'destructive'} className="text-xs">
                  {grupo.tipo}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {totalCats} {totalCats === 1 ? 'categoria' : 'categorias'}
                </span>
                <div className="ml-auto flex gap-1 mr-2" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGrupoDialog({ open: true, grupo: { ...grupo } })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteDialog({ open: true, type: 'grupo', id: grupo.id, nome: grupo.nome })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-2">
                {cats.map(cat => (
                  <div key={cat.id} className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${!cat.ativa ? 'line-through text-muted-foreground' : ''}`}>
                          {cat.nome}
                        </span>
                        {!cat.contaDRE && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                            sem DRE
                          </Badge>
                        )}
                      </div>
                      {cat.contaDRE && (
                        <p className="text-xs text-muted-foreground mt-0.5">DRE: {cat.contaDRE}</p>
                      )}
                      {cat.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cat.keywords.map(kw => (
                            <Badge key={kw} variant="secondary" className="text-[10px] font-normal">{kw}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCatDialog({ open: true, cat: { ...cat } }); setKwInput(''); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCatClick(cat.id, cat.nome)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    setCatDialog({
                      open: true,
                      cat: { grupoId: grupo.id, tipo: grupo.tipo, ativa: true, keywords: [] },
                      defaultGrupoId: grupo.id,
                    });
                    setKwInput('');
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Categoria
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Categorias Contábeis</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estrutura de categorias para DRE e conciliação.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportWizardOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Importar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
            <Button size="sm" onClick={() => setGrupoDialog({ open: true, grupo: { tipo: 'Despesa' } })}>
              <Plus className="h-4 w-4 mr-1" /> Grupo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
            Receitas: {stats.gruposReceita} grupos, {stats.catsReceita} categorias
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30">
            Despesas: {stats.gruposDespesa} grupos, {stats.catsDespesa} categorias
          </Badge>
          {stats.semDRE > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stats.semDRE} sem conta DRE
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria ou keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* === SEÇÃO RECEITAS === */}
        {gruposReceita.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="h-px flex-1 bg-emerald-500/30" />
              <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Receitas
                <span className="text-xs font-normal text-muted-foreground">
                  {gruposReceita.length} grupos, {totalCatsReceita} categorias
                </span>
              </h3>
              <div className="h-px flex-1 bg-emerald-500/30" />
            </div>
            {renderGrupoAccordion(gruposReceita)}
          </div>
        )}

        {/* === SEPARADOR === */}
        {gruposReceita.length > 0 && gruposDespesa.length > 0 && <div className="my-8" />}

        {/* === SEÇÃO DESPESAS === */}
        {gruposDespesa.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="h-px flex-1 bg-red-500/30" />
              <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Despesas
                <span className="text-xs font-normal text-muted-foreground">
                  {gruposDespesa.length} grupos, {totalCatsDespesa} categorias
                </span>
              </h3>
              <div className="h-px flex-1 bg-red-500/30" />
            </div>
            {renderGrupoAccordion(gruposDespesa)}
          </div>
        )}

        {filteredGrupos.length === 0 && searchTerm && (
          <p className="text-center text-muted-foreground py-8">Nenhum resultado para "{searchTerm}"</p>
        )}

        {/* Settings */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-sm">Configurações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Categoria padrão</Label>
              <Select value={storage.categoriaPadrao} onValueChange={handleCategoriaPadraoChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {storage.categorias.filter(c => c.ativa).map(c => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Conta corrente (cartão)</Label>
              <Input value={storage.contaCorrente} onChange={handleContaCorrenteChange} className="mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== GRUPO DIALOG ===== */}
      <Dialog open={grupoDialog.open} onOpenChange={(open) => { if (!open) setGrupoDialog({ open: false, grupo: null }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{grupoDialog.grupo?.id ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={grupoDialog.grupo?.nome || ''}
                onChange={(e) => setGrupoDialog({ ...grupoDialog, grupo: { ...grupoDialog.grupo, nome: e.target.value } })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={grupoDialog.grupo?.tipo || 'Despesa'}
                onValueChange={(val) => setGrupoDialog({ ...grupoDialog, grupo: { ...grupoDialog.grupo, tipo: val as 'Receita' | 'Despesa' } })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrupoDialog({ open: false, grupo: null })}>Cancelar</Button>
            <Button onClick={handleSaveGrupo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CATEGORIA DIALOG ===== */}
      <Dialog open={catDialog.open} onOpenChange={(open) => { if (!open) setCatDialog({ open: false, cat: null }); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{catDialog.cat?.id ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grupo</Label>
              <Select
                value={catDialog.cat?.grupoId || ''}
                onValueChange={(val) => {
                  const grupo = storage.grupos.find(g => g.id === val);
                  setCatDialog({ ...catDialog, cat: { ...catDialog.cat, grupoId: val, tipo: grupo?.tipo || catDialog.cat?.tipo } });
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {storage.grupos.sort((a, b) => a.ordem - b.ordem).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nome} ({g.tipo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome da categoria *</Label>
              <Input
                value={catDialog.cat?.nome || ''}
                onChange={(e) => setCatDialog({ ...catDialog, cat: { ...catDialog.cat, nome: e.target.value } })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Conta do DRE</Label>
              <Select
                value={catDialog.cat?.contaDRE || '_empty'}
                onValueChange={(val) => setCatDialog({ ...catDialog, cat: { ...catDialog.cat, contaDRE: val === '_empty' ? '' : val } })}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="(pendente)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">(pendente)</SelectItem>
                  {CONTAS_DRE.map(dre => (
                    <SelectItem key={dre} value={dre}>{dre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de gasto/receita</Label>
              <Input
                value={catDialog.cat?.tipoGasto || ''}
                onChange={(e) => setCatDialog({ ...catDialog, cat: { ...catDialog.cat, tipoGasto: e.target.value } })}
                className="mt-1"
                placeholder="Ex: Compras - Compra de Material para Uso e Consumo"
              />
            </div>
            <div>
              <Label>Keywords (categorização automática)</Label>
              <div className="flex flex-wrap gap-1 mt-1 mb-2">
                {(catDialog.cat?.keywords || []).map(kw => (
                  <Badge key={kw} variant="secondary" className="text-xs gap-1">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  onKeyDown={handleKwKeyDown}
                  placeholder="Digitar e Enter..."
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addKeyword} type="button">+</Button>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={catDialog.cat?.observacoes || ''}
                onChange={(e) => setCatDialog({ ...catDialog, cat: { ...catDialog.cat, observacoes: e.target.value } })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={catDialog.cat?.ativa ?? true}
                onCheckedChange={(checked) => setCatDialog({ ...catDialog, cat: { ...catDialog.cat, ativa: checked } })}
              />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog({ open: false, cat: null })}>Cancelar</Button>
            <Button onClick={handleSaveCat}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION (simple) ===== */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => { if (!open) setDeleteDialog({ ...deleteDialog, open: false }); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteDialog.type === 'grupo' ? 'grupo' : 'categoria'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir "{deleteDialog.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDialog.type === 'grupo' ? handleDeleteGrupo : handleDeleteCat}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== TRANSFER DIALOG (category with usage) ===== */}
      <Dialog open={transferDialog.open} onOpenChange={(open) => { if (!open) setTransferDialog({ ...transferDialog, open: false }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Não é possível excluir
            </DialogTitle>
            <DialogDescription>
              A categoria "{transferDialog.catNome}" possui {transferDialog.usageCount} lançamento(s) vinculado(s).
              Para excluir, transfira os lançamentos para outra categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Transferir lançamentos para:</Label>
              <Select value={transferDialog.targetCat} onValueChange={(val) => setTransferDialog({ ...transferDialog, targetCat: val })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {storage.categorias.filter(c => c.ativa && c.nome !== transferDialog.catNome).map(c => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog({ ...transferDialog, open: false })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleTransferAndDelete}>Transferir e Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== IMPORT WIZARD DIALOG (step 1: template or file) ===== */}
      <Dialog open={importWizardOpen} onOpenChange={setImportWizardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Categorias</DialogTitle>
            <DialogDescription>
              Importe categorias a partir de uma planilha Excel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">1. Baixe o modelo padrão com a estrutura esperada:</p>
              <Button variant="outline" size="sm" onClick={() => { gerarTemplateXlsx(); toast.success('Modelo baixado'); }}>
                <FileDown className="h-4 w-4 mr-1" /> Baixar modelo em branco
              </Button>
              <p className="text-xs text-muted-foreground mt-1">O modelo já vem com os headers corretos e exemplos.</p>
            </div>
            <div>
              <p className="text-sm mb-2">2. Ou selecione uma planilha preenchida:</p>
              <Button variant="outline" size="sm" onClick={() => { setImportWizardOpen(false); fileInputRef.current?.click(); }}>
                <FolderOpen className="h-4 w-4 mr-1" /> Selecionar arquivo .xlsx
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportWizardOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== IMPORT PREVIEW DIALOG (step 2) ===== */}
      <Dialog open={importDialog.open} onOpenChange={(open) => { if (!open) setImportDialog({ open: false, preview: null, fileName: '' }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Categorias</DialogTitle>
            <DialogDescription>
              Arquivo: {importDialog.fileName}
            </DialogDescription>
          </DialogHeader>
          {importDialog.preview && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <p>• <strong>{importDialog.preview.gruposEncontrados}</strong> grupos encontrados</p>
                <p>• <strong>{importDialog.preview.categoriasEncontradas}</strong> categorias encontradas</p>
                <p>• <strong>{importDialog.preview.novas}</strong> novas categorias</p>
                <p>• <strong>{importDialog.preview.modificadas}</strong> categorias modificadas</p>
                <p>• <strong>{importDialog.preview.semAlteracao}</strong> sem alteração</p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Esta ação atualizará as categorias existentes por nome e criará as novas.</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog({ open: false, preview: null, fileName: '' })}>Cancelar</Button>
            <Button onClick={handleConfirmImport}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
