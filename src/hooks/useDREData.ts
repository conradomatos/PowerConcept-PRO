import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calcularImpostosDRE } from '@/calculations/impostos';
import { getAliquotas } from '@/services/storage/aliquotas';

export interface DREDadosMes {
  conta_dre: string;
  mes: number;
  ano: number;
  total: number;
}

export interface DREUnmappedInfo {
  categoria: string;
  tipo: 'AR' | 'AP';
  count: number;
  total: number;
}

export interface DREDataResult {
  dados: DREDadosMes[];
  unmapped: DREUnmappedInfo[];
  totalAR: number;
  totalAP: number;
}

function parseRateio(raw: any): any[] | null {
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? parsed : null;
}

function fallbackAP(cat?: string): string {
  if (!cat) return '(-) - Despesas Administrativas';
  if (cat.startsWith('1.')) return '(-) - Custo dos Serviços Prestados';
  if (cat.startsWith('2.01') || cat.startsWith('2.02')) return '(-) - Despesas com Pessoal';
  if (cat.startsWith('2.05')) return '(-) - Despesas de Vendas e Marketing';
  if (cat.startsWith('2.03') || cat.startsWith('2.04') || cat.startsWith('2.06')) return '(-) - Despesas Administrativas';
  if (cat.startsWith('3.')) return '(-) - Despesas Financeiras';
  return '(-) - Despesas Administrativas';
}

export function useDREData(ano: number) {
  return useQuery({
    queryKey: ['dre-data', ano],
    queryFn: async (): Promise<DREDataResult> => {
      const aliquotas = getAliquotas();

      // 1. Buscar mapeamento de categorias Omie → conta_dre
      const { data: mapeamentos } = await supabase
        .from('omie_categoria_mapeamento')
        .select('codigo_omie, conta_dre_override, categoria_contabil_id, categorias_contabeis(conta_dre)')
        .eq('ativo', true);

      const mapaCat = new Map<string, string>();
      mapeamentos?.forEach((m: any) => {
        const contaDre = m.conta_dre_override || m.categorias_contabeis?.conta_dre;
        if (contaDre) mapaCat.set(m.codigo_omie, contaDre);
      });

      // 2. Buscar AR e AP do ano (sem campos de retenção)
      const [{ data: receber }, { data: pagar }] = await Promise.all([
        supabase
          .from('omie_contas_receber')
          .select('data_emissao, valor, categoria, categorias_rateio, status')
          .gte('data_emissao', `${ano}-01-01`)
          .lte('data_emissao', `${ano}-12-31`)
          .neq('status', 'CANCELADO'),
        supabase
          .from('omie_contas_pagar')
          .select('data_emissao, valor, categoria, categorias_rateio, status')
          .gte('data_emissao', `${ano}-01-01`)
          .lte('data_emissao', `${ano}-12-31`)
          .neq('status', 'CANCELADO'),
      ]);

      const acumulador = new Map<string, number>();
      const unmappedTracker = new Map<string, DREUnmappedInfo>();
      const receitaPorMes = new Map<number, number>();
      let totalAR = 0;
      let totalAP = 0;

      const acumular = (contaDre: string, mes: number, valor: number) => {
        const key = `${contaDre}|${mes}`;
        acumulador.set(key, (acumulador.get(key) || 0) + valor);
      };

      const trackUnmapped = (cat: string, tipo: 'AR' | 'AP', valor: number) => {
        const ukey = `${cat}|${tipo}`;
        const existing = unmappedTracker.get(ukey);
        if (existing) { existing.count++; existing.total += valor; }
        else { unmappedTracker.set(ukey, { categoria: cat, tipo, count: 1, total: valor }); }
      };

      // ===== AR (RECEITA) =====
      receber?.forEach(titulo => {
        if (!titulo.data_emissao) return;
        const mes = new Date(titulo.data_emissao).getMonth() + 1;
        const valor = titulo.valor || 0;
        totalAR += valor;

        const rateio = parseRateio(titulo.categorias_rateio);
        if (rateio) {
          for (const rat of rateio) {
            const contaDre = mapaCat.get(rat.codigo_categoria);
            if (contaDre) {
              acumular(contaDre, mes, rat.valor || 0);
            } else {
              acumular('(+) - Receita Bruta de Vendas', mes, rat.valor || 0);
              if (rat.codigo_categoria) trackUnmapped(rat.codigo_categoria, 'AR', rat.valor || 0);
            }
          }
        } else {
          const contaDre = titulo.categoria ? mapaCat.get(titulo.categoria) : null;
          if (contaDre) {
            acumular(contaDre, mes, valor);
          } else {
            acumular('(+) - Receita Bruta de Vendas', mes, valor);
            if (titulo.categoria) trackUnmapped(titulo.categoria, 'AR', valor);
          }
        }

        // Acumular receita por mês para cálculo de impostos
        receitaPorMes.set(mes, (receitaPorMes.get(mes) || 0) + valor);
      });

      // ===== IMPOSTOS POR ALÍQUOTA SOBRE RECEITA BRUTA =====
      receitaPorMes.forEach((receita, mes) => {
        const impostos = calcularImpostosDRE(receita, aliquotas);
        if (impostos.deducoes > 0) {
          acumular('(-) - Deduções de Receita', mes, impostos.deducoes);
        }
        if (impostos.impostosLucro > 0) {
          acumular('(-) - Impostos', mes, impostos.impostosLucro);
        }
      });

      // ===== AP (DESPESA/CUSTO) =====
      pagar?.forEach(titulo => {
        if (!titulo.data_emissao) return;
        const mes = new Date(titulo.data_emissao).getMonth() + 1;
        const valor = titulo.valor || 0;
        totalAP += valor;

        const rateio = parseRateio(titulo.categorias_rateio);
        if (rateio) {
          for (const rat of rateio) {
            const contaDre = mapaCat.get(rat.codigo_categoria) || fallbackAP(rat.codigo_categoria);
            acumular(contaDre, mes, rat.valor || 0);
            if (!mapaCat.has(rat.codigo_categoria) && rat.codigo_categoria) {
              trackUnmapped(rat.codigo_categoria, 'AP', rat.valor || 0);
            }
          }
        } else {
          const contaDre = titulo.categoria
            ? (mapaCat.get(titulo.categoria) || fallbackAP(titulo.categoria))
            : fallbackAP(undefined);
          acumular(contaDre, mes, valor);
          if (titulo.categoria && !mapaCat.has(titulo.categoria)) {
            trackUnmapped(titulo.categoria, 'AP', valor);
          }
        }
      });

      // Converter em array
      const dados: DREDadosMes[] = [];
      acumulador.forEach((total, key) => {
        const [conta_dre, mesStr] = key.split('|');
        dados.push({ conta_dre, mes: Number(mesStr), ano, total });
      });

      return { dados, unmapped: Array.from(unmappedTracker.values()), totalAR, totalAP };
    },
    staleTime: 5 * 60 * 1000,
  });
}
