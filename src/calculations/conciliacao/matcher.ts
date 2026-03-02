import { normalizeCnpjCpf, nomeCompativel, daysDiff } from './utils';
import type { LancamentoBanco, LancamentoOmie, Match } from './types';

function markMatch(b: LancamentoBanco, o: LancamentoOmie, camada: string, tipo: string, matches: Match[]) {
  b.matched = true;
  b.matchType = tipo;
  b.matchCamada = camada;
  b.matchOmieIdx = o.idx;

  o.matched = true;
  o.matchType = tipo;
  o.matchCamada = camada;
  o.matchBancoIdx = b.idx;

  matches.push({ camada, tipo, banco: b, omie: o });
}

// ============================================================
// CAMADA A — Match exato (confiança ALTA)
// ============================================================
export function matchCamadaA(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.matched) continue;
    const bCnpj = normalizeCnpjCpf(b.cnpjCpf);

    for (const o of omie) {
      if (o.matched) continue;
      const oCnpj = normalizeCnpjCpf(o.cnpjCpf);

      if (bCnpj && oCnpj && bCnpj === oCnpj) {
        if (Math.abs(b.valor - o.valor) < 0.01) {
          if (daysDiff(b.data, o.data) <= 1) {
            markMatch(b, o, 'A', 'CNPJ+Valor+Data', matches);
            break;
          }
        }
      }

      if (o.observacoes && Math.abs(b.valor - o.valor) < 0.01) {
        const obsUpper = o.observacoes.toUpperCase().replace(/\n/g, ' ');
        const descParts = b.descricao.toUpperCase().split(/\s+/);
        const keyParts = descParts.filter(p => p.length > 3);
        if (keyParts.length >= 3) {
          const matchCount = keyParts.filter(p => obsUpper.includes(p)).length;
          if (matchCount >= Math.min(3, keyParts.length)) {
            if (daysDiff(b.data, o.data) <= 3) {
              markMatch(b, o, 'A', 'Observações+Valor', matches);
              break;
            }
          }
        }
        if (bCnpj && normalizeCnpjCpf(obsUpper.replace(/\./g, '').replace(/\//g, '').replace(/-/g, '')).includes(bCnpj)) {
          if (daysDiff(b.data, o.data) <= 3) {
            markMatch(b, o, 'A', 'CNPJ_obs+Valor', matches);
            break;
          }
        }
      }
    }
  }
}

// ============================================================
// CAMADA B — Match provável (confiança MÉDIA)
// ============================================================
export function matchCamadaB(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.matched) continue;
    const bCnpj = normalizeCnpjCpf(b.cnpjCpf);

    for (const o of omie) {
      if (o.matched) continue;
      const oCnpj = normalizeCnpjCpf(o.cnpjCpf);

      if (Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 3) {
        if (nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial, o.observacoes)) {
          markMatch(b, o, 'B', 'Valor+Data+Nome', matches);
          break;
        }
      }

      if (bCnpj && oCnpj && bCnpj === oCnpj && daysDiff(b.data, o.data) <= 5) {
        if (b.valor !== 0 && Math.abs(b.valor - o.valor) / Math.abs(b.valor) < 0.05) {
          markMatch(b, o, 'B', 'CNPJ+Data+ValorProx', matches);
          break;
        }
      }

      if (bCnpj && oCnpj && bCnpj === oCnpj && Math.abs(b.valor - o.valor) < 0.01) {
        if (daysDiff(b.data, o.data) <= 5) {
          markMatch(b, o, 'B', 'CNPJ+Valor+DataProx', matches);
          break;
        }
      }

      if (o.observacoes && Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 5) {
        const obsNorm = o.observacoes.toUpperCase().replace(/\n/g, ' ');
        if (bCnpj && obsNorm.replace(/\D/g, '').includes(bCnpj)) {
          markMatch(b, o, 'B', 'CNPJ_obs_parcial+Valor', matches);
          break;
        }
      }
    }
  }
}

// ============================================================
// CAMADA B2 — Match B adicional
// ============================================================
function matchCamadaB2(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.matched) continue;
    for (const o of omie) {
      if (o.matched) continue;
      if (Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 5) {
        if (nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial, o.observacoes)) {
          markMatch(b, o, 'B', 'Valor+DataProx+Nome', matches);
          break;
        }
      }
    }
  }
}

