-- Migration: Módulo Gestão de Frotas
-- Cria todas as tabelas necessárias para o módulo de frotas com RLS habilitado

-- ============================================================
-- 1. VEÍCULOS
-- ============================================================
CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  apelido VARCHAR(50),
  modelo VARCHAR(100),
  ano INTEGER,
  valor_compra DECIMAL(12,2),
  data_compra DATE,
  vida_util_meses INTEGER DEFAULT 60,
  km_atual INTEGER DEFAULT 0,
  projeto_atual_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'em_manutencao', 'inativo')),
  tipo_combustivel VARCHAR(30),
  media_km_litro_ref DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view veiculos"
  ON public.veiculos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert veiculos"
  ON public.veiculos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update veiculos"
  ON public.veiculos FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete veiculos"
  ON public.veiculos FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_veiculos_updated_at
  BEFORE UPDATE ON public.veiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. REGISTROS DE KM
-- ============================================================
CREATE TABLE public.registros_km (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('saida', 'volta')),
  km_registrado INTEGER NOT NULL,
  km_calculado INTEGER,
  foto_odometro_url TEXT,
  data_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  origem_whatsapp BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.registros_km ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view registros_km"
  ON public.registros_km FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert registros_km"
  ON public.registros_km FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update registros_km"
  ON public.registros_km FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete registros_km"
  ON public.registros_km FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_registros_km_updated_at
  BEFORE UPDATE ON public.registros_km
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. ABASTECIMENTOS
-- ============================================================
CREATE TABLE public.abastecimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  km_atual INTEGER,
  litros DECIMAL(8,2),
  valor_total DECIMAL(10,2),
  preco_litro DECIMAL(6,3),
  km_por_litro DECIMAL(5,2),
  tipo_combustivel VARCHAR(30),
  posto_nome VARCHAR(200),
  posto_cnpj VARCHAR(20),
  posto_cidade VARCHAR(100),
  chave_nfce VARCHAR(50),
  forma_pagamento VARCHAR(50),
  ultimos_digitos_cartao VARCHAR(4),
  encerrante_inicial DECIMAL(12,3),
  encerrante_final DECIMAL(12,3),
  foto_cupom_url TEXT,
  dados_nfce_json JSONB,
  data_abastecimento TIMESTAMP WITH TIME ZONE,
  conciliado_omie BOOLEAN DEFAULT false,
  omie_lancamento_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view abastecimentos"
  ON public.abastecimentos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert abastecimentos"
  ON public.abastecimentos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update abastecimentos"
  ON public.abastecimentos FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete abastecimentos"
  ON public.abastecimentos FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_abastecimentos_updated_at
  BEFORE UPDATE ON public.abastecimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. MANUTENÇÕES
-- ============================================================
CREATE TABLE public.manutencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('troca_oleo', 'pneus', 'revisao', 'freios', 'correia', 'filtros', 'outro')),
  descricao TEXT,
  km_previsto INTEGER,
  km_realizado INTEGER,
  valor DECIMAL(10,2),
  fornecedor VARCHAR(200),
  status TEXT DEFAULT 'programada' CHECK (status IN ('programada', 'atencao', 'vencida', 'critica', 'concluida')),
  data_prevista DATE,
  data_realizada DATE,
  comprovante_url TEXT,
  alertas_enviados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view manutencoes"
  ON public.manutencoes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert manutencoes"
  ON public.manutencoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update manutencoes"
  ON public.manutencoes FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete manutencoes"
  ON public.manutencoes FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_manutencoes_updated_at
  BEFORE UPDATE ON public.manutencoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. MULTAS DE VEÍCULO
-- ============================================================
CREATE TABLE public.multas_veiculo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  valor DECIMAL(10,2),
  tipo VARCHAR(100),
  data_infracao DATE,
  data_vencimento DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'contestada')),
  comprovante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.multas_veiculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view multas_veiculo"
  ON public.multas_veiculo FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert multas_veiculo"
  ON public.multas_veiculo FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update multas_veiculo"
  ON public.multas_veiculo FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete multas_veiculo"
  ON public.multas_veiculo FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_multas_veiculo_updated_at
  BEFORE UPDATE ON public.multas_veiculo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. DESPESAS DE DESLOCAMENTO
