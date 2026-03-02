import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  CustoColaborador,
  Classificacao,
  calcularCustos,
} from '@/calculations/custos-pessoal';
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyToNumber,
} from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';

interface CustoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  custo?: CustoColaborador | null;
  onSuccess: () => void;
  existingCustos?: CustoColaborador[];
}

export function CustoForm({ open, onOpenChange, colaboradorId, custo, onSuccess, existingCustos = [] }: CustoFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salario_base: '',
    periculosidade: false,
    beneficios: '',
    classificacao: '' as Classificacao | '',
    inicio_vigencia: null as Date | null,
    fim_vigencia: null as Date | null,
    motivo_alteracao: '',
    observacao: '',
  });
  const [inicioPopoverOpen, setInicioPopoverOpen] = useState(false);
  const [fimPopoverOpen, setFimPopoverOpen] = useState(false);

  const isPJ = formData.classificacao === 'PJ';

  // Find current active cost (fim_vigencia is null OR in future)
  const custoVigente = useMemo(() => {
    if (custo) return null; // Editing existing, don't need to close another
    const today = new Date().toISOString().split('T')[0];
    return existingCustos.find(c => {
      // Vigente if fim_vigencia is null (open) OR today is between inicio and fim
      if (!c.fim_vigencia) {
        return c.inicio_vigencia <= today;
      }
      return c.inicio_vigencia <= today && c.fim_vigencia >= today;
    }) || null;
  }, [existingCustos, custo]);

  useEffect(() => {
    if (custo) {
      setFormData({
        salario_base: formatCurrencyInput((custo.salario_base * 100).toString()),
        periculosidade: custo.periculosidade || false,
        beneficios: formatCurrencyInput((custo.beneficios * 100).toString()),
        classificacao: custo.classificacao as Classificacao || 'CLT',
        inicio_vigencia: custo.inicio_vigencia ? parse(custo.inicio_vigencia, 'yyyy-MM-dd', new Date()) : null,
        fim_vigencia: custo.fim_vigencia ? parse(custo.fim_vigencia, 'yyyy-MM-dd', new Date()) : null,
        motivo_alteracao: custo.motivo_alteracao || '',
        observacao: custo.observacao || '',
      });
    } else {
      setFormData({
        salario_base: '',
        periculosidade: false,
        beneficios: '',
        classificacao: '',
        inicio_vigencia: null,
        fim_vigencia: null,
        motivo_alteracao: '',
        observacao: '',
      });
    }
  }, [custo, open]);

  // When classification changes to PJ, reset periculosidade and beneficios
  useEffect(() => {
    if (formData.classificacao === 'PJ') {
      setFormData(prev => ({
        ...prev,
        periculosidade: false,
        beneficios: '0,00'
      }));
    }
  }, [formData.classificacao]);

  const custosCalculados = useMemo(() => {
    return calcularCustos({
      salario_base: parseCurrencyToNumber(formData.salario_base),
      periculosidade: formData.periculosidade,
      beneficios: parseCurrencyToNumber(formData.beneficios),
      classificacao: formData.classificacao as Classificacao || 'CLT',
    });
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    const salarioBase = parseCurrencyToNumber(formData.salario_base);
    if (!salarioBase || salarioBase < 0) {
      toast({ title: 'Erro', description: 'Salário base é obrigatório e deve ser positivo', variant: 'destructive' });
      return;
    }
    
    if (!formData.classificacao) {
      toast({ title: 'Erro', description: 'Classificação é obrigatória (CLT ou PJ)', variant: 'destructive' });
      return;
    }
    
    if (!formData.inicio_vigencia || !isValid(formData.inicio_vigencia)) {
      toast({ title: 'Erro', description: 'Data de início da vigência é obrigatória e deve ser válida', variant: 'destructive' });
      return;
    }

    // Validate fim_vigencia if provided
    if (formData.fim_vigencia) {
      if (!isValid(formData.fim_vigencia)) {
        toast({ title: 'Erro', description: 'Data de fim da vigência inválida', variant: 'destructive' });
        return;
      }
      if (formData.fim_vigencia < formData.inicio_vigencia) {
        toast({ title: 'Erro', description: 'Data de fim deve ser maior ou igual à data de início', variant: 'destructive' });
        return;
      }
    }

    if (!formData.motivo_alteracao.trim()) {
      toast({ title: 'Erro', description: 'Motivo da alteração é obrigatório', variant: 'destructive' });
      return;
    }

    if (!formData.observacao.trim()) {
      toast({ title: 'Erro', description: 'Observação é obrigatória', variant: 'destructive' });
      return;
    }

    // CLT requires beneficios
    if (!isPJ) {
      const beneficiosValue = parseCurrencyToNumber(formData.beneficios);
      if (beneficiosValue < 0) {
        toast({ title: 'Erro', description: 'Benefícios deve ser um valor válido', variant: 'destructive' });
        return;
      }
    }

    const inicioVigenciaStr = format(formData.inicio_vigencia, 'yyyy-MM-dd');
    const fimVigenciaStr = formData.fim_vigencia ? format(formData.fim_vigencia, 'yyyy-MM-dd') : null;

    // Validate against existing vigente when creating new
    if (!custo && custoVigente) {
      if (inicioVigenciaStr <= custoVigente.inicio_vigencia) {
        toast({ 
          title: 'Erro', 
          description: `Data de início deve ser posterior a ${format(parse(custoVigente.inicio_vigencia, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')} (início do custo vigente)`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    setLoading(true);

    const beneficiosValue = isPJ ? 0 : parseCurrencyToNumber(formData.beneficios);

    const payload = {
      colaborador_id: colaboradorId,
      salario_base: salarioBase,
      periculosidade: isPJ ? false : formData.periculosidade,
      beneficios: beneficiosValue,
      classificacao: formData.classificacao,
      inicio_vigencia: inicioVigenciaStr,
      fim_vigencia: fimVigenciaStr,
      motivo_alteracao: formData.motivo_alteracao,
      observacao: formData.observacao,
      updated_by: user?.id,
    };

    try {
      // If creating new and there's a vigente (with open fim_vigencia), close it first
      if (!custo && custoVigente) {
        const newEndDate = new Date(formData.inicio_vigencia);
        newEndDate.setDate(newEndDate.getDate() - 1);
        const fimVigenciaAtual = format(newEndDate, 'yyyy-MM-dd');

        const { error: updateError } = await supabase
          .from('custos_colaborador')
          .update({ 
            fim_vigencia: fimVigenciaAtual,
            updated_by: user?.id 
          })
          .eq('id', custoVigente.id);

        if (updateError) throw updateError;
      }

      if (custo) {
        const { error } = await supabase
          .from('custos_colaborador')
          .update(payload)
          .eq('id', custo.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Custo atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('custos_colaborador')
          .insert({ ...payload, created_by: user?.id });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Custo cadastrado com sucesso' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const message = error.message?.includes('sobreposta') 
        ? 'Já existe um registro de custo com vigência sobreposta para este colaborador'
        : error.message || 'Erro ao salvar custo';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{custo ? 'Editar Custo' : 'Novo Custo (Nova Vigência)'}</DialogTitle>
        </DialogHeader>

        {!custo && custoVigente && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-sm">
            <strong>Atenção:</strong> Existe um custo vigente. Ao salvar, o custo atual será encerrado 
            automaticamente no dia anterior ao início desta nova vigência.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Classificação - First and required */}
          <div>
            <Label htmlFor="classificacao">Classificação *</Label>
            <Select
              value={formData.classificacao}
              onValueChange={(value: Classificacao) => setFormData(prev => ({ ...prev, classificacao: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione CLT ou PJ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLT">CLT</SelectItem>
                <SelectItem value="PJ">PJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="salario_base">Salário Base *</Label>
            <Input
              id="salario_base"
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={formData.salario_base}
              onChange={(e) => handleCurrencyChange('salario_base', e.target.value)}
              required
            />
          </div>

          {/* Only show for CLT */}
          {!isPJ && (
            <>
              <div>
                <Label htmlFor="beneficios">Benefícios *</Label>
                <Input
                  id="beneficios"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={formData.beneficios}
                  onChange={(e) => handleCurrencyChange('beneficios', e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="periculosidade"
                  checked={formData.periculosidade}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, periculosidade: checked }))}
                />
                <Label htmlFor="periculosidade">
                  Periculosidade (30%)
                </Label>
              </div>
            </>
          )}

          {/* Calculated Fields */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Cálculos Automáticos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Benefícios:</span>
                <p className="font-medium">{formatCurrency(custosCalculados.beneficios)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Adic. Periculosidade:</span>
                <p className="font-medium">{formatCurrency(custosCalculados.adicional_periculosidade)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo Mensal:</span>
                <p className="font-medium text-primary">{formatCurrency(custosCalculados.custo_mensal_total)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo/Hora:</span>
                <p className="font-medium text-primary">{formatCurrency(custosCalculados.custo_hora)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Início Vigência *</Label>
              <Popover open={inicioPopoverOpen} onOpenChange={setInicioPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !formData.inicio_vigencia && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.inicio_vigencia && isValid(formData.inicio_vigencia) 
                      ? format(formData.inicio_vigencia, "dd/MM/yyyy") 
                      : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.inicio_vigencia || undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, inicio_vigencia: date || null }));
                      setInicioPopoverOpen(false);
                    }}
                    initialFocus
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fim Vigência (opcional)</Label>
              <Popover open={fimPopoverOpen} onOpenChange={setFimPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !formData.fim_vigencia && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.fim_vigencia && isValid(formData.fim_vigencia) 
                      ? format(formData.fim_vigencia, "dd/MM/yyyy") 
                      : <span>Em aberto</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-2 border-b">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, fim_vigencia: null }));
                        setFimPopoverOpen(false);
                      }}
                    >
                      Deixar em aberto
                    </Button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={formData.fim_vigencia || undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, fim_vigencia: date || null }));
                      setFimPopoverOpen(false);
                    }}
                    disabled={(date) => formData.inicio_vigencia ? date < formData.inicio_vigencia : false}
                    initialFocus
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="motivo_alteracao">Motivo da Alteração *</Label>
            <Input
              id="motivo_alteracao"
              value={formData.motivo_alteracao}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo_alteracao: e.target.value }))}
              placeholder="Ex: Reajuste anual, Promoção, Novo contrato"
              required
            />
          </div>

          <div>
            <Label htmlFor="observacao">Observação *</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder="Observações adicionais sobre este registro de custo..."
              rows={2}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : custo ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