// ============================================================
// CAMADA C — Match por agrupamento (confiança MÉDIA)
// ============================================================
export function matchCamadaC(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  const unmatchedOmie = omie.filter(o => !o.matched);

  for (const b of banco) {
    if (b.matched) continue;
    const bCnpj = normalizeCnpjCpf(b.cnpjCpf);
    if (!bCnpj) continue;

    const candidates = unmatchedOmie.filter(o =>
      !o.matched &&
      normalizeCnpjCpf(o.cnpjCpf) === bCnpj &&
      daysDiff(b.data, o.data) <= 5
    );

    if (candidates.length >= 2) {
      const total = candidates.reduce((sum, c) => sum + c.valor, 0);
      if (Math.abs(total - b.valor) < 0.01) {
        for (const c of candidates) {
          markMatch(b, c, 'C', `Agrupamento(${candidates.length})`, matches);
        }
        break;
      }
    }
  }

  // === Match individual FOPAG — Tentativa 1: via observações (nome) ===
  for (const b of banco) {
    if (b.matched) continue;
    if (b.tipo !== 'PIX_ENVIADO' && b.tipo !== 'FOLHA') continue;
    
    for (const o of unmatchedOmie) {
      if (o.matched) continue;
      if (!/FOPAG|FOLHA|SALARIO|SALÁRIO/i.test(o.categoria)) continue;
      
      if (Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 3) {
        if (nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial, o.observacoes)) {
          console.log(`[FOPAG] Match por obs: banco="${b.nome}" ↔ omie="${o.clienteFornecedor}" obs="${(o.observacoes||'').substring(0,50)}" val=${b.valor}`);
          markMatch(b, o, 'B', 'FOPAG_Obs+Valor', matches);
          break;
        }
      }
    }
  }

  // === Match individual FOPAG — Tentativa 2: FALLBACK por valor exato + data ===
  for (const b of banco) {
    if (b.matched) continue;
    if (b.tipo !== 'PIX_ENVIADO') continue;
    if (b.valor >= 0) continue;
    
    for (const o of unmatchedOmie) {
      if (o.matched) continue;
      if (!/FOPAG|FOLHA|SALARIO|SALÁRIO/i.test(o.categoria)) continue;
      const clienteUpper = (o.clienteFornecedor || '').toUpperCase();
      if (!clienteUpper.includes('FOLHA') && !clienteUpper.includes('PAGAMENTO') && !clienteUpper.includes('FOPAG')) continue;
      
      if (Math.abs(b.valor - o.valor) < 0.01 && daysDiff(b.data, o.data) <= 2) {
        console.log(`[FOPAG Fallback] Match por valor: banco="${b.nome}" val=${b.valor} ↔ omie="${o.clienteFornecedor}" val=${o.valor}`);
        markMatch(b, o, 'B', 'FOPAG_Valor+Data', matches);
        break;
      }
    }
  }

  for (const b of banco) {
    if (b.matched || b.tipo !== 'FOLHA') continue;
    const candidates = unmatchedOmie.filter(o =>
      !o.matched &&
      daysDiff(b.data, o.data) <= 2 &&
      /FOPAG|FOLHA|SALARIO|SALÁRIO/i.test(o.categoria)
    );
    if (candidates.length) {
      const total = candidates.reduce((sum, c) => sum + c.valor, 0);
      if (Math.abs(total - b.valor) < 0.01) {
        for (const c of candidates) {
          markMatch(b, c, 'C', `FOLHA_Agrupamento(${candidates.length})`, matches);
        }
      }
    }
  }

  // Agrupamento especial para fretes (CT-e) — match por subconjunto quinzenal
  for (const b of banco) {
    if (b.matched) continue;
    const bCnpj = normalizeCnpjCpf(b.cnpjCpf);
    if (!bCnpj) continue;

    const candidates = unmatchedOmie.filter(o =>
      !o.matched &&
      normalizeCnpjCpf(o.cnpjCpf) === bCnpj &&
      daysDiff(b.data, o.data) <= 45 &&
      ((o.observacoes || '').toUpperCase().includes('CT-E') ||
       (o.tipoDoc || '').toUpperCase().includes('CT-E') ||
       (o.categoria || '').toUpperCase().includes('FRETE'))
    );

    if (candidates.length < 2) continue;

    // Tentar soma total primeiro
    const totalTodos = candidates.reduce((sum, c) => sum + c.valor, 0);
    if (Math.abs(totalTodos - b.valor) < 0.02) {
      for (const c of candidates) {
        markMatch(b, c, 'C', `CT-e_Agrupamento(${candidates.length})`, matches);
      }
      continue;
    }

    // Se soma total não bateu, tentar subconjuntos por quinzena
    const sorted = [...candidates].sort((a, b2) => a.data.getTime() - b2.data.getTime());
    const quinzena1 = sorted.filter(c => c.data.getDate() >= 1 && c.data.getDate() <= 15);
    const quinzena2 = sorted.filter(c => c.data.getDate() >= 16);

    for (const grupo of [quinzena1, quinzena2]) {
      if (grupo.length < 2) continue;
      const total = grupo.reduce((sum, c) => sum + c.valor, 0);
      if (Math.abs(total - b.valor) < 0.02) {
        for (const c of grupo) {
          markMatch(b, c, 'C', `CT-e_Quinzena(${grupo.length})`, matches);
        }
        break;
      }
    }
  }
}