-- ============================================================
CREATE TABLE public.despesas_deslocamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pedagio', 'estacionamento', 'lavagem', 'outro')),
  valor DECIMAL(10,2),
  descricao TEXT,
  comprovante_url TEXT,
  data_despesa DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.despesas_deslocamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view despesas_deslocamento"
  ON public.despesas_deslocamento FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert despesas_deslocamento"
  ON public.despesas_deslocamento FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update despesas_deslocamento"
  ON public.despesas_deslocamento FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete despesas_deslocamento"
  ON public.despesas_deslocamento FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_despesas_deslocamento_updated_at
  BEFORE UPDATE ON public.despesas_deslocamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. PLANO DE MANUTENÇÃO
-- ============================================================
CREATE TABLE public.plano_manutencao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('troca_oleo', 'pneus', 'revisao', 'freios', 'correia', 'filtros', 'outro')),
  intervalo_km INTEGER,
  intervalo_meses INTEGER,
  ultimo_km INTEGER,
  ultima_data DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plano_manutencao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plano_manutencao"
  ON public.plano_manutencao FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert plano_manutencao"
  ON public.plano_manutencao FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update plano_manutencao"
  ON public.plano_manutencao FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete plano_manutencao"
  ON public.plano_manutencao FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_plano_manutencao_updated_at
  BEFORE UPDATE ON public.plano_manutencao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. CONFIGURAÇÃO DE DEPRECIAÇÃO
-- ============================================================
CREATE TABLE public.depreciacao_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL UNIQUE REFERENCES public.veiculos(id) ON DELETE CASCADE,
  metodo TEXT DEFAULT 'linear' CHECK (metodo IN ('linear', 'uso')),
  valor_residual DECIMAL(12,2) DEFAULT 0,
  depreciacao_mensal DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.depreciacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view depreciacao_config"
  ON public.depreciacao_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert depreciacao_config"
  ON public.depreciacao_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update depreciacao_config"
  ON public.depreciacao_config FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete depreciacao_config"
  ON public.depreciacao_config FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER update_depreciacao_config_updated_at
  BEFORE UPDATE ON public.depreciacao_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_veiculos_placa ON public.veiculos(placa);
CREATE INDEX idx_veiculos_status ON public.veiculos(status);
CREATE INDEX idx_veiculos_projeto_atual ON public.veiculos(projeto_atual_id);

CREATE INDEX idx_registros_km_veiculo ON public.registros_km(veiculo_id);
CREATE INDEX idx_registros_km_colaborador ON public.registros_km(colaborador_id);
CREATE INDEX idx_registros_km_projeto ON public.registros_km(projeto_id);
CREATE INDEX idx_registros_km_data ON public.registros_km(data_registro);

CREATE INDEX idx_abastecimentos_veiculo ON public.abastecimentos(veiculo_id);
CREATE INDEX idx_abastecimentos_data ON public.abastecimentos(data_abastecimento);
CREATE INDEX idx_abastecimentos_projeto ON public.abastecimentos(projeto_id);

CREATE INDEX idx_manutencoes_veiculo ON public.manutencoes(veiculo_id);
CREATE INDEX idx_manutencoes_status ON public.manutencoes(status);
CREATE INDEX idx_manutencoes_data_prevista ON public.manutencoes(data_prevista);

CREATE INDEX idx_multas_veiculo_veiculo ON public.multas_veiculo(veiculo_id);
CREATE INDEX idx_multas_veiculo_status ON public.multas_veiculo(status);

CREATE INDEX idx_despesas_deslocamento_veiculo ON public.despesas_deslocamento(veiculo_id);
CREATE INDEX idx_despesas_deslocamento_projeto ON public.despesas_deslocamento(projeto_id);
CREATE INDEX idx_despesas_deslocamento_data ON public.despesas_deslocamento(data_despesa);

CREATE INDEX idx_plano_manutencao_veiculo ON public.plano_manutencao(veiculo_id);

CREATE INDEX idx_depreciacao_config_veiculo ON public.depreciacao_config(veiculo_id);
