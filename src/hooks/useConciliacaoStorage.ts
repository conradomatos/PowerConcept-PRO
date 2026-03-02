import { supabase } from '@/integrations/supabase/client';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, ResultadoConciliacao } from '@/calculations/conciliacao/types';

interface SaveImportParams {
  tipo: 'extrato_banco' | 'extrato_omie' | 'fatura_cartao';
  periodoRef: string;
  periodoInicio?: string;
  periodoFim?: string;
  nomeArquivo: string;
  totalLancamentos: number;
  valorTotal: number;
  saldoAnterior?: number;
  dados: any[];
  metadata?: any;
}

export interface LoadedImport {
  id: string;
  tipo: string;
  periodo_ref: string;
  nome_arquivo: string;
  total_lancamentos: number;
  valor_total: number;
  saldo_anterior: number | null;
  dados: any;
  metadata: any;
}

// Reconstruct Date objects from ISO strings in JSONB
function rehydrateDates<T extends { data?: any; dataStr?: string }>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    data: item.data ? new Date(item.data) : new Date(),
  }));
}

export function rehydrateBanco(dados: any[]): LancamentoBanco[] {
  return rehydrateDates(dados) as LancamentoBanco[];
}

export function rehydrateOmie(dados: any[]): LancamentoOmie[] {
  return rehydrateDates(dados) as LancamentoOmie[];
}

export function rehydrateCartao(dados: any[]): TransacaoCartao[] {
  return rehydrateDates(dados) as TransacaoCartao[];
}

export function rehydrateResultado(raw: any): ResultadoConciliacao {
  const r = raw.resultado || raw;
  return {
    ...r,
    matches: (r.matches || []).map((m: any) => ({
      ...m,
      banco: m.banco ? { ...m.banco, data: new Date(m.banco.data) } : m.banco,
      omie: m.omie ? { ...m.omie, data: new Date(m.omie.data) } : m.omie,
    })),
    divergencias: (r.divergencias || []).map((d: any) => ({
      ...d,
      banco: d.banco ? { ...d.banco, data: new Date(d.banco.data) } : d.banco,
      omie: d.omie ? { ...d.omie, data: new Date(d.omie.data) } : d.omie,
    })),
    banco: rehydrateDates(r.banco || []),
    omieSicredi: rehydrateDates(r.omieSicredi || []),
    cartaoTransacoes: rehydrateDates(r.cartaoTransacoes || []),
  } as ResultadoConciliacao;
}

export function useConciliacaoStorage() {

  async function saveImport(params: SaveImportParams) {
    // 1. Mark previous imports of same tipo+periodo as 'substituido'
    await supabase
      .from('conciliacao_imports')
      .update({ status: 'substituido', updated_at: new Date().toISOString() } as any)
      .eq('tipo', params.tipo)
      .eq('periodo_ref', params.periodoRef)
      .eq('status', 'ativo');

    // 2. Insert new import as 'ativo'
    const { data, error } = await supabase
      .from('conciliacao_imports')
      .insert({
        tipo: params.tipo,
        periodo_ref: params.periodoRef,
        periodo_inicio: params.periodoInicio || null,
        periodo_fim: params.periodoFim || null,
        status: 'ativo',
        nome_arquivo: params.nomeArquivo,
        total_lancamentos: params.totalLancamentos,
        valor_total: params.valorTotal,
        saldo_anterior: params.saldoAnterior ?? null,
        dados: params.dados as any,
        metadata: params.metadata || null,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function loadImports(periodoRef: string): Promise<{
    extratoBanco: LoadedImport | null;
    extratoOmie: LoadedImport | null;
    faturaCartao: LoadedImport | null;
  }> {
    const { data, error } = await supabase
      .from('conciliacao_imports')
      .select('*')
      .eq('periodo_ref', periodoRef)
      .eq('status', 'ativo')
      .order('tipo');

    if (error) throw error;

    const items = (data || []) as unknown as LoadedImport[];
    return {
      extratoBanco: items.find(d => d.tipo === 'extrato_banco') || null,
      extratoOmie: items.find(d => d.tipo === 'extrato_omie') || null,
      faturaCartao: items.find(d => d.tipo === 'fatura_cartao') || null,
    };
  }

  async function deleteImport(tipo: string, periodoRef: string) {
    const { error } = await supabase
      .from('conciliacao_imports')
      .update({ status: 'substituido', updated_at: new Date().toISOString() } as any)
      .eq('tipo', tipo)
      .eq('periodo_ref', periodoRef)
      .eq('status', 'ativo');

    if (error) throw error;
  }

  async function saveResultado(periodoRef: string, resultado: ResultadoConciliacao) {
    // Mark previous as 'substituido'
    await supabase
      .from('conciliacao_resultados' as any)
      .update({ status: 'substituido', updated_at: new Date().toISOString() } as any)
      .eq('periodo_ref', periodoRef)
      .eq('status', 'ativo');

    const { data, error } = await supabase
      .from('conciliacao_resultados' as any)
      .insert({
        periodo_ref: periodoRef,
        total_conciliados: resultado.totalConciliados || 0,
        total_divergencias: resultado.totalDivergencias || 0,
        total_em_atraso: resultado.contasAtraso || 0,
        total_cartao_importaveis: resultado.cartaoImportaveis || 0,
        camada_a: resultado.camadaCounts?.['A'] || 0,
        camada_b: resultado.camadaCounts?.['B'] || 0,
        camada_c: resultado.camadaCounts?.['C'] || 0,
        camada_d: resultado.camadaCounts?.['D'] || 0,
        resultado: resultado as any,
        status: 'ativo',
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function loadResultado(periodoRef: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('conciliacao_resultados' as any)
      .select('*')
      .eq('periodo_ref', periodoRef)
      .eq('status', 'ativo')
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function invalidateResultado(periodoRef: string) {
    await supabase
      .from('conciliacao_resultados' as any)
      .update({ status: 'substituido', updated_at: new Date().toISOString() } as any)
      .eq('periodo_ref', periodoRef)
      .eq('status', 'ativo');
  }

  return { saveImport, loadImports, deleteImport, saveResultado, loadResultado, invalidateResultado };
}
