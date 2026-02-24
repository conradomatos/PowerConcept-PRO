import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Veiculo } from '@/pages/frotas/Veiculos';

interface VeiculoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo?: Veiculo | null;
  onSuccess: () => void;
}

interface FormData {
  placa: string;
  apelido: string;
  modelo: string;
  ano: string;
  tipo_combustivel: string;
  valor_compra: number;
  data_compra: string;
  vida_util_meses: string;
  km_atual: string;
  media_km_litro_ref: string;
  projeto_atual_id: string;
  status: string;
}

export default function VeiculoForm({ open, onOpenChange, veiculo, onSuccess }: VeiculoFormProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      placa: '',
      apelido: '',
      modelo: '',
      ano: '',
      tipo_combustivel: '',
      valor_compra: 0,
      data_compra: '',
      vida_util_meses: '60',
      km_atual: '0',
      media_km_litro_ref: '',
      projeto_atual_id: '',
      status: 'ativo',
    },
  });

  const valorCompra = watch('valor_compra');
  const tipoCombustivel = watch('tipo_combustivel');
  const projetoAtualId = watch('projeto_atual_id');
  const status = watch('status');

  const { data: projetos } = useQuery({
    queryKey: ['projetos-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome, os')
        .eq('status', 'ativo')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      if (veiculo) {
        reset({
          placa: veiculo.placa,
          apelido: veiculo.apelido || '',
          modelo: veiculo.modelo || '',
          ano: veiculo.ano?.toString() || '',
          tipo_combustivel: veiculo.tipo_combustivel || '',
          valor_compra: veiculo.valor_compra || 0,
          data_compra: veiculo.data_compra || '',
          vida_util_meses: veiculo.vida_util_meses?.toString() || '60',
          km_atual: veiculo.km_atual?.toString() || '0',
          media_km_litro_ref: veiculo.media_km_litro_ref?.toString() || '',
          projeto_atual_id: veiculo.projeto_atual_id || '',
          status: veiculo.status || 'ativo',
        });
      } else {
        reset({
          placa: '',
          apelido: '',
          modelo: '',
          ano: '',
          tipo_combustivel: '',
          valor_compra: 0,
          data_compra: '',
          vida_util_meses: '60',
          km_atual: '0',
          media_km_litro_ref: '',
          projeto_atual_id: '',
          status: 'ativo',
        });
      }
    }
  }, [veiculo, open, reset]);

  const formatPlaca = (value: string): string => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3) return clean;
    return clean.slice(0, 3) + '-' + clean.slice(3, 7);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      placa: data.placa.toUpperCase().trim(),
      apelido: data.apelido.trim() || null,
      modelo: data.modelo.trim(),
      ano: data.ano ? parseInt(data.ano) : null,
      tipo_combustivel: data.tipo_combustivel || null,
      valor_compra: data.valor_compra || null,
      data_compra: data.data_compra || null,
      vida_util_meses: data.vida_util_meses ? parseInt(data.vida_util_meses) : 60,
      km_atual: data.km_atual ? parseInt(data.km_atual) : 0,
      media_km_litro_ref: data.media_km_litro_ref ? parseFloat(data.media_km_litro_ref) : null,
      projeto_atual_id: data.projeto_atual_id || null,
      status: data.status,
    };

    try {
      if (veiculo) {
        const { error } = await supabase
          .from('veiculos')
          .update(payload)
          .eq('id', veiculo.id);
        if (error) throw error;
        toast.success('Veículo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('veiculos')
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success('Veículo cadastrado com sucesso!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes('veiculos_placa_key')) {
        toast.error('Já existe um veículo com esta placa.');
      } else {
        toast.error('Erro ao salvar veículo: ' + error.message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{veiculo ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Placa e Apelido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="placa">Placa *</Label>
              <Input
                id="placa"
                placeholder="ABC-1D23"
                {...register('placa', {
                  required: 'Placa é obrigatória',
                  validate: (value) => {
                    const clean = value.replace(/[^A-Za-z0-9]/g, '');
                    return clean.length === 7 || 'Placa deve ter 7 caracteres (ex: ABC1D23)';
                  },
                  onChange: (e) => {
                    e.target.value = formatPlaca(e.target.value);
                  },
                })}
                maxLength={8}
              />
              {errors.placa && <p className="text-sm text-destructive">{errors.placa.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apelido">Apelido</Label>
              <Input
                id="apelido"
                placeholder="Ex: Strada Prata"
                {...register('apelido')}
                maxLength={50}
              />
            </div>
          </div>

          {/* Modelo e Ano */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                placeholder="Ex: Fiat Strada Freedom 1.3"
                {...register('modelo', { required: 'Modelo é obrigatório' })}
                maxLength={100}
              />
              {errors.modelo && <p className="text-sm text-destructive">{errors.modelo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                type="number"
                placeholder="Ex: 2024"
                {...register('ano')}
                min={1990}
                max={2030}
              />
            </div>
          </div>

          {/* Combustível e KM/L */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo Combustível</Label>
              <Select
                value={tipoCombustivel}
                onValueChange={(v) => setValue('tipo_combustivel', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gasolina">Gasolina</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Flex">Flex</SelectItem>
                  <SelectItem value="Etanol">Etanol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="media_km_litro_ref">Média KM/Litro (ref.)</Label>
              <Input
                id="media_km_litro_ref"
                type="number"
                step="0.01"
                placeholder="Ex: 12.5"
                {...register('media_km_litro_ref')}
              />
            </div>
          </div>

          {/* Valor Compra e Data Compra */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor de Compra (R$)</Label>
              <CurrencyInput
                value={valorCompra}
                onValueChange={(v) => setValue('valor_compra', v)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_compra">Data de Compra</Label>
              <Input
                id="data_compra"
                type="date"
                {...register('data_compra')}
              />
            </div>
          </div>

          {/* Vida útil e KM Atual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vida_util_meses">Vida Útil (meses)</Label>
              <Input
                id="vida_util_meses"
                type="number"
                {...register('vida_util_meses')}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_atual">KM Atual</Label>
              <Input
                id="km_atual"
                type="number"
                {...register('km_atual')}
                min={0}
              />
            </div>
          </div>

          {/* Projeto e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto Atual</Label>
              <Select
                value={projetoAtualId}
                onValueChange={(v) => setValue('projeto_atual_id', v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {projetos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.os} - {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
