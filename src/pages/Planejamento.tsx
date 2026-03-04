import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import GanttChart from '@/components/GanttChart';
import AlocacaoForm from '@/components/AlocacaoForm';
import AlocacoesDiaModal from '@/components/AlocacoesDiaModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Wand2,
  Loader2,
  Search,
  LayoutGrid,
  GanttChart as GanttIcon,
  Download,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { format, addMonths, subMonths, addWeeks, subWeeks, parseISO, addDays } from 'date-fns';
import { getGanttPeriod, PeriodType, groupConsecutiveDates } from '@/lib/gantt-utils';
import { Database } from '@/integrations/supabase/types';

type RegiaoColaborador = Database['public']['Enums']['regiao_colaborador'];

interface Block {
  id: string;
  colaborador_id: string;
  projeto_id: string;
  projeto_nome: string;
  projeto_os: string;
  empresa_nome: string;
  data_inicio: string;
  data_fim: string;
  observacao?: string | null;
  tipo: 'planejado' | 'realizado';
}

interface Collaborator {
  id: string;
  full_name: string;
  hire_date: string;
  termination_date?: string | null;
  status: string;
  regiao?: RegiaoColaborador | null;
}

export default function Planejamento() {
  const { loading: authLoading, user, hasAnyRole, isGodMode } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [search, setSearch] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState<string>('');
  const [projetoFilter, setProjetoFilter] = useState<string>('');
  const [regiaoFilter, setRegiaoFilter] = useState<string>('');
  const [tipoColabFilter, setTipoColabFilter] = useState<string>('');
  const [fixosExpanded, setFixosExpanded] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [defaultFormData, setDefaultFormData] = useState<{
    colaboradorId?: string;
    dataInicio?: string;
    dataFim?: string;
  }>({});

  // New multi-allocation modal state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [viewMode, setViewMode] = useState<'gantt' | 'grid'>('gantt');

  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);
  const [isPullingApontamentos, setIsPullingApontamentos] = useState(false);

  const period = useMemo(() => getGanttPeriod(currentDate, periodType), [currentDate, periodType]);

  // Fetch user profile for "Minha Região" feature
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('regiao')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch collaborators with regiao
  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['collaborators-gantt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, hire_date, termination_date, status, regiao')
        .eq('status', 'ativo')
        .order('full_name');
      if (error) throw error;
      return data as Collaborator[];
    },
  });

  // Fetch blocks for the period
  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['alocacoes-blocos', period.start.toISOString(), period.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alocacoes_blocos')
        .select(`
          id,
          colaborador_id,
          projeto_id,
          data_inicio,
          data_fim,
          observacao,
          tipo,
          projetos (
            nome,
            os,
            empresas (empresa)
          )
        `)
        .lte('data_inicio', format(period.end, 'yyyy-MM-dd'))
        .gte('data_fim', format(period.start, 'yyyy-MM-dd'));

      if (error) throw error;

      return data.map((b: any) => ({
        id: b.id,
        colaborador_id: b.colaborador_id,
        projeto_id: b.projeto_id,
        data_inicio: b.data_inicio,
        data_fim: b.data_fim,
        observacao: b.observacao,
        tipo: b.tipo || 'planejado',
        projeto_nome: b.projetos?.nome || '',
        projeto_os: b.projetos?.os || '',
        empresa_nome: b.projetos?.empresas?.empresa || '',
      })) as Block[];
    },
  });

  // Fetch empresas for filter
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, codigo, empresa')
        .eq('status', 'ativo')
        .order('codigo');
      if (error) throw error;
      return data;
    },
  });

  // Fetch projetos for filter
  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos-filter', empresaFilter],
    queryFn: async () => {
      let query = supabase
        .from('projetos')
        .select('id, nome, empresa_id')
        .eq('status', 'ativo')
        .order('nome');

      if (empresaFilter) {
        query = query.eq('empresa_id', empresaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch default allocations
  const { data: defaultAllocations = [] } = useQuery({
    queryKey: ['alocacoes-padrao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alocacoes_padrao')
        .select(`
          id,
          colaborador_id,
          projeto_id,
          data_inicio,
          data_fim,
          projetos (
            nome,
            empresas (codigo)
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  // Get IDs of collaborators with active default allocations (Fixos)
  const fixosIds = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const ids = new Set<string>();
    for (const def of defaultAllocations as any[]) {
      const dataInicio = def.data_inicio;
      const dataFim = def.data_fim;
      
      // Active if: data_inicio <= today AND (data_fim is null OR data_fim >= today)
      if (dataInicio <= todayStr && (!dataFim || dataFim >= todayStr)) {
        ids.add(def.colaborador_id);
      }
    }
    return ids;
  }, [defaultAllocations]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from('alocacoes_blocos')
        .delete()
        .eq('id', blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
      toast.success('Alocação excluída com sucesso');
      setDeleteBlockId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir alocação');
    },
  });

  // Filter collaborators
  const filteredCollaborators = useMemo(() => {
    let result = collaborators;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((c) =>
        c.full_name.toLowerCase().includes(searchLower)
      );
    }

    // Region filter
    if (regiaoFilter) {
      result = result.filter((c) => c.regiao === regiaoFilter);
    }

    // Tipo filter (Fixos/Variáveis)
    if (tipoColabFilter === 'fixos') {
      result = result.filter((c) => fixosIds.has(c.id));
    } else if (tipoColabFilter === 'variaveis') {
      result = result.filter((c) => !fixosIds.has(c.id));
    }

    // If project filter is active, only show collaborators with allocations in that project
    if (projetoFilter) {
      const collabsWithProject = new Set(
        blocks.filter((b) => b.projeto_id === projetoFilter).map((b) => b.colaborador_id)
      );
      result = result.filter((c) => collabsWithProject.has(c.id));
    }

    // If empresa filter is active but no project filter
    if (empresaFilter && !projetoFilter) {
      const projectIdsForEmpresa = new Set(
        projetos.filter((p) => p.empresa_id === empresaFilter).map((p) => p.id)
      );
      const collabsWithEmpresa = new Set(
        blocks.filter((b) => projectIdsForEmpresa.has(b.projeto_id)).map((b) => b.colaborador_id)
      );
      result = result.filter((c) => collabsWithEmpresa.has(c.id));
    }

    return result;
  }, [collaborators, search, projetoFilter, empresaFilter, blocks, projetos, regiaoFilter, tipoColabFilter, fixosIds]);

  // Split collaborators into Variáveis and Fixos
  const { variaveisCollaborators, fixosCollaborators } = useMemo(() => {
    const variaveis = filteredCollaborators.filter(c => !fixosIds.has(c.id));
    const fixos = filteredCollaborators.filter(c => fixosIds.has(c.id));
    return { variaveisCollaborators: variaveis, fixosCollaborators: fixos };
  }, [filteredCollaborators, fixosIds]);

  // Get collaborators without allocations in the visible period
  const availableCollaborators = useMemo(() => {
    const allocatedIds = new Set(blocks.map(b => b.colaborador_id));
    return filteredCollaborators.filter(c => !allocatedIds.has(c.id));
  }, [filteredCollaborators, blocks]);

  // Navigate period
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (periodType === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else if (periodType === 'fortnight') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 2) : addWeeks(currentDate, 2));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  // Handle create block - save directly if project filter is set, otherwise open form
  const handleCreateBlock = async (colaboradorId: string, startDate: Date, endDate: Date) => {
    // If a project filter is set, create the block directly without popup
    if (projetoFilter) {
      try {
        const { error } = await supabase.from('alocacoes_blocos').insert({
          colaborador_id: colaboradorId,
          projeto_id: projetoFilter,
          data_inicio: format(startDate, 'yyyy-MM-dd'),
          data_fim: format(endDate, 'yyyy-MM-dd'),
          tipo: 'planejado',
        });
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
        toast.success('Alocação criada com sucesso');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao criar alocação');
      }
      return;
    }
    
    // Otherwise open form to select project
    setDefaultFormData({
      colaboradorId,
      dataInicio: format(startDate, 'yyyy-MM-dd'),
      dataFim: format(endDate, 'yyyy-MM-dd'),
    });
    setIsFormOpen(true);
  };

  // Handle move block
  const handleMoveBlock = async (blockId: string, newStartDate: Date, newEndDate: Date) => {
    const novaDataInicio = format(newStartDate, 'yyyy-MM-dd');
    const novaDataFim = format(newEndDate, 'yyyy-MM-dd');
    
    // Find original block to compare
    const originalBlock = blocks.find(b => b.id === blockId);
    
    // Skip if dates haven't changed
    if (originalBlock && originalBlock.data_inicio === novaDataInicio && originalBlock.data_fim === novaDataFim) {
      return;
    }

    try {
      const { error } = await supabase
        .from('alocacoes_blocos')
        .update({
          data_inicio: novaDataInicio,
          data_fim: novaDataFim,
        })
        .eq('id', blockId)
        .select();
      
      if (error) throw error;
      
      
      // Force refetch to ensure UI syncs with database
      await queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
      toast.success('Alocação movida com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao mover alocação');
    }
  };

  // Handle resize block
  const handleResizeBlock = async (blockId: string, newStartDate: Date, newEndDate: Date) => {
    const novaDataInicio = format(newStartDate, 'yyyy-MM-dd');
    const novaDataFim = format(newEndDate, 'yyyy-MM-dd');
    
    // Find original block to compare
    const originalBlock = blocks.find(b => b.id === blockId);
    
    // Skip if dates haven't changed
    if (originalBlock && originalBlock.data_inicio === novaDataInicio && originalBlock.data_fim === novaDataFim) {
      return;
    }

    try {
      const { error } = await supabase
        .from('alocacoes_blocos')
        .update({
          data_inicio: novaDataInicio,
          data_fim: novaDataFim,
        })
        .eq('id', blockId)
        .select();
      
      if (error) throw error;
      
      
      // Force refetch to ensure UI syncs with database
      await queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
      toast.success('Alocação redimensionada com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao redimensionar alocação');
    }
  };

  // Handle edit block - open multi-allocation modal
  const handleEditBlock = (block: Block, clickedDate: Date) => {
    setSelectedColaboradorId(block.colaborador_id);
    setSelectedDate(clickedDate);
    setDayModalOpen(true);
  };

  // Apply default allocations
  const handleApplyDefaults = async () => {
    setIsApplyingDefaults(true);
    const conflicts: string[] = [];
    let created = 0;

    try {
      for (const col of filteredCollaborators) {
        // Find active default for this collaborator
        const activeDefaults = defaultAllocations.filter((d: any) => {
          if (d.colaborador_id !== col.id) return false;
          if (!d.data_inicio) return false;
          const defStart = parseISO(d.data_inicio);
          const defEnd = d.data_fim ? parseISO(d.data_fim) : new Date('9999-12-31');
          // Check if default intersects with period
          return defStart <= period.end && defEnd >= period.start;
        });

        if (activeDefaults.length === 0) continue;
        if (activeDefaults.length > 1) {
          conflicts.push(`${col.full_name}: múltiplos padrões ativos`);
          continue;
        }

        const def = activeDefaults[0] as any;

        // Check if there's already a block for this collaborator in the period
        const existingBlock = blocks.find(
          (b) => b.colaborador_id === col.id
        );

        if (existingBlock) {
          conflicts.push(`${col.full_name}: já possui alocação no período`);
          continue;
        }

        // Determine block dates (clamped to period and collaborator employment)
        const defStart = def.data_inicio ? parseISO(def.data_inicio) : period.start;
        const defEnd = def.data_fim ? parseISO(def.data_fim) : period.end;
        const hireDate = col.hire_date ? parseISO(col.hire_date) : period.start;
        const termDate = col.termination_date ? parseISO(col.termination_date) : null;

        let blockStart = defStart < period.start ? period.start : defStart;
        let blockEnd = defEnd > period.end ? period.end : defEnd;

        // Clamp to employment dates
        if (blockStart < hireDate) blockStart = hireDate;
        if (termDate && blockEnd > termDate) blockEnd = termDate;

        if (blockStart > blockEnd) {
          conflicts.push(`${col.full_name}: período inválido`);
          continue;
        }

        // Create block
        const { error } = await supabase.from('alocacoes_blocos').insert({
          colaborador_id: col.id,
          projeto_id: def.projeto_id,
          data_inicio: format(blockStart, 'yyyy-MM-dd'),
          data_fim: format(blockEnd, 'yyyy-MM-dd'),
          observacao: 'Criado automaticamente via padrões',
        });

        if (error) {
          conflicts.push(`${col.full_name}: ${error.message}`);
        } else {
          created++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });

      if (created > 0) {
        toast.success(`${created} alocação(ões) criada(s) com sucesso`);
      }

      if (conflicts.length > 0) {
        toast.warning(`${conflicts.length} conflito(s): ${conflicts.slice(0, 3).join(', ')}${conflicts.length > 3 ? '...' : ''}`);
      }

      if (created === 0 && conflicts.length === 0) {
        toast.info('Nenhum padrão aplicável encontrado para o período');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aplicar padrões');
    } finally {
      setIsApplyingDefaults(false);
    }
  };

  // Pull appointments from apontamento_item to create/update blocks
  const handlePullApontamentos = async () => {
    setIsPullingApontamentos(true);
    let created = 0;
    let updated = 0;

    try {
      // Fetch all apontamentos in the period from apontamento_item
      const { data: rawApontamentos, error: aptError } = await supabase
        .from('apontamento_item')
        .select(`
          id,
          projeto_id,
          horas,
          apontamento_dia!inner (
            colaborador_id,
            data
          )
        `)
        .gt('horas', 0)
        .gte('apontamento_dia.data', format(period.start, 'yyyy-MM-dd'))
        .lte('apontamento_dia.data', format(period.end, 'yyyy-MM-dd'));

      if (aptError) throw aptError;

      // Transform to expected format
      const apontamentos = (rawApontamentos || []).map((item: any) => ({
        colaborador_id: item.apontamento_dia.colaborador_id,
        projeto_id: item.projeto_id,
        data: item.apontamento_dia.data,
      }));

      if (apontamentos.length === 0) {
        toast.info('Nenhum apontamento encontrado no período');
        return;
      }

      // Group by collaborator + project
      const groupedMap = new Map<string, { colaborador_id: string; projeto_id: string; dates: string[] }>();
      
      for (const apt of apontamentos) {
        const key = `${apt.colaborador_id}_${apt.projeto_id}`;
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            colaborador_id: apt.colaborador_id,
            projeto_id: apt.projeto_id,
            dates: [],
          });
        }
        groupedMap.get(key)!.dates.push(apt.data);
      }

      // For each group, create or expand realizado block
      for (const [, group] of groupedMap) {
        // Deduplicate and sort dates
        const sortedDates = [...new Set(group.dates)].sort();
        
        // Separate into consecutive date groups
        const dateGroups = groupConsecutiveDates(sortedDates);
        
        // For EACH consecutive date group
        for (const consecutiveDates of dateGroups) {
          const minDate = consecutiveDates[0];
          const maxDate = consecutiveDates[consecutiveDates.length - 1];
          
          // Search for blocks that overlap OR are adjacent (+/- 1 day)
          const { data: existingBlocks, error: searchError } = await supabase
            .from('alocacoes_blocos')
            .select('id, data_inicio, data_fim')
            .eq('colaborador_id', group.colaborador_id)
            .eq('projeto_id', group.projeto_id)
            .eq('tipo', 'realizado')
            .lte('data_inicio', format(addDays(parseISO(maxDate), 1), 'yyyy-MM-dd'))
            .gte('data_fim', format(addDays(parseISO(minDate), -1), 'yyyy-MM-dd'));
          
          if (searchError) {
            continue;
          }

          // Check if dates are already fully covered by existing block
          const isAlreadyCovered = existingBlocks?.some(block => 
            minDate >= block.data_inicio && maxDate <= block.data_fim
          );

          if (isAlreadyCovered) {
            // Already covered by existing block, skip
            continue;
          }

          if (existingBlocks && existingBlocks.length > 0) {
            // Expand existing block to cover all dates
            const allDates = [...consecutiveDates];
            existingBlocks.forEach(block => {
              allDates.push(block.data_inicio, block.data_fim);
            });
            allDates.sort();
            const newMinDate = allDates[0];
            const newMaxDate = allDates[allDates.length - 1];

            const { error: updateError } = await supabase
              .from('alocacoes_blocos')
              .update({
                data_inicio: newMinDate,
                data_fim: newMaxDate,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingBlocks[0].id);
            
            if (updateError) {
            } else {
              updated++;
            }

            // Delete duplicate overlapping blocks
            if (existingBlocks.length > 1) {
              const idsToDelete = existingBlocks.slice(1).map(b => b.id);
              await supabase
                .from('alocacoes_blocos')
                .delete()
                .in('id', idsToDelete);
            }
          } else {
            // Create new realizado block
            const { error: insertError } = await supabase
              .from('alocacoes_blocos')
              .insert({
                colaborador_id: group.colaborador_id,
                projeto_id: group.projeto_id,
                data_inicio: minDate,
                data_fim: maxDate,
                tipo: 'realizado',
                observacao: 'Criado via puxar apontamentos',
              });
            
            if (insertError) {
            } else {
              created++;
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });

      if (created > 0 || updated > 0) {
        toast.success(`${created} bloco(s) criado(s), ${updated} atualizado(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao puxar apontamentos');
    } finally {
      setIsPullingApontamentos(false);
    }
  };

  // Auth check - redirect in useEffect to avoid calling navigate during render
  useEffect(() => {
    if (!authLoading && (!user || !hasAnyRole())) {
      navigate('/auth');
    }
  }, [authLoading, user, hasAnyRole, navigate]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !hasAnyRole()) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Planejamento Gantt</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie alocações de colaboradores por projeto
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as 'gantt' | 'grid')}
              className="bg-muted p-0.5 rounded-lg"
            >
              <ToggleGroupItem 
                value="gantt" 
                aria-label="Gantt" 
                className="gap-1.5 px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md text-xs"
              >
                <GanttIcon className="h-3.5 w-3.5" />
                Gantt
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="grid" 
                aria-label="Grade" 
                className="gap-1.5 px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md text-xs"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grade
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePullApontamentos}
              disabled={isPullingApontamentos}
            >
              {isPullingApontamentos ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Puxar Apontamentos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyDefaults}
              disabled={isApplyingDefaults}
            >
              {isApplyingDefaults ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Padrões
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDefaultFormData({});
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Alocar
            </Button>
          </div>
        </div>

        {/* Filters - single row */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
          {/* Period navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center text-sm font-medium capitalize">
              {period.label}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Period type */}
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="fortnight">Quinzena</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>

          {/* Região filter */}
          <Select
            value={regiaoFilter}
            onValueChange={(v) => setRegiaoFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Regiões</SelectItem>
              <SelectItem value="Campos Gerais">Campos Gerais</SelectItem>
              <SelectItem value="Paranaguá">Paranaguá</SelectItem>
            </SelectContent>
          </Select>

          {/* Tipo Colaborador filter */}
          <Select
            value={tipoColabFilter}
            onValueChange={(v) => setTipoColabFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="variaveis">Variáveis</SelectItem>
              <SelectItem value="fixos">Fixos</SelectItem>
            </SelectContent>
          </Select>

          {/* Empresa filter */}
          <Select
            value={empresaFilter}
            onValueChange={(v) => {
              setEmpresaFilter(v === 'all' ? '' : v);
              setProjetoFilter('');
            }}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Projeto filter */}
          <Select
            value={projetoFilter}
            onValueChange={(v) => setProjetoFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Quick View buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={regiaoFilter === userProfile?.regiao ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (userProfile?.regiao) {
                setRegiaoFilter(regiaoFilter === userProfile.regiao ? '' : userProfile.regiao);
              } else {
                toast.info('Sua região não está configurada no perfil');
              }
            }}
            disabled={!userProfile?.regiao}
          >
            <MapPin className="mr-1.5 h-3.5 w-3.5" />
            Minha Região
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Filter to show only available collaborators
              const availableIds = availableCollaborators.map(c => c.id);
              if (availableIds.length === 0) {
                toast.info('Todos os colaboradores possuem alocação no período');
              } else {
                toast.success(`${availableIds.length} colaborador(es) disponível(eis)`);
              }
            }}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Disponíveis ({availableCollaborators.length})
          </Button>
        </div>

        {/* Gantt Chart with sections */}
        {loadingCollaborators || loadingBlocks ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Variáveis Section - Always expanded */}
            {tipoColabFilter !== 'fixos' && variaveisCollaborators.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-primary/30" />
                  <span className="text-sm font-bold text-primary uppercase tracking-wide">
                    Variáveis ({variaveisCollaborators.length})
                  </span>
                  <div className="h-px flex-1 bg-primary/30" />
                </div>
                <GanttChart
                  collaborators={variaveisCollaborators}
                  blocks={blocks}
                  period={period}
                  onEditBlock={handleEditBlock}
                  onDeleteBlock={(id) => setDeleteBlockId(id)}
                  onCreateBlock={handleCreateBlock}
                  onMoveBlock={handleMoveBlock}
                  onResizeBlock={handleResizeBlock}
                  viewMode={viewMode}
                  canDeleteRealized={isGodMode()}
                />
              </div>
            )}

            {/* Fixos Section - Collapsible */}
            {tipoColabFilter !== 'variaveis' && fixosCollaborators.length > 0 && (
              <Collapsible open={fixosExpanded} onOpenChange={setFixosExpanded}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 px-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="h-px flex-1 bg-muted-foreground/30" />
                    <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground uppercase tracking-wide">
                      {fixosExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      Fixos ({fixosCollaborators.length})
                    </div>
                    <div className="h-px flex-1 bg-muted-foreground/30" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <GanttChart
                    collaborators={fixosCollaborators}
                    blocks={blocks}
                    period={period}
                    onEditBlock={handleEditBlock}
                    onDeleteBlock={(id) => setDeleteBlockId(id)}
                    onCreateBlock={handleCreateBlock}
                    onMoveBlock={handleMoveBlock}
                    onResizeBlock={handleResizeBlock}
                    viewMode={viewMode}
                    canDeleteRealized={isGodMode()}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Empty state */}
            {variaveisCollaborators.length === 0 && fixosCollaborators.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum colaborador encontrado com os filtros aplicados
              </div>
            )}
          </div>
        )}

        {/* Form Dialog - Only for creation, editing is done via AlocacoesDiaModal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Alocação</DialogTitle>
              <DialogDescription>
                Preencha os campos para criar uma nova alocação.
              </DialogDescription>
            </DialogHeader>
            <AlocacaoForm
              colaboradorId={defaultFormData.colaboradorId}
              dataInicio={defaultFormData.dataInicio}
              dataFim={defaultFormData.dataFim}
              onSuccess={() => {
                setIsFormOpen(false);
                queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
              }}
              onCancel={() => {
                setIsFormOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Multi-allocation day modal */}
        {selectedColaboradorId && selectedDate && (
          <AlocacoesDiaModal
            open={dayModalOpen}
            onOpenChange={setDayModalOpen}
            colaboradorId={selectedColaboradorId}
            colaboradorNome={collaborators.find(c => c.id === selectedColaboradorId)?.full_name || ''}
            dataClicada={selectedDate}
            alocacoes={blocks.filter(b =>
              b.colaborador_id === selectedColaboradorId &&
              b.data_inicio && b.data_fim &&
              parseISO(b.data_inicio) <= selectedDate &&
              parseISO(b.data_fim) >= selectedDate
            )}
            allProjectIds={[...new Set(blocks.map((b) => b.projeto_id))]}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['alocacoes-blocos'] });
            }}
            canDeleteRealized={isGodMode()}
          />
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteBlockId} onOpenChange={() => setDeleteBlockId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta alocação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteBlockId && deleteMutation.mutate(deleteBlockId)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
