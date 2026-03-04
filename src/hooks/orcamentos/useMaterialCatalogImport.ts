import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Column aliases for flexible mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  codigo: ['codigo', 'código', 'cod', 'code', 'id'],
  descricao: ['descricao', 'descrição', 'desc', 'description', 'nome', 'name', 'material'],
  unidade: ['unidade', 'un', 'und', 'unit', 'uom'],
  hh_ref: ['hh_ref', 'hh', 'hh_unit', 'hh_unitario', 'homem_hora'],
  fabricante: ['fabricante', 'marca', 'manufacturer', 'brand', 'fornecedor'],
  sku: ['sku', 'codigo_fabricante', 'part_number', 'pn'],
  preco_ref: ['preco_ref', 'preço_ref', 'preco', 'preço', 'price', 'valor', 'custo', 'cost'],
  grupo: ['grupo', 'group', 'grupo_nome'],
  categoria: ['categoria', 'category', 'categoria_nome'],
  subcategoria: ['subcategoria', 'subcategory', 'sub_categoria', 'sub'],
  tags: ['tags', 'etiquetas', 'labels'],
  hierarquia_path: ['hierarquia_path', 'hierarquia', 'caminho', 'path', 'hierarchy'],
};

// Tag validation constants
const MAX_TAGS_PER_ITEM = 20;
const MAX_TAG_LENGTH = 40;

export type ImportRowStatus = 'NOVO' | 'NOVA_VARIANTE' | 'UPDATE_PRECO' | 'IGUAL' | 'CONFLITO' | 'ERRO';

export interface ImportPreviewRow {
  rowNumber: number;
  codigo: string;
  descricao: string;
  unidade: string;
  hh_ref: number | null;
  fabricante: string;
  sku: string | null;
  preco_ref: number | null;
  grupo: string | null;
  categoria: string | null;
  subcategoria: string | null;
  tags: string[];
  status: ImportRowStatus;
  errorMessage?: string;
  conflictFields?: string[];
  existingCatalogId?: string;
  existingVariantId?: string;
  existingPreco?: number | null;
  existingDescricao?: string;
  existingUnidade?: string;
  existingHhRef?: number | null;
}

export interface ImportSummary {
  total: number;
  novos: number;
  novasVariantes: number;
  updates: number;
  iguais: number;
  conflitos: number;
  erros: number;
}

export interface ColumnMapping {
  codigo: number;
  descricao: number;
  unidade: number;
  fabricante: number;
  preco_ref: number;
  hh_ref?: number;
  sku?: number;
  grupo?: number;
  categoria?: number;
  subcategoria?: number;
  tags?: number;
  hierarquia_path?: number;
}

export interface DuplicateInfo {
  key: string; // codigo + fabricante
  lines: number[];
}

