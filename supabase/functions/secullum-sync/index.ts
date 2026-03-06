import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** URL base da API de integracao externa do Secullum Ponto Web */
const SECULLUM_BASE_URL = 'https://pontowebintegracaoexterna.secullum.com.br';

/** URL do autenticador Secullum */
const SECULLUM_AUTH_URL = 'https://autenticador.secullum.com.br/Token';

/** IDs de projetos especiais para apontamentos automaticos */
const PROJETO_FERIAS_ID = 'cc5da047-102e-4592-9c84-e3d0ec059739';
const PROJETO_AFASTAMENTO_ID = '85a4e4c2-4ad1-4f4a-8e41-3675b69a25a9';

/** Limite de requests por hora para API Secullum */
const MAX_REQUESTS_PER_HOUR = 500;

/** Etapas validas */
const ETAPAS_VALIDAS = ['FUNCIONARIOS', 'FOTOS', 'AFASTAMENTOS', 'CALCULOS'] as const;
type Etapa = typeof ETAPAS_VALIDAS[number];

interface SyncRequest {
  tipo: 'CRON' | 'MANUAL';
  etapa: Etapa;
  dataInicio?: string;
  dataFim?: string;
  colaboradorIds?: string[];
}

interface SecullumFuncionario {
  Id: number;
  Nome: string;
  Cpf: string;
  Nascimento: string | null;
  Admissao: string | null;
  Demissao: string | null;
  Funcao: { Descricao: string } | null;
  Departamento: { Descricao: string } | null;
  Email: string | null;
  Celular: string | null;
  Telefone: string | null;
  Masculino: boolean;
  Rg: string | null;
  NumeroPis: string | null;
  NumeroFolha: number | null;
  PossuiFoto: boolean;
  Horario: { Descricao: string } | null;
  Endereco: string | null;
  Bairro: string | null;
  Cidade: { Descricao: string } | null;
  Uf: string | null;
  Cep: string | null;
  DataAlteracao: string | null;
}

interface SecullumCalculoResponse {
  Colunas: string[];
  Linhas: { Key: string; Value: string[] }[];
}

interface SyncCounts {
  funcionarios: { sincronizados: number; criados: number; atualizados: number; ignorados: number };
  fotos: { sincronizadas: number };
  afastamentos: { sincronizados: number };
  calculos: { sincronizados: number };
  apontamentos: { criados: number; atualizados: number };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Remove pontos e tracos do CPF: 000.000.000-00 → 00000000000 */
function normalizeCpf(cpf: string): string {
  return cpf.replace(/[.\-]/g, '');
}

/** Converte string HH:mm para decimal. "08:48" → 8.80. "" → 0.00 */
function hhmmToDecimal(value: string | null | undefined): number {
  if (!value || value.trim() === '') return 0;
  const parts = value.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

/** Extrai a parte de data "YYYY-MM-DD" de uma string ISO "2026-01-06T00:00:00" */
function extractDate(isoKey: string): string {
  return isoKey.substring(0, 10);
}

/** Faz parse seguro de data do Secullum. Retorna string ISO ou null */
function parseSecullumDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().substring(0, 10);
  } catch {
    return null;
  }
}

/** Classifica tipo de afastamento pela descricao */
function classificarTipoAfastamento(descricao: string): string {
  const upper = descricao.toUpperCase();
  if (upper.includes('FERIAS') || upper.includes('FÉRIAS')) return 'FERIAS';
  if (upper.includes('ATESTAD') || upper.includes('MÉDICO')) return 'ATESTADO';
  if (upper.includes('LICEN')) return 'LICENCA';
  return 'OUTRO';
}

