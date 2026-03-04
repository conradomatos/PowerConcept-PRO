import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery } from '@tanstack/react-query';
import { formatCPF, cleanCPF, validateCPF } from '@/lib/cpf';
import { Database } from '@/integrations/supabase/types';
import {
  Classificacao,
  calcularCustos,
} from '@/calculations/custos-pessoal';
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyToNumber,
} from '@/lib/currency';

type Collaborator = Database['public']['Tables']['collaborators']['Row'];
type EmployeeStatus = Database['public']['Enums']['employee_status'];

interface CollaboratorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator?: Collaborator | null;
  onSuccess: () => void;
}

export default function CollaboratorForm({
  open,
  onOpenChange,
  collaborator,
  onSuccess,
}: CollaboratorFormProps) {
  const { user } = useAuth();
  const { isGodMode } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  
  // State for linked user (edit mode only)
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  
  // Step 1: Collaborator data
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    birth_date: '',
    hire_date: '',
    termination_date: '',
    position: '',
    department: '',
    equipe: '',
    status: 'ativo' as EmployeeStatus,
    email: '',
    phone: '',
  });

  // Step 2: Cost data
  const [custoData, setCustoData] = useState({
    classificacao: 'CLT' as Classificacao,
    salario_base: '',
    beneficios: '',
    periculosidade: false,
    inicio_vigencia: null as Date | null,
    fim_vigencia: null as Date | null,
    motivo_alteracao: '',
    observacao: '',
  });

  // Date picker states
  const [inicioVigenciaOpen, setInicioVigenciaOpen] = useState(false);
  const [fimVigenciaOpen, setFimVigenciaOpen] = useState(false);

  // Validation errors
  const [custoErrors, setCustoErrors] = useState<Record<string, string>>({});
  
  // Query available users for linking (edit mode only)
  const { data: availableUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['available-users-for-collaborator', collaborator?.id],
    queryFn: async () => {
      // Fetch all profiles (users)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');
      
      if (profilesError) throw profilesError;
      
      // Fetch collaborators already linked (except current one)
      const { data: linkedCollaborators, error: linkedError } = await supabase
        .from('collaborators')
        .select('user_id')
        .not('user_id', 'is', null);
      
      if (linkedError) throw linkedError;
      
      // Get IDs that are already linked to OTHER collaborators
      const linkedIds = linkedCollaborators
        ?.filter(c => c.user_id !== (collaborator as any)?.user_id)
        .map(c => c.user_id) || [];
      
      // Return only users not linked to other collaborators
      return profiles?.filter(p => !linkedIds.includes(p.user_id)) || [];
    },
    enabled: !!collaborator, // Only fetch in edit mode
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (collaborator) {
        // Edit mode: only step 1
        setStep(1);
        setFormData({
          full_name: collaborator.full_name,
          cpf: formatCPF(collaborator.cpf),
          birth_date: collaborator.birth_date || '',
          hire_date: collaborator.hire_date,
          termination_date: collaborator.termination_date || '',
          position: collaborator.position || '',
          department: collaborator.department || '',
          equipe: (collaborator as any).equipe || '',
          status: collaborator.status,
          email: collaborator.email || '',
          phone: collaborator.phone || '',
        });
        // Set linked user from collaborator
        setLinkedUserId((collaborator as any).user_id || null);
      } else {
        // New collaborator: start at step 1
        setStep(1);
        setFormData({
          full_name: '',
          cpf: '',
          birth_date: '',
          hire_date: '',
          termination_date: '',
          position: '',
          department: '',
          equipe: '',
          status: 'ativo',
          email: '',
          phone: '',
        });
        setCustoData({
          classificacao: 'CLT',
          salario_base: '',
          beneficios: '',
          periculosidade: false,
          inicio_vigencia: null,
          fim_vigencia: null,
          motivo_alteracao: '',
          observacao: '',
        });
        setCustoErrors({});
        setLinkedUserId(null);
      }
    }
  }, [collaborator, open]);

  // When hire_date changes, set inicio_vigencia default
  useEffect(() => {
    if (!collaborator && formData.hire_date && !custoData.inicio_vigencia) {
      const hireDate = new Date(formData.hire_date + 'T00:00:00');
      if (isValid(hireDate)) {
        setCustoData(prev => ({ ...prev, inicio_vigencia: hireDate }));
      }
    }
  }, [formData.hire_date, collaborator, custoData.inicio_vigencia]);

  const handleCPFChange = (value: string) => {
    const cleaned = cleanCPF(value);
    if (cleaned.length <= 11) {
      setFormData((prev) => ({ ...prev, cpf: formatCPF(cleaned) }));
    }
  };

  // Validate step 1
  const validateStep1 = (): boolean => {
    const cleanedCPF = cleanCPF(formData.cpf);
    // Nome e CPF sempre obrigatórios (mesmo God Mode)
    if (!formData.full_name.trim()) {
      toast.error('Nome completo é obrigatório');
      return false;
    }
    if (!validateCPF(cleanedCPF)) {
      toast.error('CPF inválido');
      return false;
    }
    // Data de admissão: God Mode pode pular
    if (!isGodMode && !formData.hire_date) {
      toast.error('Data de admissão é obrigatória');
      return false;
    }
    // Telefone obrigatório
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      toast.error('Telefone é obrigatório (mínimo 10 dígitos)');
      return false;
    }
    return true;
  };

  // Validate step 2 (custo)
  const validateCusto = (): boolean => {
    // God Mode: pular todas as validações de custo
    if (isGodMode) {
      setCustoErrors({});
      return true;
    }

    const errors: Record<string, string> = {};
    const isPJ = custoData.classificacao === 'PJ';

    if (!custoData.salario_base || parseCurrencyToNumber(custoData.salario_base) <= 0) {
      errors.salario_base = 'Salário base é obrigatório';
    }

    if (!isPJ) {
      if (!custoData.beneficios && custoData.beneficios !== '0') {
        errors.beneficios = 'Benefícios é obrigatório';
      }
    }

    if (!custoData.inicio_vigencia) {
      errors.inicio_vigencia = 'Data de início é obrigatória';
    }

    if (custoData.fim_vigencia && custoData.inicio_vigencia) {
      if (custoData.fim_vigencia < custoData.inicio_vigencia) {
        errors.fim_vigencia = 'Fim deve ser maior ou igual ao início';
      }
    }

    if (!custoData.motivo_alteracao.trim()) {
      errors.motivo_alteracao = 'Motivo é obrigatório';
    }

    if (!custoData.observacao.trim()) {
      errors.observacao = 'Observação é obrigatória';
    }

    setCustoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Calculate costs for preview
  const calculatedCosts = useMemo(() => {
    return calcularCustos({
      salario_base: parseCurrencyToNumber(custoData.salario_base),
      beneficios: parseCurrencyToNumber(custoData.beneficios),
      periculosidade: custoData.periculosidade,
      classificacao: custoData.classificacao,
    });
  }, [custoData.salario_base, custoData.beneficios, custoData.periculosidade, custoData.classificacao]);

  // Handle next step
  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Handle save (collaborator + custo in transaction)
  const handleSubmit = async () => {
    if (!validateCusto()) {
      toast.error('Preencha todos os campos obrigatórios do custo');
      return;
    }

    setLoading(true);

    const cleanedCPF = cleanCPF(formData.cpf);
    const isPJ = custoData.classificacao === 'PJ';

    const collabData = {
      full_name: formData.full_name,
      cpf: cleanedCPF,
      birth_date: formData.birth_date || null,
      hire_date: formData.hire_date,
      termination_date: formData.termination_date || null,
      position: formData.position || null,
      department: formData.department || null,
      equipe: formData.equipe || null,
      status: formData.status,
      email: formData.email || null,
      phone: formData.phone || null,
    };

    try {
      // Create collaborator
      const { data: newCollab, error: collabError } = await supabase
        .from('collaborators')
        .insert({ ...collabData, created_by: user?.id, updated_by: user?.id })
        .select()
        .single();

      if (collabError) {
        if (collabError.code === '23505') {
          toast.error('CPF já cadastrado');
        } else {
          toast.error('Erro ao criar colaborador');
        }
        setLoading(false);
        return;
      }

      // Create cost
      const custoPayload = {
        colaborador_id: newCollab.id,
        classificacao: custoData.classificacao,
        salario_base: parseCurrencyToNumber(custoData.salario_base),
        beneficios: isPJ ? 0 : parseCurrencyToNumber(custoData.beneficios),
        periculosidade: isPJ ? false : custoData.periculosidade,
        inicio_vigencia: format(custoData.inicio_vigencia!, 'yyyy-MM-dd'),
        fim_vigencia: custoData.fim_vigencia ? format(custoData.fim_vigencia, 'yyyy-MM-dd') : null,
        motivo_alteracao: custoData.motivo_alteracao,
        observacao: custoData.observacao,
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { error: custoError } = await supabase
        .from('custos_colaborador')
        .insert(custoPayload);

      if (custoError) {
        // Rollback: delete the collaborator we just created
        await supabase.from('collaborators').delete().eq('id', newCollab.id);
        toast.error('Erro ao criar custo. Operação cancelada.');
        setLoading(false);
        return;
      }

      // Record history
      await supabase.from('collaborator_history').insert({
        collaborator_id: newCollab.id,
        changed_by: user?.id!,
        changes: { action: 'create', data: collabData, custo: custoPayload },
      });

      toast.success('Colaborador e custo cadastrados com sucesso!');
      setLoading(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Erro inesperado ao salvar');
      setLoading(false);
    }
  };

  // Handle update (edit mode - only collaborator data)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);

    const cleanedCPF = cleanCPF(formData.cpf);
    const data = {
      full_name: formData.full_name,
      cpf: cleanedCPF,
      birth_date: formData.birth_date || null,
      hire_date: formData.hire_date,
      termination_date: formData.termination_date || null,
      position: formData.position || null,
      department: formData.department || null,
      equipe: formData.equipe || null,
      status: formData.status,
      email: formData.email || null,
      phone: formData.phone || null,
      user_id: linkedUserId || null,
    };

    const { error } = await supabase
      .from('collaborators')
      .update({ ...data, updated_by: user?.id })
      .eq('id', collaborator!.id);

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('user_id')) {
          toast.error('Este usuário já está vinculado a outro colaborador');
        } else {
          toast.error('CPF já cadastrado para outro colaborador');
        }
      } else {
        toast.error('Erro ao atualizar colaborador');
      }
      setLoading(false);
      return;
    }

    await supabase.from('collaborator_history').insert({
      collaborator_id: collaborator!.id,
      changed_by: user?.id!,
      changes: { action: 'update', data },
    });

    toast.success('Colaborador atualizado!');
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  const isPJ = custoData.classificacao === 'PJ';

  // Render step 1: Collaborator data
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome completo *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF *</Label>
          <Input
            id="cpf"
            value={formData.cpf}
            onChange={(e) => handleCPFChange(e.target.value)}
            placeholder="000.000.000-00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Data de nascimento</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, birth_date: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hire_date">Data de admissão *</Label>
          <Input
            id="hire_date"
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, hire_date: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="termination_date">Data de desligamento</Label>
          <Input
            id="termination_date"
            type="date"
            value={formData.termination_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, termination_date: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value: EmployeeStatus) => setFormData((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="afastado">Afastado</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Cargo</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="equipe">Equipe</Label>
          <Input
            id="equipe"
            value={formData.equipe}
            onChange={(e) => setFormData((prev) => ({ ...prev, equipe: e.target.value }))}
            placeholder="Ex: Equipe A, Frente Sul..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </div>

        {/* User link field (edit mode only) */}
        {collaborator && (
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Usuário do Sistema
            </Label>
            <Select
              value={linkedUserId || '__none'}
              onValueChange={(value) => setLinkedUserId(value === '__none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum usuário vinculado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Nenhum usuário vinculado</SelectItem>
                {loadingUsers && (
                  <SelectItem value="__loading" disabled>Carregando...</SelectItem>
                )}
                {availableUsers?.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.full_name || u.email} 
                    {u.full_name && u.email && (
                      <span className="text-muted-foreground ml-1">({u.email})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Vincular permite pré-seleção automática na tela de Apontamento Diário
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Render step 2: Cost data
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="bg-muted/50 p-3 rounded-lg mb-4">
        <p className="text-sm text-muted-foreground">
          Cadastro de custo para: <strong>{formData.full_name}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Classificação */}
        <div className="space-y-2">
          <Label>Classificação *</Label>
          <Select
            value={custoData.classificacao}
            onValueChange={(value: Classificacao) => setCustoData((prev) => ({ 
              ...prev, 
              classificacao: value,
              // Reset PJ-specific fields
              ...(value === 'PJ' ? { periculosidade: false, beneficios: '' } : {})
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLT">CLT</SelectItem>
              <SelectItem value="PJ">PJ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Salário Base */}
        <div className="space-y-2">
          <Label>Salário Base *</Label>
          <Input
            value={custoData.salario_base}
            onChange={(e) => setCustoData((prev) => ({ 
              ...prev, 
              salario_base: formatCurrencyInput(e.target.value) 
            }))}
            placeholder="0,00"
            className={custoErrors.salario_base ? 'border-destructive' : ''}
          />
          {custoErrors.salario_base && (
            <p className="text-xs text-destructive">{custoErrors.salario_base}</p>
          )}
        </div>

        {/* CLT-only fields */}
        {!isPJ && (
          <>
            <div className="space-y-2">
              <Label>Benefícios *</Label>
              <Input
                value={custoData.beneficios}
                onChange={(e) => setCustoData((prev) => ({ 
                  ...prev, 
                  beneficios: formatCurrencyInput(e.target.value) 
                }))}
                placeholder="0,00"
                className={custoErrors.beneficios ? 'border-destructive' : ''}
              />
              {custoErrors.beneficios && (
                <p className="text-xs text-destructive">{custoErrors.beneficios}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Periculosidade (30%)</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={custoData.periculosidade}
                  onCheckedChange={(checked) => setCustoData((prev) => ({ ...prev, periculosidade: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {custoData.periculosidade ? 'Sim' : 'Não'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Início Vigência */}
        <div className="space-y-2">
          <Label>Início Vigência *</Label>
          <Popover open={inicioVigenciaOpen} onOpenChange={setInicioVigenciaOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !custoData.inicio_vigencia && 'text-muted-foreground',
                  custoErrors.inicio_vigencia && 'border-destructive'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {custoData.inicio_vigencia
                  ? format(custoData.inicio_vigencia, 'dd/MM/yyyy', { locale: ptBR })
                  : 'Selecione a data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={custoData.inicio_vigencia || undefined}
                onSelect={(date) => {
                  setCustoData((prev) => ({ ...prev, inicio_vigencia: date || null }));
                  setInicioVigenciaOpen(false);
                }}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {custoErrors.inicio_vigencia && (
            <p className="text-xs text-destructive">{custoErrors.inicio_vigencia}</p>
          )}
        </div>

        {/* Fim Vigência (opcional) */}
        <div className="space-y-2">
          <Label>Fim Vigência (opcional)</Label>
          <div className="flex gap-2">
            <Popover open={fimVigenciaOpen} onOpenChange={setFimVigenciaOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !custoData.fim_vigencia && 'text-muted-foreground',
                    custoErrors.fim_vigencia && 'border-destructive'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {custoData.fim_vigencia
                    ? format(custoData.fim_vigencia, 'dd/MM/yyyy', { locale: ptBR })
                    : 'Em aberto'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={custoData.fim_vigencia || undefined}
                  onSelect={(date) => {
                    setCustoData((prev) => ({ ...prev, fim_vigencia: date || null }));
                    setFimVigenciaOpen(false);
                  }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {custoData.fim_vigencia && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCustoData((prev) => ({ ...prev, fim_vigencia: null }))}
              >
                ✕
              </Button>
            )}
          </div>
          {custoErrors.fim_vigencia && (
            <p className="text-xs text-destructive">{custoErrors.fim_vigencia}</p>
          )}
        </div>

        {/* Motivo */}
        <div className="space-y-2 md:col-span-2">
          <Label>Motivo da Alteração *</Label>
          <Input
            value={custoData.motivo_alteracao}
            onChange={(e) => setCustoData((prev) => ({ ...prev, motivo_alteracao: e.target.value }))}
            placeholder="Ex: Cadastro inicial, Reajuste salarial..."
            className={custoErrors.motivo_alteracao ? 'border-destructive' : ''}
          />
          {custoErrors.motivo_alteracao && (
            <p className="text-xs text-destructive">{custoErrors.motivo_alteracao}</p>
          )}
        </div>

        {/* Observação */}
        <div className="space-y-2 md:col-span-2">
          <Label>Observação *</Label>
          <Textarea
            value={custoData.observacao}
            onChange={(e) => setCustoData((prev) => ({ ...prev, observacao: e.target.value }))}
            placeholder="Observações adicionais..."
            className={custoErrors.observacao ? 'border-destructive' : ''}
          />
          {custoErrors.observacao && (
            <p className="text-xs text-destructive">{custoErrors.observacao}</p>
          )}
        </div>
      </div>

      {/* Calculated costs preview */}
      <div className="bg-muted/50 rounded-lg p-4 mt-4">
        <h4 className="font-medium mb-3">Cálculos Automáticos</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Benefícios</p>
            <p className="font-medium">{formatCurrency(calculatedCosts.beneficios)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Periculosidade</p>
            <p className="font-medium">{formatCurrency(calculatedCosts.adicional_periculosidade)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Custo Mensal</p>
            <p className="font-medium text-primary">{formatCurrency(calculatedCosts.custo_mensal_total)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Custo/Hora</p>
            <p className="font-medium text-primary">{formatCurrency(calculatedCosts.custo_hora)}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Check if custo form is valid for enabling save button
  const isCustoValid = useMemo(() => {
    const isPJ = custoData.classificacao === 'PJ';
    const salarioOk = parseCurrencyToNumber(custoData.salario_base) > 0;
    const beneficiosOk = isPJ || custoData.beneficios !== '';
    const inicioOk = !!custoData.inicio_vigencia;
    const motivoOk = custoData.motivo_alteracao.trim() !== '';
    const obsOk = custoData.observacao.trim() !== '';
    const fimOk = !custoData.fim_vigencia || (custoData.inicio_vigencia && custoData.fim_vigencia >= custoData.inicio_vigencia);
    
    return salarioOk && beneficiosOk && inicioOk && motivoOk && obsOk && fimOk;
  }, [custoData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {collaborator 
              ? 'Editar Colaborador' 
              : step === 1 
                ? 'Novo Colaborador - Dados Pessoais' 
                : 'Novo Colaborador - Custos'}
          </DialogTitle>
          {!collaborator && (
            <div className="flex items-center gap-2 pt-2">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                1
              </div>
              <div className="h-px flex-1 bg-border" />
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                2
              </div>
            </div>
          )}
        </DialogHeader>

        {collaborator ? (
          // Edit mode: single step form
          <form onSubmit={handleUpdate} className="space-y-4">
            {renderStep1()}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Atualizar'}
              </Button>
            </div>
          </form>
        ) : (
          // New collaborator: wizard
          <div className="space-y-4">
            {step === 1 ? renderStep1() : renderStep2()}
            
            <div className="flex justify-between pt-4">
              {step === 1 ? (
                <>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleNextStep}>
                    Próximo: Custos
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSubmit} 
                    disabled={loading || !isCustoValid}
                  >
                    {loading ? 'Salvando...' : 'Salvar Colaborador'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
