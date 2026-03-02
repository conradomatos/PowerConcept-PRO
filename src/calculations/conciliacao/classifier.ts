import { normalizeCnpjCpf, daysDiff } from './utils';
import type { LancamentoBanco, LancamentoOmie, TransacaoCartao, Match, Divergencia } from './types';

// ============================================================
// DETECTAR DUPLICIDADES (tipo E)
// ============================================================
export function detectDuplicates(omie: LancamentoOmie[], divergencias: Divergencia[]) {
  const groups = new Map<string, LancamentoOmie[]>();

  for (const o of omie) {
    const key = `${normalizeCnpjCpf(o.cnpjCpf)}|${o.valor.toFixed(2)}|${o.data.toISOString().slice(0,10)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  for (const [, entries] of groups) {
    if (entries.length < 2) continue;
    const matched = entries.filter(e => e.matched);
    const unmatched = entries.filter(e => !e.matched);

    if (matched.length && unmatched.length) {
      for (const u of unmatched) {
        u.matched = true;
        u.matchType = 'DUPLICIDADE';
        divergencias.push({
          tipo: 'E',
          tipoNome: 'DUPLICIDADE',
          fonte: 'Omie',
          data: u.dataStr,
          valor: u.valor,
          descricao: u.clienteFornecedor,
          cnpjCpf: u.cnpjCpf,
          nome: u.clienteFornecedor,
          situacao: u.situacao,
          origem: u.origem,
          banco: null,
          omie: u,
        });
      }
    }
  }
}

// ============================================================
// CLASSIFICAR TODAS AS DIVERGÊNCIAS
// ============================================================
export function classifyDivergencias(
  banco: LancamentoBanco[],
  omie: LancamentoOmie[],
  _cartao: TransacaoCartao[],
  divergencias: Divergencia[],
  matches: Match[],
  contasExcluidas: { nome: string; count: number; entradas: LancamentoOmie[] }[] = [],
) {
  // A — FALTANDO NO OMIE / T — TRANSFERÊNCIAS ENTRE CONTAS
  for (const b of banco) {
    if (!b.matched) {
      const descUpper = (b.descricao || '').toUpperCase();
      const isTransferencia = descUpper.includes('DEB.CTA.FATURA') || descUpper.includes('FATURA CARTAO') || descUpper.includes('FATURA CARTÃO');

      divergencias.push({
        tipo: isTransferencia ? 'T' : 'A',
        tipoNome: isTransferencia ? 'TRANSFERÊNCIA ENTRE CONTAS' : 'FALTANDO NO OMIE',
        fonte: 'Banco',
        data: b.dataStr,
        valor: b.valor,
        descricao: b.descricao || '',
        cnpjCpf: b.cnpjCpf,
        nome: b.nome,
        acao: isTransferencia ? 'Lançar transferência Sicredi → Cartão de Crédito no Omie' : undefined,
        banco: b,
        omie: null,
      });
    }
  }

  // B / B* / G — A MAIS NO OMIE / CONTAS EM ATRASO (RECEBER vs PAGAR)
  for (const o of omie) {
    if (o.matched) continue;

    const isAtrasado = o.situacao.toLowerCase() === 'atrasado';
    const isReceber = o.origem.toLowerCase().includes('receber');
    const isPagar = o.origem.toLowerCase().includes('pagar');
    const isPrevisao = o.origem.toLowerCase().includes('previs');

    if (isAtrasado && isReceber) {
      divergencias.push({
        tipo: 'B*',
        tipoNome: 'CONTA A RECEBER EM ATRASO',
        fonte: 'Omie',
        data: o.dataStr,
        valor: o.valor,
        descricao: o.razaoSocial || o.clienteFornecedor || o.cnpjCpf || '',
        cnpjCpf: o.cnpjCpf,
        nome: o.clienteFornecedor,
        situacao: o.situacao,
        origem: o.origem,
        acao: 'Conta a receber em atraso — cobrar cliente',
        obs: o.observacoes || '',
        banco: null,
        omie: o,
      });
      continue;
    }

    if (isAtrasado && (isPagar || isPrevisao)) {
      divergencias.push({
        tipo: 'G',
        tipoNome: 'CONTA A PAGAR EM ATRASO',
        fonte: 'Omie',
        data: o.dataStr,
        valor: o.valor,
        descricao: o.razaoSocial || o.clienteFornecedor || o.cnpjCpf || '',
        cnpjCpf: o.cnpjCpf,
        nome: o.clienteFornecedor,
        situacao: o.situacao,
        origem: o.origem,
        acao: 'Conta a pagar em atraso — verificar pagamento ao fornecedor',
        obs: o.observacoes || '',
        banco: null,
        omie: o,
      });
      continue;
    }

    if (isAtrasado) {
      const tipoDiv = o.valor > 0 ? 'B*' : 'G';
      const tipoNome = o.valor > 0 ? 'CONTA A RECEBER EM ATRASO' : 'CONTA A PAGAR EM ATRASO';
      const acao = o.valor > 0
        ? 'Conta a receber em atraso — cobrar cliente'
        : 'Conta a pagar em atraso — verificar pagamento';

      divergencias.push({
        tipo: tipoDiv,
        tipoNome,
        fonte: 'Omie',
        data: o.dataStr,
        valor: o.valor,
        descricao: o.razaoSocial || o.clienteFornecedor || o.cnpjCpf || '',
        cnpjCpf: o.cnpjCpf,
        nome: o.clienteFornecedor,
        situacao: o.situacao,
        origem: o.origem,
        acao,
        obs: o.observacoes || '',
        banco: null,
        omie: o,
      });
      continue;
    }

    // NÃO ATRASADO — tipo B normal
    divergencias.push({
      tipo: 'B',
      tipoNome: 'A MAIS NO OMIE',
      fonte: 'Omie',
      data: o.dataStr,
      valor: o.valor,
      descricao: o.razaoSocial || o.clienteFornecedor || o.cnpjCpf || '',
      cnpjCpf: o.cnpjCpf,
      nome: o.clienteFornecedor,
      situacao: o.situacao,
      origem: o.origem,
      acao: 'Investigar',
      obs: o.observacoes || '',
      banco: null,
      omie: o,
    });
  }

  // C / D — VALOR/DATA DIVERGENTE nos matches
  for (const m of matches) {
    const b = m.banco;
    const o = m.omie;

    if (Math.abs(b.valor - o.valor) >= 0.01) {
      divergencias.push({
        tipo: 'C',
        tipoNome: 'VALOR DIVERGENTE',
        fonte: 'Ambos',
        data: b.dataStr,
        valor: b.valor,
        valorBanco: b.valor,
        valorOmie: o.valor,
        diferenca: b.valor - o.valor,
        descricao: b.descricao,
        cnpjCpf: b.cnpjCpf,
        nome: o.clienteFornecedor,
        banco: b,
        omie: o,
      });
    }

    const dd = daysDiff(b.data, o.data);
    if (dd > 3 && Math.abs(b.valor - o.valor) < 0.01) {
      divergencias.push({
        tipo: 'D',
        tipoNome: 'DATA DIVERGENTE',
        fonte: 'Ambos',
        data: b.dataStr,
        dataBanco: b.dataStr,
        dataOmie: o.dataStr,
        valor: b.valor,
        diasDiferenca: dd,
        descricao: b.descricao,
        cnpjCpf: b.cnpjCpf,
        nome: o.clienteFornecedor,
        banco: b,
        omie: o,
      });
    }
  }

  // F — POSSÍVEL LANÇAMENTO NA CONTA ERRADA (cartão na conta banco)
  const entradasCartao = contasExcluidas
    .filter(c => c.nome?.toUpperCase().includes('CARTAO') || c.nome?.toUpperCase().includes('CREDITO'))
    .flatMap(c => c.entradas);

  const cartaoValores = new Set(
    entradasCartao.map(e => Math.abs(e.valor).toFixed(2))
  );

  const faturaValores = new Set(
    (_cartao || [])
      .filter(t => !t.isPagamentoFatura && !t.isEstorno)
      .map(t => Math.abs(t.valor).toFixed(2))
  );

  for (const d of divergencias) {
    if (d.tipo !== 'B') continue;
    if (!d.omie) continue;
    if (d.omie.valor >= 0) continue; // Só saídas

    const obsUpper = (d.omie.observacoes || '').toUpperCase();
    const isNFeAuto = obsUpper.includes('RECEBIMENTO DA NF') ||
                      obsUpper.includes('INCLUSÃO PELA NF');

    if (!isNFeAuto) continue;

    const valorKey = Math.abs(d.omie.valor).toFixed(2);

    // Alta confiança: valor existe na conta do cartão
    if (cartaoValores.has(valorKey) || faturaValores.has(valorKey)) {
      d.tipo = 'F';
      d.tipoNome = 'CONTA ERRADA (cartão)';
      d.confianca = 'alta';
      d.acao = 'Compra de cartão lançada na conta Sicredi. Mover para conta Cartão de Crédito no Omie.';
      continue;
    }

    // Média confiança: heurística (NF-e auto + valor baixo + saída)
    if (Math.abs(d.omie.valor) <= 500) {
      d.tipo = 'F';
      d.tipoNome = 'POSSÍVEL CONTA ERRADA (cartão)';
      d.confianca = 'media';
      d.acao = 'Possível compra de cartão na conta Sicredi. Verificar se é compra no cartão de crédito.';
    }
  }

  // Ação melhorada para CT-e tipo B
  for (const d of divergencias) {
    if (d.tipo !== 'B') continue;
    if (!d.omie) continue;
    const obs = (d.omie.observacoes || '').toUpperCase();
    if (obs.includes('CT-E') || obs.includes('RECEBIMENTO DO CT')) {
      d.acao = 'Frete (CT-e) aguardando agrupamento quinzenal. Será cobrado no próximo boleto do fornecedor.';
    }
  }

  // Ação melhorada para NF-e parcelada tipo B (valor > R$ 400)
  for (const d of divergencias) {
    if (d.tipo !== 'B') continue;
    if (!d.omie) continue;

    const obs = (d.omie.observacoes || '').toUpperCase();
    const isNFeAuto = obs.includes('RECEBIMENTO DA NF') || obs.includes('INCLUSÃO PELA NF');

    if (!isNFeAuto) continue;
    if (d.omie.valor >= 0) continue;

    if (Math.abs(d.omie.valor) > 400) {
      d.acao = 'NF-e sem pagamento correspondente. Verificar se foi parcelada — conferir parcelas, datas e valores no Omie.';
    }
  }

  divergencias.sort((a, b) => Math.abs(b.valor || 0) - Math.abs(a.valor || 0));
}