export function useMaterialCatalogImport() {
  const { user, hasRole, isGodMode } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Check if user can import (admin, financeiro, or super_admin)
  const canImport = hasRole('admin') || hasRole('financeiro') || isGodMode();
  
  // Check if user can do full update (only super_admin)
  const canFullUpdate = isGodMode();

  // Auto-detect column mapping based on headers
  const detectColumnMapping = useCallback((headerRow: string[]): Partial<ColumnMapping> => {
    const mapping: Partial<ColumnMapping> = {};
    const normalizedHeaders = headerRow.map(h => h?.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '');

    Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
      const index = normalizedHeaders.findIndex(h => 
        aliases.some(alias => h === alias.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      );
      if (index !== -1) {
        (mapping as any)[field] = index;
      }
    });

    return mapping;
  }, []);

  // Parse file (CSV or XLSX)
  const parseFile = useCallback(async (file: File): Promise<{ headers: string[]; data: string[][] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
            
            const headers = (jsonData[0] || []).map(h => String(h || ''));
            const rows = jsonData.slice(1).map(row => 
              Array.isArray(row) ? row.map(cell => String(cell ?? '')) : []
            ).filter(row => row.some(cell => cell.trim()));
            
            resolve({ headers, data: rows });
          } catch (err) {
            reject(new Error('Erro ao processar arquivo Excel'));
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            const parseCSVLine = (line: string): string[] => {
              const result: string[] = [];
              let current = '';
              let inQuotes = false;
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if ((char === ',' || char === ';') && !inQuotes) {
                  result.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              result.push(current.trim());
              return result;
            };
            
            const headers = parseCSVLine(lines[0]);
            const rows = lines.slice(1).map(line => parseCSVLine(line)).filter(row => row.some(cell => cell.trim()));
            
            resolve({ headers, data: rows });
          } catch (err) {
            reject(new Error('Erro ao processar arquivo CSV'));
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsText(file, 'UTF-8');
      }
    });
  }, []);

  // Process file and generate preview
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setPreview([]);
    setSummary(null);
    setDuplicates([]);

    try {
      const { headers: fileHeaders, data } = await parseFile(file);
      setHeaders(fileHeaders);
      setRawData(data);

      const detectedMapping = detectColumnMapping(fileHeaders);
      
      // Check required columns (fabricante is now required)
      if (detectedMapping.codigo === undefined || 
          detectedMapping.descricao === undefined || 
          detectedMapping.unidade === undefined ||
          detectedMapping.fabricante === undefined ||
          detectedMapping.preco_ref === undefined) {
        toast.error('Colunas obrigatórias não encontradas: codigo, descricao, unidade, fabricante, preco_ref');
        setColumnMapping(null);
        setIsProcessing(false);
        return;
      }

      setColumnMapping(detectedMapping as ColumnMapping);
      await generatePreview(data, detectedMapping as ColumnMapping);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  }, [parseFile, detectColumnMapping]);

  // Parse tags from string (separated by ;)
  const parseTags = (value: string | undefined): { tags: string[]; error?: string } => {
    if (!value) return { tags: [] };
    
    const rawTags = value
      .split(';')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    const longTags = rawTags.filter(t => t.length > MAX_TAG_LENGTH);
    if (longTags.length > 0) {
      return { 
        tags: [], 
        error: `Tag(s) excede ${MAX_TAG_LENGTH} caracteres: "${longTags[0].substring(0, 20)}..."` 
      };
    }
    
    const seen = new Map<string, string>();
    for (const tag of rawTags) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, tag);
      }
    }
    const deduped = Array.from(seen.values());
    
    if (deduped.length > MAX_TAGS_PER_ITEM) {
      return { 
        tags: [], 
        error: `Máximo ${MAX_TAGS_PER_ITEM} tags por item (${deduped.length} encontradas)` 
      };
    }
    
    return { tags: deduped };
  };

  // Parse hierarchy path (format: "Grupo / Categoria / Subcategoria")
  const parseHierarchyPath = (value: string | undefined): { grupo: string | null; categoria: string | null; subcategoria: string | null } => {
    if (!value || !value.trim()) {
      return { grupo: null, categoria: null, subcategoria: null };
    }
    
    const parts = value.split('/').map(p => p.trim()).filter(p => p.length > 0);
    
    return {
      grupo: parts[0] || null,
      categoria: parts[1] || null,
      subcategoria: parts[2] || null,
    };
  };

  // Generate preview with validation
  const generatePreview = useCallback(async (data: string[][], mapping: ColumnMapping) => {
    setIsProcessing(true);

    try {
      // Check for duplicates in file (codigo + fabricante)
      const keyOccurrences = new Map<string, number[]>();
      data.forEach((row, idx) => {
        const codigo = row[mapping.codigo]?.trim() || '';
        const fabricante = row[mapping.fabricante]?.trim() || '';
        const key = `${codigo}::${fabricante}`.toLowerCase();
        if (codigo && fabricante) {
          const existing = keyOccurrences.get(key) || [];
          existing.push(idx + 2);
          keyOccurrences.set(key, existing);
        }
      });

      const duplicatesList: DuplicateInfo[] = [];
      keyOccurrences.forEach((lines, key) => {
        if (lines.length > 1) {
          duplicatesList.push({ key, lines });
        }
      });

      if (duplicatesList.length > 0) {
        setDuplicates(duplicatesList);
        setSummary({ total: data.length, novos: 0, novasVariantes: 0, updates: 0, iguais: 0, conflitos: 0, erros: data.length });
        setIsProcessing(false);
        return;
      }

      setDuplicates([]);

      // Fetch existing catalog items with relations
      const { data: existingItems, error: fetchError } = await supabase
        .from('material_catalog')
        .select(`
          id, codigo, descricao, unidade, hh_unit_ref,
          group:material_groups(nome),
          category:material_categories(nome),
          subcategory:material_subcategories(nome)
        `);

      if (fetchError) throw fetchError;

      // Fetch existing variants
      const { data: existingVariants, error: variantsError } = await supabase
        .from('material_catalog_variants')
        .select('id, catalog_id, fabricante, preco_ref');

      if (variantsError) throw variantsError;

      // Build maps
      const catalogMap = new Map(existingItems?.map(item => [
        item.codigo.toLowerCase(),
        {
          ...item,
          grupo: item.group?.nome || null,
          categoria: item.category?.nome || null,
          subcategoria: item.subcategory?.nome || null,
        }
      ]) || []);

      // Map: catalog_id -> Map(fabricante -> variant)
      const variantsMap = new Map<string, Map<string, { id: string; preco_ref: number }>>();
      for (const v of existingVariants || []) {
        if (!variantsMap.has(v.catalog_id)) {
          variantsMap.set(v.catalog_id, new Map());
        }
        variantsMap.get(v.catalog_id)!.set(v.fabricante.toLowerCase(), { id: v.id, preco_ref: v.preco_ref });
      }

      // Process each row
      const previewRows: ImportPreviewRow[] = [];
      let novos = 0, novasVariantes = 0, updates = 0, iguais = 0, conflitos = 0, erros = 0;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2;

        const codigo = row[mapping.codigo]?.trim() || '';
        const descricao = row[mapping.descricao]?.trim() || '';
        const unidade = row[mapping.unidade]?.trim() || '';
        const fabricante = row[mapping.fabricante]?.trim() || '';
        const sku = mapping.sku !== undefined ? (row[mapping.sku]?.trim() || null) : null;
        const precoStr = row[mapping.preco_ref]?.replace(',', '.').trim() || '';
        const preco_ref = precoStr ? parseFloat(precoStr) : null;
        const hh_ref = mapping.hh_ref !== undefined ? 
          (row[mapping.hh_ref]?.replace(',', '.').trim() ? parseFloat(row[mapping.hh_ref].replace(',', '.')) : null) : null;
        
        // Parse hierarchy path if present
        const hierarquiaPathValue = mapping.hierarquia_path !== undefined ? (row[mapping.hierarquia_path]?.trim() || '') : '';
        const hasHierarchyPath = hierarquiaPathValue.length > 0;
        
        let grupo: string | null;
        let categoria: string | null;
        let subcategoria: string | null;
        
        if (hasHierarchyPath) {
          const parsed = parseHierarchyPath(hierarquiaPathValue);
          grupo = parsed.grupo;
          categoria = parsed.categoria;
          subcategoria = parsed.subcategoria;
        } else {
          grupo = mapping.grupo !== undefined ? (row[mapping.grupo]?.trim() || null) : null;
          categoria = mapping.categoria !== undefined ? (row[mapping.categoria]?.trim() || null) : null;
          subcategoria = mapping.subcategoria !== undefined ? (row[mapping.subcategoria]?.trim() || null) : null;
        }
        
        const tagsResult = mapping.tags !== undefined ? parseTags(row[mapping.tags]) : { tags: [] };
        const tags = tagsResult.tags;

        // Validation
        let status: ImportRowStatus = 'NOVO';
        let errorMessage: string | undefined;
        let conflictFields: string[] | undefined;
        let existingCatalogId: string | undefined;
        let existingVariantId: string | undefined;
        let existingPreco: number | null | undefined;
        let existingDescricao: string | undefined;
        let existingUnidade: string | undefined;
        let existingHhRef: number | null | undefined;

        if (hasHierarchyPath && !canFullUpdate) {
          status = 'ERRO';
          errorMessage = 'Somente Super Admin pode importar hierarquia por caminho';
          erros++;
        } else if (tagsResult.error) {
          status = 'ERRO';
          errorMessage = tagsResult.error;
          erros++;
        } else if (!codigo) {
          status = 'ERRO';
          errorMessage = 'Código vazio';
          erros++;
        } else if (!descricao) {
          status = 'ERRO';
          errorMessage = 'Descrição vazia';
          erros++;
        } else if (!unidade) {
          status = 'ERRO';
          errorMessage = 'Unidade vazia';
          erros++;
        } else if (!fabricante) {
          status = 'ERRO';
          errorMessage = 'Fabricante vazio (obrigatório)';
          erros++;
        } else if (preco_ref !== null && (isNaN(preco_ref) || preco_ref < 0)) {
          status = 'ERRO';
          errorMessage = 'Preço inválido (deve ser >= 0)';
          erros++;
        } else {
          const existingCatalog = catalogMap.get(codigo.toLowerCase());
          
          if (existingCatalog) {
            existingCatalogId = existingCatalog.id;
            existingDescricao = existingCatalog.descricao;
            existingUnidade = existingCatalog.unidade;
            existingHhRef = existingCatalog.hh_unit_ref;

            // Check for conflicts in base item (different descricao/unidade)
            const conflicts: string[] = [];
            if (descricao.toLowerCase() !== existingCatalog.descricao.toLowerCase()) {
              conflicts.push('Descrição');
            }
            if (unidade.toLowerCase() !== existingCatalog.unidade.toLowerCase()) {
              conflicts.push('Unidade');
            }

            if (conflicts.length > 0 && !canFullUpdate) {
              status = 'CONFLITO';
              conflictFields = conflicts;
              conflitos++;
            } else {
              // Check if variant exists
              const variantsByFabricante = variantsMap.get(existingCatalog.id);
              const existingVariant = variantsByFabricante?.get(fabricante.toLowerCase());

              if (existingVariant) {
                existingVariantId = existingVariant.id;
                existingPreco = existingVariant.preco_ref;
                
                const newPreco = preco_ref ?? 0;
                if (Math.abs(existingVariant.preco_ref - newPreco) > 0.001) {
                  status = 'UPDATE_PRECO';
                  updates++;
                } else {
                  status = 'IGUAL';
                  iguais++;
                }
              } else {
                // New variant for existing catalog item
                status = 'NOVA_VARIANTE';
                novasVariantes++;
              }
            }
          } else {
            // New catalog item + new variant
            status = 'NOVO';
            novos++;
          }
        }

        previewRows.push({
          rowNumber,
          codigo,
          descricao,
          unidade,
          hh_ref,
          fabricante,
          sku,
          preco_ref,
          grupo,
          categoria,
          subcategoria,
          tags,
          status,
          errorMessage,
          conflictFields,
          existingCatalogId,
          existingVariantId,
          existingPreco,
          existingDescricao,
          existingUnidade,
          existingHhRef,
        });
      }

      setPreview(previewRows);
      setSummary({ total: data.length, novos, novasVariantes, updates, iguais, conflitos, erros });
    } catch (error) {
      toast.error('Erro ao gerar prévia');
    } finally {
      setIsProcessing(false);
    }
  }, [canFullUpdate]);

  // Upsert group/category/subcategory
  const upsertHierarchy = async (grupo: string | null, categoria: string | null, subcategoria: string | null): Promise<{
    group_id: string | null;
    category_id: string | null;
    subcategory_id: string | null;
  }> => {
    let group_id: string | null = null;
    let category_id: string | null = null;
    let subcategory_id: string | null = null;

    if (grupo) {
      const { data: existingGroup } = await supabase
        .from('material_groups')
        .select('id')
        .ilike('nome', grupo)
        .single();

      if (existingGroup) {
        group_id = existingGroup.id;
      } else {
        const { data: newGroup, error } = await supabase
          .from('material_groups')
          .insert({ nome: grupo })
          .select('id')
          .single();
        if (!error && newGroup) {
          group_id = newGroup.id;
        }
      }

      if (group_id && categoria) {
        const { data: existingCategory } = await supabase
          .from('material_categories')
          .select('id')
          .eq('group_id', group_id)
          .ilike('nome', categoria)
          .single();

        if (existingCategory) {
          category_id = existingCategory.id;
        } else {
          const { data: newCategory, error } = await supabase
            .from('material_categories')
            .insert({ group_id, nome: categoria })
            .select('id')
            .single();
          if (!error && newCategory) {
            category_id = newCategory.id;
          }
        }

        if (category_id && subcategoria) {
          const { data: existingSubcategory } = await supabase
            .from('material_subcategories')
            .select('id')
            .eq('category_id', category_id)
            .ilike('nome', subcategoria)
            .single();

          if (existingSubcategory) {
            subcategory_id = existingSubcategory.id;
          } else {
            const { data: newSubcategory, error } = await supabase
              .from('material_subcategories')
              .insert({ category_id, nome: subcategoria })
              .select('id')
              .single();
            if (!error && newSubcategory) {
              subcategory_id = newSubcategory.id;
            }
          }
        }
      }
    }

    return { group_id, category_id, subcategory_id };
  };

  // Upsert tags
  const upsertTags = async (tagNames: string[]): Promise<string[]> => {
    if (tagNames.length === 0) return [];

    const tagIds: string[] = [];

    for (const nome of tagNames) {
      const { data: existing } = await supabase
        .from('material_tags')
        .select('id')
        .ilike('nome', nome)
        .single();

      if (existing) {
        tagIds.push(existing.id);
      } else {
        const { data: newTag, error } = await supabase
          .from('material_tags')
          .insert({ nome })
          .select('id')
          .single();
        if (!error && newTag) {
          tagIds.push(newTag.id);
        }
      }
    }

    return tagIds;
  };

  // Set tags for a material
  const setMaterialTags = async (materialId: string, tagIds: string[]) => {
    await supabase
      .from('material_catalog_tags')
      .delete()
      .eq('material_id', materialId);

    if (tagIds.length > 0) {
      await supabase
        .from('material_catalog_tags')
        .insert(tagIds.map(tag_id => ({ material_id: materialId, tag_id })));
    }
  };

  // Apply import
  const applyImport = useCallback(async (fullUpdate: boolean = false): Promise<boolean> => {
    if (!canImport) {
      toast.error('Sem permissão para importar');
      return false;
    }

    if (duplicates.length > 0) {
      toast.error('Corrija os duplicados (codigo+fabricante) antes de aplicar');
      return false;
    }

    if (!summary || summary.erros > 0) {
      toast.error('Corrija os erros antes de aplicar');
      return false;
    }

    if (summary.conflitos > 0 && !fullUpdate) {
      toast.error('Existem conflitos. Super Admin pode optar por sobrescrever.');
      return false;
    }

    if (fullUpdate && !canFullUpdate) {
      toast.error('Apenas Super Admin pode fazer atualização completa');
      return false;
    }

    setIsProcessing(true);

    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('arquivos_importacao')
        .insert({
          nome_arquivo: 'catalogo_materiais_import',
          tipo_arquivo: 'XLSX',
          tipo: 'CATALOGO_MATERIAIS',
          total_linhas: summary.total,
          linhas_sucesso: 0,
          linhas_erro: summary.erros,
          usuario_id: user?.id,
          resumo_json: {
            novos: summary.novos,
            novasVariantes: summary.novasVariantes,
            updates: summary.updates,
            iguais: summary.iguais,
            conflitos: summary.conflitos,
            erros: summary.erros,
          },
        })
        .select('id')
        .single();

      if (importError) throw importError;

      const importRunId = importRecord.id;
      let successCount = 0;

      // Process new items (new catalog + new variant)
      const newItems = preview.filter(row => row.status === 'NOVO');
      for (const item of newItems) {
        const hierarchy = await upsertHierarchy(item.grupo, item.categoria, item.subcategoria);
        const tagIds = await upsertTags(item.tags);

        const { data: newMaterial, error: insertError } = await supabase
          .from('material_catalog')
          .insert({
            codigo: item.codigo,
            descricao: item.descricao,
            unidade: item.unidade,
            hh_unit_ref: item.hh_ref ?? 0,
            group_id: hierarchy.group_id,
            category_id: hierarchy.category_id,
            subcategory_id: hierarchy.subcategory_id,
            ativo: true,
          })
          .select('id')
          .single();

        if (!insertError && newMaterial) {
          // Create variant
          await supabase
            .from('material_catalog_variants')
            .insert({
              catalog_id: newMaterial.id,
              fabricante: item.fabricante,
              sku: item.sku,
              preco_ref: item.preco_ref ?? 0,
              created_by: user?.id,
            });

          if (tagIds.length > 0) {
            await setMaterialTags(newMaterial.id, tagIds);
          }
          successCount++;
        }
      }

      // Process new variants for existing catalog items
      const newVariants = preview.filter(row => row.status === 'NOVA_VARIANTE');
      for (const item of newVariants) {
        if (!item.existingCatalogId) continue;

        await supabase
          .from('material_catalog_variants')
          .insert({
            catalog_id: item.existingCatalogId,
            fabricante: item.fabricante,
            sku: item.sku,
            preco_ref: item.preco_ref ?? 0,
            created_by: user?.id,
          });
        successCount++;
      }

      // Process price updates on existing variants
      const updateItems = preview.filter(row => row.status === 'UPDATE_PRECO' || (row.status === 'CONFLITO' && fullUpdate));
      for (const item of updateItems) {
        if (!item.existingVariantId) continue;

        // Record price history
        const oldPrice = item.existingPreco ?? 0;
        const newPrice = item.preco_ref ?? 0;
        if (Math.abs(oldPrice - newPrice) > 0.001) {
          await supabase
            .from('material_variant_price_history')
            .insert({
              variant_id: item.existingVariantId,
              old_price: oldPrice,
              new_price: newPrice,
              changed_by: user?.id,
              import_run_id: importRunId,
            });
        }

        // Update variant price
        await supabase
          .from('material_catalog_variants')
          .update({ preco_ref: item.preco_ref ?? 0, updated_by: user?.id })
          .eq('id', item.existingVariantId);

        // If fullUpdate, also update catalog item
        if (fullUpdate && canFullUpdate && item.existingCatalogId) {
          const hierarchy = await upsertHierarchy(item.grupo, item.categoria, item.subcategoria);
          const tagIds = await upsertTags(item.tags);

          await supabase
            .from('material_catalog')
            .update({
              descricao: item.descricao,
              unidade: item.unidade,
              hh_unit_ref: item.hh_ref ?? 0,
              group_id: hierarchy.group_id,
              category_id: hierarchy.category_id,
              subcategory_id: hierarchy.subcategory_id,
            })
            .eq('id', item.existingCatalogId);

          await setMaterialTags(item.existingCatalogId, tagIds);
        }

        successCount++;
      }

      // Update import record with success count
      await supabase
        .from('arquivos_importacao')
        .update({ linhas_sucesso: successCount })
        .eq('id', importRunId);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['all-material-variants'] });
      queryClient.invalidateQueries({ queryKey: ['material-groups'] });
      queryClient.invalidateQueries({ queryKey: ['material-categories'] });
      queryClient.invalidateQueries({ queryKey: ['material-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['material-tags'] });

      toast.success(`Importação concluída: ${summary.novos} novos, ${summary.novasVariantes} novas variantes, ${summary.updates} preços atualizados`);
      return true;
    } catch (error) {
      toast.error('Erro ao aplicar importação');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [canImport, canFullUpdate, duplicates, summary, preview, user?.id, queryClient]);

  // Reset state
  const reset = useCallback(() => {
    setPreview([]);
    setSummary(null);
    setDuplicates([]);
    setColumnMapping(null);
    setRawData([]);
    setHeaders([]);
  }, []);

  // Update column mapping manually
  const updateMapping = useCallback((newMapping: ColumnMapping) => {
    setColumnMapping(newMapping);
    if (rawData.length > 0) {
      generatePreview(rawData, newMapping);
    }
  }, [rawData, generatePreview]);

  // Generate template file
  const downloadTemplate = useCallback(() => {
    const templateData = [
      ['codigo', 'descricao', 'unidade', 'hh_ref', 'fabricante', 'sku', 'preco_ref', 'grupo', 'categoria', 'subcategoria', 'tags', 'hierarquia_path'],
      ['MAT-001', 'Cabo PP 3x2.5mm²', 'm', '0.05', 'Prysmian', 'PY-001', '12.50', 'Cabos', 'Cabos de Força', 'Baixa Tensão', 'elétrico;cobre', ''],
      ['MAT-001', 'Cabo PP 3x2.5mm²', 'm', '0.05', 'Nexans', 'NX-001', '11.80', '', '', '', '', ''],
      ['MAT-002', 'Disjuntor 3P 100A', 'pç', '0.25', 'ABB', 'ABB-D100', '450.00', '', '', '', 'proteção;industrial', 'Proteção / Disjuntores'],
      ['MAT-002', 'Disjuntor 3P 100A', 'pç', '0.25', 'Siemens', 'SIE-D100', '480.00', '', '', '', '', ''],
      ['MAT-003', 'Cabo F.O. 12 fibras', 'm', '0.10', 'Furukawa', 'FK-FO12', '35.00', '', '', '', 'óptico', 'Cabos / Cabos de F.O.'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    ws['!cols'] = [
      { wch: 12 }, // codigo
      { wch: 30 }, // descricao
      { wch: 8 },  // unidade
      { wch: 8 },  // hh_ref
      { wch: 15 }, // fabricante
      { wch: 12 }, // sku
      { wch: 12 }, // preco_ref
      { wch: 15 }, // grupo
      { wch: 20 }, // categoria
      { wch: 20 }, // subcategoria
      { wch: 25 }, // tags
      { wch: 50 }, // hierarquia_path
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiais');
    XLSX.writeFile(wb, 'template_catalogo_materiais.xlsx');
  }, []);

  return {
    isProcessing,
    preview,
    summary,
    duplicates,
    columnMapping,
    headers,
    canImport,
    canFullUpdate,
    processFile,
    applyImport,
    reset,
    updateMapping,
    downloadTemplate,
  };
}