/** Classifica tipo_dia a partir dos dados do calculo */
function classificarTipoDia(
  primeiroValor: string,
  batidas: Record<string, string>,
  temHoras: boolean
): string {
  const upper = primeiroValor.toUpperCase();
  if (upper.includes('FERIAS') || upper.includes('FÉRIAS')) return 'FERIAS';
  if (upper.includes('FOLGA')) return 'FOLGA';
  if (upper.includes('ATESTAD')) return 'ATESTADO';
  if (upper.includes('FERIADO')) return 'FERIADO';

  const temBatida = Object.values(batidas).some(v => v && v.trim() !== '');
  if (!temBatida && !temHoras) return 'SEM_MARCACAO';
  return 'NORMAL';
}

/** Delay em milissegundos */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Resposta JSON padronizada */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Inicializa contadores zerados */
function initCounts(): SyncCounts {
  return {
    funcionarios: { sincronizados: 0, criados: 0, atualizados: 0, ignorados: 0 },
    fotos: { sincronizadas: 0 },
    afastamentos: { sincronizados: 0 },
    calculos: { sincronizados: 0 },
    apontamentos: { criados: 0, atualizados: 0 },
  };
}

// ─── Secullum API Client ───────────────────────────────────────────────────────

class SecullumClient {
  private token = '';
  private bancoId = '';
  private requestCount = 0;

  constructor(
    private username: string,
    private password: string,
    bancoId: string,
  ) {
    this.bancoId = bancoId;
  }

