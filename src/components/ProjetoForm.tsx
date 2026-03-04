import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Check, ChevronsUpDown, Plus, Lock, CalendarIcon, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import EmpresaForm from './EmpresaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Projeto = Database['public']['Tables']['projetos']['Row'];
type Empresa = Database['public']['Tables']['empresas']['Row'];

type ProjetoWithEmpresa = Projeto & {
  empresas: Pick<Empresa, 'empresa' | 'codigo' | 'unidade'> | null;
};

interface ProjetoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projeto?: ProjetoWithEmpresa | null;
  onSuccess: () => void;
}

const RESERVED_NAMES = ['ORÇAMENTOS'];

export default function ProjetoForm({ open, onOpenChange, projeto, onSuccess }: ProjetoFormProps) {
  const { isGodMode, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clienteComboOpen, setClienteComboOpen] = useState(false);
  const [clienteFormOpen, setClienteFormOpen] = useState(false);
  const [dataInicioOpen, setDataInicioOpen] = useState(false);
  const [dataFimOpen, setDataFimOpen] = useState(false);

  const canApprove = isGodMode();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    empresa_id: '',
    os: '',
    tipo_contrato: 'PRECO_FECHADO' as 'PRECO_FECHADO' | 'MAO_DE_OBRA',
    valor_contrato: 0,
    horas_previstas: null as number | null,
    data_inicio_planejada: null as Date | null,
    data_fim_planejada: null as Date | null,
    risco_escopo: 'MEDIO' as 'BAIXO' | 'MEDIO' | 'ALTO',
    risco_liberacao_cliente: 'MEDIO' as 'BAIXO' | 'MEDIO' | 'ALTO',
    observacoes_riscos: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: empresas, refetch: refetchEmpresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('empresa');

      if (error) throw error;
      return data as Empresa[];
    },
  });

  // Filter only active empresas and exclude system companies for new projects
  const availableEmpresas = empresas?.filter(
    (emp) => (emp.status === 'ativo' && emp.codigo !== 'SYS' && emp.codigo !== 'COM') || emp.id === projeto?.empresa_id
  );

  useEffect(() => {
    if (projeto) {
      setFormData({
        nome: projeto.nome,
        descricao: projeto.descricao || '',
        empresa_id: projeto.empresa_id,
        os: projeto.os,
        tipo_contrato: (projeto.tipo_contrato as 'PRECO_FECHADO' | 'MAO_DE_OBRA') || 'PRECO_FECHADO',
        valor_contrato: projeto.valor_contrato || 0,
        horas_previstas: projeto.horas_previstas || null,
        data_inicio_planejada: projeto.data_inicio_planejada ? new Date(projeto.data_inicio_planejada) : null,
        data_fim_planejada: projeto.data_fim_planejada ? new Date(projeto.data_fim_planejada) : null,
        risco_escopo: (projeto.risco_escopo as 'BAIXO' | 'MEDIO' | 'ALTO') || 'MEDIO',
        risco_liberacao_cliente: (projeto.risco_liberacao_cliente as 'BAIXO' | 'MEDIO' | 'ALTO') || 'MEDIO',
        observacoes_riscos: projeto.observacoes_riscos || '',
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
        empresa_id: '',
        os: '',
        tipo_contrato: 'PRECO_FECHADO',
        valor_contrato: 0,
        horas_previstas: null,
        data_inicio_planejada: null,
        data_fim_planejada: null,
        risco_escopo: 'MEDIO',
        risco_liberacao_cliente: 'MEDIO',
        observacoes_riscos: '',
      });
    }
    setErrors({});
  }, [projeto, open]);

  const selectedEmpresa = empresas?.find((e) => e.id === formData.empresa_id);
  const isSystemProject = projeto?.is_sistema === true;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    if (RESERVED_NAMES.includes(formData.nome.trim().toUpperCase())) {
      newErrors.nome = 'Este nome é reservado para projetos do sistema';
    }

    if (!formData.empresa_id) {
      newErrors.empresa_id = 'Cliente é obrigatório';
    }

    if (!formData.tipo_contrato) {
      newErrors.tipo_contrato = 'Tipo de contrato é obrigatório';
    }

    if (formData.valor_contrato < 0) {
      newErrors.valor_contrato = 'Valor deve ser maior ou igual a zero';
    }

    if (!formData.data_inicio_planejada) {
      newErrors.data_inicio_planejada = 'Data de início é obrigatória';
    }

    if (!formData.data_fim_planejada) {
      newErrors.data_fim_planejada = 'Data de fim é obrigatória';
    }

    if (formData.data_inicio_planejada && formData.data_fim_planejada) {
      if (formData.data_fim_planejada < formData.data_inicio_planejada) {
        newErrors.data_fim_planejada = 'Data fim deve ser maior ou igual à data início';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (projeto) {
        // Update existing project
        const updateData: any = {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          empresa_id: formData.empresa_id,
          tipo_contrato: formData.tipo_contrato,
          valor_contrato: formData.valor_contrato,
          horas_previstas: formData.horas_previstas,
          data_inicio_planejada: formData.data_inicio_planejada ? format(formData.data_inicio_planejada, 'yyyy-MM-dd') : null,
          data_fim_planejada: formData.data_fim_planejada ? format(formData.data_fim_planejada, 'yyyy-MM-dd') : null,
          risco_escopo: formData.risco_escopo,
          risco_liberacao_cliente: formData.risco_liberacao_cliente,
          observacoes_riscos: formData.observacoes_riscos.trim() || null,
        };
        
        // Only include OS in update if user is super_admin and it was changed
        if (isGodMode() && formData.os !== projeto.os) {
          updateData.os = formData.os.trim();
        }

        const { error } = await supabase
          .from('projetos')
          .update(updateData)
          .eq('id', projeto.id);

        if (error) throw error;
        toast.success('Projeto atualizado com sucesso!');
      } else {
        // Create new project
        // If user is SUPER_ADMIN, create as APROVADO and generate OS
        // Otherwise, create as PENDENTE_APROVACAO without OS
        
        const insertData: any = {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          empresa_id: formData.empresa_id,
          tipo_contrato: formData.tipo_contrato,
          valor_contrato: formData.valor_contrato,
          horas_previstas: formData.horas_previstas,
          data_inicio_planejada: formData.data_inicio_planejada ? format(formData.data_inicio_planejada, 'yyyy-MM-dd') : null,
          data_fim_planejada: formData.data_fim_planejada ? format(formData.data_fim_planejada, 'yyyy-MM-dd') : null,
          risco_escopo: formData.risco_escopo,
          risco_liberacao_cliente: formData.risco_liberacao_cliente,
          observacoes_riscos: formData.observacoes_riscos.trim() || null,
          solicitado_por: user?.id,
          solicitado_em: new Date().toISOString(),
        };

        if (canApprove) {
          // SuperAdmin can create directly as approved
          const { data: nextOs } = await supabase.rpc('generate_next_os');
          insertData.os = nextOs || '26001';
          insertData.aprovacao_status = 'APROVADO';
          insertData.aprovado_por = user?.id;
          insertData.aprovado_em = new Date().toISOString();
        } else {
          // Regular user or Admin - pending approval, temporary OS
          const tempOs = `TEMP-${Date.now()}`;
          insertData.os = tempOs;
          insertData.aprovacao_status = 'PENDENTE_APROVACAO';
        }

        const { error } = await supabase
          .from('projetos')
          .insert(insertData);

        if (error) throw error;

        if (canApprove) {
          toast.success('Projeto criado e aprovado com sucesso!');
        } else {
          toast.success('Projeto solicitado! Aguardando aprovação.');
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar projeto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClienteCreated = async (createdEmpresa?: Empresa) => {
    await refetchEmpresas();
    setClienteFormOpen(false);
    
    // Auto-select the newly created client
    if (createdEmpresa) {
      setFormData((prev) => ({ ...prev, empresa_id: createdEmpresa.id }));
      toast.success('Cliente criado e selecionado!');
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'BAIXO': return 'bg-green-500/20 text-green-500';
      case 'MEDIO': return 'bg-yellow-500/20 text-yellow-500';
      case 'ALTO': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{projeto ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
            <DialogDescription>
              {!canApprove && !projeto && (
                <span className="flex items-center gap-2 text-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  O projeto será enviado para aprovação antes de ficar operacional.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* OS Field - only shown when editing */}
            {projeto && (
              <div className="space-y-2">
                <Label htmlFor="os" className="flex items-center gap-2">
                  OS (Ordem de Serviço)
                  {(!isGodMode() || isSystemProject) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isSystemProject ? 'Projetos do sistema não podem ter OS alterada' : 'Somente Admin Master pode alterar a OS'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Label>
                <Input
                  id="os"
                  value={formData.os}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                  disabled={!isGodMode() || isSystemProject}
                  className={cn((!isGodMode() || isSystemProject) && "bg-muted cursor-not-allowed")}
                />
              </div>
            )}

            {/* Cliente Field - First */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Popover open={clienteComboOpen} onOpenChange={setClienteComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteComboOpen}
                    className="w-full justify-between"
                    disabled={isSystemProject}
                  >
                    {selectedEmpresa
                      ? `${selectedEmpresa.codigo} - ${selectedEmpresa.empresa} - ${selectedEmpresa.unidade}`
                      : 'Selecione um cliente...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {availableEmpresas?.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.codigo} ${emp.empresa} ${emp.unidade}`}
                            onSelect={() => {
                              setFormData({ ...formData, empresa_id: emp.id });
                              setClienteComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.empresa_id === emp.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="font-mono text-sm mr-2">{emp.codigo}</span>
                            <span>{emp.empresa}</span>
                            <span className="text-muted-foreground ml-2">- {emp.unidade}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setClienteComboOpen(false);
                            setClienteFormOpen(true);
                          }}
                          className="text-primary"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Novo Cliente
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.empresa_id && <p className="text-sm text-destructive">{errors.empresa_id}</p>}
            </div>

            {/* Nome do Projeto */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Projeto *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do projeto"
                disabled={isSystemProject}
              />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </div>

            {/* Contract Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Contrato *</Label>
                <Select
                  value={formData.tipo_contrato}
                  onValueChange={(value: 'PRECO_FECHADO' | 'MAO_DE_OBRA') => setFormData({ ...formData, tipo_contrato: value })}
                  disabled={isSystemProject}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRECO_FECHADO">Preço Fechado</SelectItem>
                    <SelectItem value="MAO_DE_OBRA">Mão de Obra (Cliente Gerencia)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipo_contrato && <p className="text-sm text-destructive">{errors.tipo_contrato}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_contrato" className="flex items-center gap-2">
                  Valor do Contrato (R$) *
                  {formData.valor_contrato > 0 && formData.valor_contrato < 100000 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                            <Info className="h-3 w-3" />
                            Pequeno projeto
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Projetos abaixo de R$ 100.000 são considerados pequenos.<br/>Considere usar o projeto "ORÇAMENTOS" ou um pacote.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Label>
                <CurrencyInput
                  id="valor_contrato"
                  value={formData.valor_contrato}
                  onValueChange={(value) => setFormData({ ...formData, valor_contrato: value })}
                  placeholder="0,00"
                  disabled={isSystemProject}
                />
                {errors.valor_contrato && <p className="text-sm text-destructive">{errors.valor_contrato}</p>}
              </div>
            </div>

            {/* Horas Previstas */}
            <div className="space-y-2">
              <Label htmlFor="horas_previstas">Horas Previstas</Label>
              <Input
                id="horas_previstas"
                type="number"
                min="0"
                step="1"
                value={formData.horas_previstas ?? ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  horas_previstas: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="Ex: 500"
                disabled={isSystemProject}
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Usado para calcular desvio de horas realizadas vs previstas.
              </p>
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início Planejada *</Label>
                <Popover open={dataInicioOpen} onOpenChange={setDataInicioOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.data_inicio_planejada && "text-muted-foreground"
                      )}
                      disabled={isSystemProject}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_inicio_planejada ? (
                        format(formData.data_inicio_planejada, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.data_inicio_planejada || undefined}
                      onSelect={(date) => {
                        setFormData({ ...formData, data_inicio_planejada: date || null });
                        setDataInicioOpen(false);
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {errors.data_inicio_planejada && <p className="text-sm text-destructive">{errors.data_inicio_planejada}</p>}
              </div>

              <div className="space-y-2">
                <Label>Data Fim Planejada *</Label>
                <Popover open={dataFimOpen} onOpenChange={setDataFimOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.data_fim_planejada && "text-muted-foreground"
                      )}
                      disabled={isSystemProject}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_fim_planejada ? (
                        format(formData.data_fim_planejada, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.data_fim_planejada || undefined}
                      onSelect={(date) => {
                        setFormData({ ...formData, data_fim_planejada: date || null });
                        setDataFimOpen(false);
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {errors.data_fim_planejada && <p className="text-sm text-destructive">{errors.data_fim_planejada}</p>}
              </div>
            </div>

            {/* Risks Section */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <Label className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Análise de Riscos
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Risco de Escopo</Label>
                  <Select
                    value={formData.risco_escopo}
                    onValueChange={(value: 'BAIXO' | 'MEDIO' | 'ALTO') => setFormData({ ...formData, risco_escopo: value })}
                    disabled={isSystemProject}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXO">
                        <span className={cn("px-2 py-0.5 rounded text-xs", getRiskBadgeColor('BAIXO'))}>Baixo</span>
                      </SelectItem>
                      <SelectItem value="MEDIO">
                        <span className={cn("px-2 py-0.5 rounded text-xs", getRiskBadgeColor('MEDIO'))}>Médio</span>
                      </SelectItem>
                      <SelectItem value="ALTO">
                        <span className={cn("px-2 py-0.5 rounded text-xs", getRiskBadgeColor('ALTO'))}>Alto</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Risco Liberação Cliente</Label>
                  <Select
                    value={formData.risco_liberacao_cliente}
                    onValueChange={(value: 'BAIXO' | 'MEDIO' | 'ALTO') => setFormData({ ...formData, risco_liberacao_cliente: value })}
                    disabled={isSystemProject}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXO">
                        <span className={cn("px-2 py-0.5 rounded text-xs", getRiskBadgeColor('BAIXO'))}>Baixo</span>
                      </SelectItem>
                      <SelectItem value="MEDIO">
                        <span className={cn("px-2 py-0.5 rounded text-xs", getRiskBadgeColor('MEDIO'))}>Médio</span>
                      </SelectItem>
                      <SelectItem value="ALTO">
                        <span className={cn("px-2 py-0.5 rounded text-xs", getRiskBadgeColor('ALTO'))}>Alto</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes_riscos">Observações sobre Riscos</Label>
                <Textarea
                  id="observacoes_riscos"
                  value={formData.observacoes_riscos}
                  onChange={(e) => setFormData({ ...formData, observacoes_riscos: e.target.value })}
                  placeholder="Descreva riscos identificados, mitigações..."
                  rows={2}
                  disabled={isSystemProject}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição / Observações</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do projeto, escopo, observações..."
                rows={3}
                disabled={isSystemProject}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading || isSystemProject}>
                {loading ? 'Salvando...' : (canApprove || projeto ? 'Salvar' : 'Solicitar Aprovação')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EmpresaForm
        open={clienteFormOpen}
        onOpenChange={setClienteFormOpen}
        onSuccess={handleClienteCreated}
        isInline={true}
      />
    </>
  );
}