// ============================================================
// CAMADA D — Match fraco (confiança BAIXA) com scoring
// ============================================================
export function matchCamadaD(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  matchCamadaB2(banco, omie, matches);

  for (const b of banco) {
    if (b.matched) continue;

    let bestCandidate: LancamentoOmie | null = null;
    let bestScore = 0;

    for (const o of omie) {
      if (o.matched) continue;
      let score = 0;

      if (Math.abs(b.valor - o.valor) < 0.01) score += 3;
      else if (b.valor !== 0 && Math.abs(b.valor - o.valor) / Math.abs(b.valor) < 0.05) score += 1;

      const dd = daysDiff(b.data, o.data);
      if (dd <= 1) score += 2;
      else if (dd <= 3) score += 1;

      if (nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial, o.observacoes)) score += 2;

      const bCnpj = normalizeCnpjCpf(b.cnpjCpf);
      const oCnpj = normalizeCnpjCpf(o.cnpjCpf);
      if (bCnpj && oCnpj && bCnpj === oCnpj) score += 3;

      if (score > bestScore && score >= 3) {
        bestScore = score;
        bestCandidate = o;
      }
    }

    if (bestCandidate && bestScore >= 4) {
      const valorMatch = Math.abs(b.valor - bestCandidate.valor) < 0.01;
      const dataMatch = daysDiff(b.data, bestCandidate.data) <= 3;

      let tipo = `Score=${bestScore}`;
      if (valorMatch && !dataMatch) tipo = 'Valor+Nome(DataDiv)';
      else if (!valorMatch && dataMatch) tipo = 'Data+Nome(ValorDiv)';

      markMatch(b, bestCandidate, 'D', tipo, matches);
    }
  }
}

// ============================================================
// MATCH FATURA CARTÃO
// ============================================================
export function matchFaturaCartao(banco: LancamentoBanco[], omie: LancamentoOmie[], matches: Match[]) {
  for (const b of banco) {
    if (b.tipo !== 'FATURA_CARTAO') continue;
    if (b.matched) continue;

    for (const o of omie) {
      if (o.matched) continue;
      const isCartao = o.clienteFornecedor.toUpperCase().includes('CARTAO DE CREDITO') ||
                       o.categoria.toUpperCase().includes('CARTAO DE CREDITO') ||
                       o.origem.includes('Saída de Transferência') ||
                       o.origem.includes('Débito de Transferência');

      if (isCartao && o.contaCorrente === 'CONCEPT_SICREDI') {
        if (Math.abs(b.valor - o.valor) < 0.01) {
          markMatch(b, o, 'A', 'FATURA_CARTAO', matches);
          break;
        }
      }
    }
  }
}