  /** Autentica na API Secullum e obtem token */
  async autenticar(): Promise<void> {
    const body = `grant_type=password&username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}&client_id=3`;

    const resp = await fetch(SECULLUM_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha na autenticacao Secullum (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    this.token = data.access_token;
    console.log(`Secullum autenticado. Token expira em ${data.expires_in}s`);
  }

  /** Headers comuns para todas as chamadas API Secullum */
  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'secullumidbancoselecionado': this.bancoId,
      'Accept-Language': 'pt-BR',
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  /** GET generico com tratamento de rate limit */
  async get<T>(path: string): Promise<T> {
    this.requestCount++;
    let resp = await fetch(`${SECULLUM_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (resp.status === 429) {
      console.warn('Rate limit 429 atingido. Aguardando 60s...');
      await delay(60000);
      this.requestCount++;
      resp = await fetch(`${SECULLUM_BASE_URL}${path}`, {
        method: 'GET',
        headers: this.headers(),
      });
    }

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Secullum GET ${path} falhou (${resp.status}): ${text}`);
    }

    return await resp.json() as T;
  }

  /** POST generico com tratamento de rate limit */
  async post<T>(path: string, body: unknown): Promise<T> {
    this.requestCount++;
    let resp = await fetch(`${SECULLUM_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      console.warn('Rate limit 429 atingido. Aguardando 60s...');
      await delay(60000);
      this.requestCount++;
      resp = await fetch(`${SECULLUM_BASE_URL}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    }

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Secullum POST ${path} falhou (${resp.status}): ${text}`);
    }

    return await resp.json() as T;
  }

  /** Retorna o total de requests feitos */
  getRequestCount(): number {
    return this.requestCount;
  }
}

// ─── Etapa: FUNCIONARIOS ────────────────────────────────────────────────────────

async function stepFuncionarios(
  supabase: ReturnType<typeof createClient>,
  client: SecullumClient,
  counts: SyncCounts,
): Promise<void> {
  console.log('Buscando funcionarios do Secullum...');
  const funcionarios = await client.get<SecullumFuncionario[]>(
    '/IntegracaoExterna/Funcionarios'
  );
  console.log(`${funcionarios.length} funcionarios encontrados no Secullum`);

  for (const func of funcionarios) {
    const cpfLimpo = normalizeCpf(func.Cpf);
    counts.funcionarios.sincronizados++;

    // Verificar se ja existe no banco pelo CPF
    const { data: existing } = await supabase
      .from('collaborators')
      .select('id, origem, foto_url, secullum_data_alteracao')
      .eq('cpf', cpfLimpo)
      .maybeSingle();

    // Se existente com origem MANUAL, pular (proteger parceiros)
    if (existing && existing.origem === 'MANUAL') {
      counts.funcionarios.ignorados++;
      continue;
    }

    // SMART UPDATE: Se DataAlteracao nao mudou, skip (nada mudou no Secullum)
    if (existing && existing.origem === 'SECULLUM') {
      if (existing.secullum_data_alteracao === func.DataAlteracao) {
        counts.funcionarios.ignorados++;
        continue;
      }

      // DataAlteracao mudou → UPDATE apenas campos dinamicos
      const dynamicData = {
        status: func.Demissao ? 'desligado' : 'ativo',
        termination_date: parseSecullumDate(func.Demissao),
        position: func.Funcao?.Descricao || null,
        department: func.Departamento?.Descricao || null,
        email: func.Email || null,
        phone: func.Celular || func.Telefone || null,
        horario_descricao: func.Horario?.Descricao || null,
        endereco: func.Endereco || null,
        bairro: func.Bairro || null,
        cidade: func.Cidade?.Descricao || null,
        uf: func.Uf || null,
        cep: func.Cep || null,
        secullum_data_alteracao: func.DataAlteracao,
      };

      const { error } = await supabase
        .from('collaborators')
        .update(dynamicData)
        .eq('id', existing.id);

      if (error) {
        console.error(`Erro ao atualizar colaborador CPF ${cpfLimpo}:`, error.message);
      } else {
        counts.funcionarios.atualizados++;
      }
      continue;
    }

    // INSERT — novo colaborador (todos os campos: estaticos + dinamicos)
    const colabData = {
      full_name: func.Nome,
      cpf: cpfLimpo,
      birth_date: parseSecullumDate(func.Nascimento),
      hire_date: parseSecullumDate(func.Admissao),
      termination_date: parseSecullumDate(func.Demissao),
      position: func.Funcao?.Descricao || null,
      department: func.Departamento?.Descricao || null,
      email: func.Email || null,
      phone: func.Celular || func.Telefone || null,
      sexo: func.Masculino ? 'M' : 'F',
      rg: func.Rg || null,
      pis: func.NumeroPis || null,
      numero_folha: func.NumeroFolha || null,
      horario_descricao: func.Horario?.Descricao || null,
      endereco: func.Endereco || null,
      bairro: func.Bairro || null,
      cidade: func.Cidade?.Descricao || null,
      uf: func.Uf || null,
      cep: func.Cep || null,
      secullum_data_alteracao: func.DataAlteracao || null,
      secullum_id: func.Id,
      status: func.Demissao ? 'desligado' : 'ativo',
      origem: 'SECULLUM',
    };

    const { error } = await supabase
      .from('collaborators')
      .insert(colabData);

    if (error) {
      console.error(`Erro ao inserir colaborador CPF ${cpfLimpo}:`, error.message);
    } else {
      counts.funcionarios.criados++;
    }
  }

  console.log(
    `Funcionarios: ${counts.funcionarios.criados} criados, ${counts.funcionarios.atualizados} atualizados, ${counts.funcionarios.ignorados} ignorados`
  );
}

// ─── Etapa: FOTOS ───────────────────────────────────────────────────────────────

async function stepFotos(
  supabase: ReturnType<typeof createClient>,
  client: SecullumClient,
  counts: SyncCounts,
): Promise<void> {
  console.log('Sincronizando fotos...');

  // Buscar lista de funcionarios do Secullum para saber PossuiFoto
  const funcionarios = await client.get<SecullumFuncionario[]>(
    '/IntegracaoExterna/Funcionarios'
  );

  // Carregar colabMap do banco
  const { data: allColabs } = await supabase
    .from('collaborators')
    .select('id, cpf, origem, foto_url, secullum_data_alteracao')
    .eq('origem', 'SECULLUM');

  const colabMap = new Map<string, typeof allColabs extends Array<infer T> ? T : never>();
  for (const c of allColabs || []) {
    colabMap.set(c.cpf, c);
  }

  for (const func of funcionarios) {
    if (!func.PossuiFoto) continue;

    const cpfLimpo = normalizeCpf(func.Cpf);
    const colab = colabMap.get(cpfLimpo);
    if (!colab) continue;

    // Pular se ja tem foto e data de alteracao nao mudou
    if (colab.foto_url && colab.secullum_data_alteracao === func.DataAlteracao) {
      continue;
    }

    try {
      const fotoBase64 = await client.get<string>(
        `/IntegracaoExterna/Funcionarios/Fotos?funcionarioId=${func.Id}`
      );

      if (fotoBase64) {
        const binaryStr = atob(fotoBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const filePath = `${cpfLimpo}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('secullum-fotos')
          .upload(filePath, bytes, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Erro upload foto CPF ${cpfLimpo}:`, uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('secullum-fotos')
            .getPublicUrl(filePath);

          const fotoUrl = publicUrlData?.publicUrl || null;

          if (fotoUrl) {
            await supabase
              .from('collaborators')
              .update({ foto_url: fotoUrl })
              .eq('id', colab.id);

            counts.fotos.sincronizadas++;
          }
        }
      }
    } catch (err) {
      console.error(`Erro ao buscar foto do funcionario ${func.Id}:`, (err as Error).message);
    }

    // Throttle: 1 request por segundo
    await delay(1000);
  }

  console.log(`Fotos: ${counts.fotos.sincronizadas} sincronizadas`);
}

// ─── Etapa: AFASTAMENTOS ────────────────────────────────────────────────────────

async function stepAfastamentos(
  supabase: ReturnType<typeof createClient>,
  client: SecullumClient,
  counts: SyncCounts,
  dataInicio: string,
  dataFim: string,
): Promise<void> {
  console.log('Buscando afastamentos do Secullum...');

  // Carregar colabMap do banco
  const { data: allColabs } = await supabase
    .from('collaborators')
    .select('id, cpf')
    .eq('origem', 'SECULLUM');

  const colabMap = new Map<string, string>();
  for (const c of allColabs || []) {
    colabMap.set(c.cpf, c.id);
  }

  try {
    const afastamentos = await client.get<
      Array<{
        FuncionarioCpf: string;
        DataInicio: string;
        DataFim: string;
        Descricao: string;
        Observacao?: string;
      }>
    >(
      `/IntegracaoExterna/FuncionariosAfastamentos?dataInicio=${dataInicio}&dataFim=${dataFim}`
    );

    console.log(`${afastamentos.length} afastamentos encontrados`);

    for (const af of afastamentos) {
      const cpfLimpo = normalizeCpf(af.FuncionarioCpf);
      const colabId = colabMap.get(cpfLimpo);
      if (!colabId) continue;

      const tipo = classificarTipoAfastamento(af.Descricao);

      const { error } = await supabase
        .from('secullum_afastamentos')
        .upsert(
          {
            colaborador_id: colabId,
            data_inicio: parseSecullumDate(af.DataInicio),
            data_fim: parseSecullumDate(af.DataFim),
            descricao: af.Descricao,
            observacao: af.Observacao || null,
            tipo,
          },
          { onConflict: 'colaborador_id,data_inicio,data_fim' }
        );

      if (error) {
        console.error(`Erro upsert afastamento CPF ${cpfLimpo}:`, error.message);
      } else {
        counts.afastamentos.sincronizados++;
      }
    }
  } catch (err) {
    console.error('Erro ao sincronizar afastamentos:', (err as Error).message);
  }

  console.log(`Afastamentos: ${counts.afastamentos.sincronizados} sincronizados`);
}

// ─── Etapa: CALCULOS ────────────────────────────────────────────────────────────

async function stepCalculos(
  supabase: ReturnType<typeof createClient>,
  client: SecullumClient,
  counts: SyncCounts,
  dataInicio: string,
  dataFim: string,
  colaboradorIds?: string[],
): Promise<void> {
  console.log('Sincronizando calculos...');

  // Carregar colaboradores ativos do banco
  let query = supabase
    .from('collaborators')
    .select('id, cpf, status')
    .eq('origem', 'SECULLUM')
    .eq('status', 'ativo');

  if (colaboradorIds && colaboradorIds.length > 0) {
    query = query.in('id', colaboradorIds);
  }

  const { data: colaboradoresAtivos } = await query;

  if (!colaboradoresAtivos || colaboradoresAtivos.length === 0) {
    console.log('Nenhum colaborador ativo encontrado para calculo');
    return;
  }

  console.log(`${colaboradoresAtivos.length} colaboradores ativos para calculo`);

  /** Colunas de entrada/saida (para extrair batidas) */
  const batidasPattern = /^(Entrada|Sa[ií]da)\s*\d+$/i;

  /** Colunas mapeadas para campos do banco */
  const columnMapping: Record<string, string> = {
    'Normais': 'horas_normais',
    'Faltas': 'horas_faltas',
    'Ex50%': 'horas_extra_50',
    'Ex100%': 'horas_extra_100',
    'Ex0%': 'horas_extra_0',
    'Not.': 'horas_noturnas',
    'ExNot': 'horas_extra_noturna',
    'Atras.': 'horas_atraso',
    'Carga': 'carga_horaria',
    'Ajuste': 'horas_ajuste',
    'Folga': 'horas_folga',
    'DSR': 'dsr',
    'DSR.Deb': 'dsr_debito',
  };

  const mappedColumnNames = new Set(Object.keys(columnMapping));

  for (const colab of colaboradoresAtivos) {
    try {
      const calcResponse = await client.post<SecullumCalculoResponse>(
        '/IntegracaoExterna/Calcular',
        {
          funcionarioCpf: colab.cpf,
          dataInicial: dataInicio,
          dataFinal: dataFim,
        }
      );

      if (!calcResponse.Colunas || !calcResponse.Linhas) {
        console.warn(`Calculo vazio para CPF ${colab.cpf}`);
        continue;
      }

      // Build column index map
      const colIndex: Record<string, number> = {};
      for (let i = 0; i < calcResponse.Colunas.length; i++) {
        colIndex[calcResponse.Colunas[i]] = i;
      }

      for (const linha of calcResponse.Linhas) {
        const data = extractDate(linha.Key);
        const valores = linha.Value;

        // Extrair batidas
        const batidas: Record<string, string> = {};
        const extras: Record<string, string> = {};
        const dbFields: Record<string, number> = {};

        for (const [colName, idx] of Object.entries(colIndex)) {
          const valor = valores[idx] || '';

          if (colName === 'Data' || idx === 0) {
            continue;
          }

          if (batidasPattern.test(colName)) {
            const key = colName
              .toLowerCase()
              .replace(/\s+/g, '')
              .replace('saída', 'saida')
              .replace('saida', 'saida');
            batidas[key] = valor;
          } else if (mappedColumnNames.has(colName)) {
            dbFields[columnMapping[colName]] = hhmmToDecimal(valor);
          } else {
            if (valor && valor.trim() !== '') {
              extras[colName] = valor;
            }
          }
        }

        // Calcular total horas trabalhadas
        const horasNormais = dbFields['horas_normais'] || 0;
        const extra50 = dbFields['horas_extra_50'] || 0;
        const extra100 = dbFields['horas_extra_100'] || 0;
        const extra0 = dbFields['horas_extra_0'] || 0;
        const extraNoturna = dbFields['horas_extra_noturna'] || 0;
        const totalHorasTrabalhadas = Math.round((horasNormais + extra50 + extra100 + extra0 + extraNoturna) * 100) / 100;

        // Classificar tipo_dia
        const primeiroValor = valores[0] || '';
        const temHoras = totalHorasTrabalhadas > 0;
        const tipoDia = classificarTipoDia(primeiroValor, batidas, temHoras);

        const calculoRow = {
          colaborador_id: colab.id,
          data,
          ...dbFields,
          total_horas_trabalhadas: totalHorasTrabalhadas,
          tipo_dia: tipoDia,
          batidas_json: batidas,
          extras_json: Object.keys(extras).length > 0 ? extras : null,
        };

        const { error } = await supabase
          .from('secullum_calculos')
          .upsert(calculoRow, { onConflict: 'colaborador_id,data' });

        if (error) {
          console.error(`Erro upsert calculo CPF ${colab.cpf} data ${data}:`, error.message);
        } else {
          counts.calculos.sincronizados++;
        }

        // ─── Auto-create apontamento_dia ────────────────────────────────────
        if (totalHorasTrabalhadas > 0) {
          const { data: existingApontamento } = await supabase
            .from('apontamento_dia')
            .select('id, fonte_base, horas_base_dia, status')
            .eq('colaborador_id', colab.id)
            .eq('data', data)
            .maybeSingle();

          if (!existingApontamento) {
            const { error: insertErr } = await supabase
              .from('apontamento_dia')
              .insert({
                colaborador_id: colab.id,
                data,
                fonte_base: 'PONTO',
                horas_base_dia: totalHorasTrabalhadas,
                status: 'PENDENTE',
              });

            if (!insertErr) {
              counts.apontamentos.criados++;
            } else {
              console.error(`Erro insert apontamento_dia ${colab.id} ${data}:`, insertErr.message);
            }
          } else if (existingApontamento.fonte_base === 'PONTO') {
            if (existingApontamento.horas_base_dia !== totalHorasTrabalhadas) {
              const { error: updateErr } = await supabase
                .from('apontamento_dia')
                .update({
                  horas_base_dia: totalHorasTrabalhadas,
                  status: 'DIVERGENTE',
                })
                .eq('id', existingApontamento.id);

              if (!updateErr) {
                counts.apontamentos.atualizados++;
              } else {
                console.error(`Erro update apontamento_dia ${existingApontamento.id}:`, updateErr.message);
              }
            }
          }
          // Se fonte_base === 'MANUAL': nao toca
        }

        // ─── Auto-apontamento dias nao-produtivos (RN-12) ──────────────────
        const cargaHoraria = dbFields['carga_horaria'] || 0;

        if (tipoDia === 'FERIAS' && cargaHoraria > 0) {
          const { data: existingFerias } = await supabase
            .from('apontamento_dia')
            .select('id')
            .eq('colaborador_id', colab.id)
            .eq('data', data)
            .maybeSingle();

          if (!existingFerias) {
            const { data: apDia, error: apDiaErr } = await supabase
              .from('apontamento_dia')
              .insert({
                colaborador_id: colab.id,
                data,
                fonte_base: 'PONTO',
                horas_base_dia: cargaHoraria,
                status: 'CONCILIADO',
              })
              .select('id')
              .single();

            if (!apDiaErr && apDia) {
              await supabase
                .from('apontamento_item')
                .insert({
                  apontamento_dia_id: apDia.id,
                  projeto_id: PROJETO_FERIAS_ID,
                  horas: cargaHoraria,
                });

              counts.apontamentos.criados++;
            }
          }
        }

        if (tipoDia === 'ATESTADO' && cargaHoraria > 0) {
          const { data: existingAtestado } = await supabase
            .from('apontamento_dia')
            .select('id')
            .eq('colaborador_id', colab.id)
            .eq('data', data)
            .maybeSingle();

          if (!existingAtestado) {
            const { data: apDia, error: apDiaErr } = await supabase
              .from('apontamento_dia')
              .insert({
                colaborador_id: colab.id,
                data,
                fonte_base: 'PONTO',
                horas_base_dia: cargaHoraria,
                status: 'CONCILIADO',
              })
              .select('id')
              .single();

            if (!apDiaErr && apDia) {
              await supabase
                .from('apontamento_item')
                .insert({
                  apontamento_dia_id: apDia.id,
                  projeto_id: PROJETO_AFASTAMENTO_ID,
                  horas: cargaHoraria,
                });

              counts.apontamentos.criados++;
            }
          }
        }
      }
    } catch (err) {
      console.error(`Erro calculo CPF ${colab.cpf}:`, (err as Error).message);
    }
  }

  console.log(`Calculos: ${counts.calculos.sincronizados} sincronizados`);
  console.log(`Apontamentos: ${counts.apontamentos.criados} criados, ${counts.apontamentos.atualizados} atualizados`);
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  // Supabase admin client (service role) para todas as operacoes de DB
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Variavel para capturar body para uso no catch
  let parsedBody: SyncRequest | null = null;
  let userId = '';

  try {
    // ─── Validacao de autenticacao ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'Nao autorizado' }, 401);
    }

    // Validar JWT usando service role client (NÃO usar auth.admin.getUser — nao existe nesta versao do SDK)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ ok: false, error: 'Nao autorizado' }, 401);
    }

    userId = user.id;

    // Verificar roles: admin ou rh (usando service role client — sem RLS)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const hasPermission = roles?.some(
      (r: { role: string }) => r.role === 'admin' || r.role === 'rh' || r.role === 'super_admin'
    );
    if (!hasPermission) {
      return jsonResponse({ ok: false, error: 'Sem permissao para sincronizar dados Secullum' }, 403);
    }

    // ─── Parse body ──────────────────────────────────────────────────────────
    let body: SyncRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Dados de requisicao invalidos' }, 400);
    }
    parsedBody = body;

    if (!body.tipo || !['CRON', 'MANUAL'].includes(body.tipo)) {
      return jsonResponse({ ok: false, error: 'Tipo deve ser CRON ou MANUAL' }, 400);
    }

    // Validar etapa
    if (!body.etapa || !ETAPAS_VALIDAS.includes(body.etapa)) {
      return jsonResponse({
        ok: false,
        error: `Etapa obrigatoria. Valores validos: ${ETAPAS_VALIDAS.join(', ')}`,
      }, 400);
    }

    // Datas padrao: mes corrente se nao informadas
    const hoje = new Date();
    const dataInicio = body.dataInicio || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    const dataFim = body.dataFim || hoje.toISOString().substring(0, 10);

    console.log(`Iniciando sync Secullum etapa=${body.etapa} tipo=${body.tipo} periodo=${dataInicio} a ${dataFim}`);

    // ─── Rate limit check ─────────────────────────────────────────────────────
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentLogs } = await supabase
      .from('secullum_sync_log')
      .select('requests_utilizadas')
      .gte('created_at', oneHourAgo)
      .eq('status', 'SUCESSO');

    const totalRequestsLastHour = (recentLogs || [])
      .reduce((sum: number, log: { requests_utilizadas: number }) => sum + (log.requests_utilizadas || 0), 0);

    if (totalRequestsLastHour >= MAX_REQUESTS_PER_HOUR) {
      return jsonResponse({
        ok: false,
        error: `Limite de ${MAX_REQUESTS_PER_HOUR} requests/hora atingido (${totalRequestsLastHour} usadas). Tente novamente em alguns minutos.`,
        requestsUsed: totalRequestsLastHour,
        limit: MAX_REQUESTS_PER_HOUR,
      }, 429);
    }

    // ─── Duplicate check ──────────────────────────────────────────────────────
    const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
    const { data: recentSync } = await supabase
      .from('secullum_sync_log')
      .select('id, created_at')
      .eq('etapa', body.etapa)
      .eq('data_inicio', dataInicio)
      .eq('data_fim', dataFim)
      .eq('status', 'SUCESSO')
      .gte('created_at', twoHoursAgo)
      .limit(1);

    if (recentSync && recentSync.length > 0) {
      return jsonResponse({
        ok: false,
        error: `Etapa ${body.etapa} ja foi sincronizada para ${dataInicio} a ${dataFim} nas ultimas 2 horas.`,
        lastSync: recentSync[0].created_at,
      }, 409);
    }

    // ─── Credenciais Secullum ────────────────────────────────────────────────
    const SECULLUM_USERNAME = Deno.env.get('SECULLUM_USERNAME');
    const SECULLUM_PASSWORD = Deno.env.get('SECULLUM_PASSWORD');
    const SECULLUM_BANCO_ID = Deno.env.get('SECULLUM_BANCO_ID');

    if (!SECULLUM_USERNAME || !SECULLUM_PASSWORD || !SECULLUM_BANCO_ID) {
      console.error('Credenciais Secullum nao configuradas');
      return jsonResponse({ ok: false, error: 'Credenciais do Secullum nao configuradas' }, 500);
    }

    // ─── Autenticar no Secullum ──────────────────────────────────────────────
    const client = new SecullumClient(SECULLUM_USERNAME, SECULLUM_PASSWORD, SECULLUM_BANCO_ID);
    await client.autenticar();

    const counts = initCounts();

    // ─── Dispatch por etapa ──────────────────────────────────────────────────
    switch (body.etapa) {
      case 'FUNCIONARIOS':
        await stepFuncionarios(supabase, client, counts);
        break;
      case 'FOTOS':
        await stepFotos(supabase, client, counts);
        break;
      case 'AFASTAMENTOS':
        await stepAfastamentos(supabase, client, counts, dataInicio, dataFim);
        break;
      case 'CALCULOS':
        await stepCalculos(supabase, client, counts, dataInicio, dataFim, body.colaboradorIds);
        break;
    }

    // ─── Gravar log ─────────────────────────────────────────────────────────
    const duracaoMs = Date.now() - startTime;

    await supabase.from('secullum_sync_log').insert({
      tipo: body.tipo,
      etapa: body.etapa,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: 'SUCESSO',
      funcionarios_sincronizados: counts.funcionarios.sincronizados,
      funcionarios_criados: counts.funcionarios.criados,
      funcionarios_atualizados: counts.funcionarios.atualizados,
      funcionarios_ignorados: counts.funcionarios.ignorados,
      fotos_sincronizadas: counts.fotos.sincronizadas,
      afastamentos_sincronizados: counts.afastamentos.sincronizados,
      calculos_sincronizados: counts.calculos.sincronizados,
      apontamentos_criados: counts.apontamentos.criados,
      apontamentos_atualizados: counts.apontamentos.atualizados,
      requests_utilizadas: client.getRequestCount(),
      duracao_ms: duracaoMs,
      triggered_by: userId,
    });

    console.log(`Etapa ${body.etapa} concluida em ${duracaoMs}ms`);

    return jsonResponse({
      ok: true,
      data: counts,
      message: `Etapa ${body.etapa} concluida com sucesso`,
    });

  } catch (error) {
    // Em caso de erro, ainda registrar no log
    const duracaoMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    console.error('Erro na funcao secullum-sync:', errorMessage);

    try {
      await supabase.from('secullum_sync_log').insert({
        tipo: parsedBody?.tipo || 'ERRO',
        etapa: parsedBody?.etapa || null,
        status: 'ERRO',
        erro_mensagem: errorMessage,
        duracao_ms: duracaoMs,
        triggered_by: userId || null,
      });
    } catch (logErr) {
      console.error('Erro ao gravar log de erro:', (logErr as Error).message);
    }

    return jsonResponse({
      ok: false,
      error: 'Erro ao sincronizar dados do Secullum',
    }, 500);
  }
});
