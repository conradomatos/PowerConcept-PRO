# PowerConcept WhatsApp Bot — Gestão de Frotas

Bot WhatsApp estruturado (sem AI no fluxo principal) para colaboradores de campo registrarem dados de frotas diretamente pelo WhatsApp.

## Arquitetura

```
Colaborador (WhatsApp)
    ↓
Evolution API (Docker, porta 8080)
    ↓ webhook POST
Bot Python (FastAPI, porta 8001)
    ├── State machine (gerencia fluxo da conversa)
    ├── Menus numéricos (1, 2, 3...)
    ├── pyzbar → lê QR Code de fotos de cupom fiscal
    ├── requests + BeautifulSoup → consulta SEFAZ (NFC-e)
    ├── Whisper API (OpenAI) → transcreve áudios
    └── Supabase Python SDK → salva nas tabelas existentes
    ↓
Supabase (mesmo banco do PowerConcept)
```

## Fluxos Disponíveis

| # | Fluxo | Descrição |
|---|-------|-----------|
| 1 | KM | Registrar quilometragem de saída/volta |
| 2 | Abastecimento | Foto do cupom fiscal com extração automática via QR Code |
| 3 | Despesa | Pedágio, estacionamento, lavagem, etc. |
| 4 | Apontamento | Registrar atividades (texto ou áudio com transcrição) |
| 5 | Comprovante | Enviar notas fiscais e recibos |

## Pré-requisitos

- Python 3.11+
- Docker (para Evolution API)
- libzbar0 (`sudo apt-get install -y libzbar0`)
- Conta Supabase com service_role key
- Conta OpenAI (para Whisper)

## Setup Local

```bash
cd backend/whatsapp-bot

# Criar virtualenv
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com valores reais

# Rodar
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Deploy no VPS

### 1. Evolution API (Docker)

```bash
cd deploy/
# Editar evolution.env com API key segura
docker compose up -d
```

### 2. Bot (systemd)

```bash
cd /root/POWERCONCEPT_LOVEBLE/backend/whatsapp-bot

# Criar venv e instalar deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configurar .env
cp .env.example .env
nano .env

# Instalar service
sudo cp deploy/whatsapp-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-bot
sudo systemctl start whatsapp-bot
```

### 3. Caddy (reverse proxy)

Adicionar ao `/etc/caddy/Caddyfile`:

```
evolution.powerconcept.com.br {
    reverse_proxy 127.0.0.1:8080
}

bot.powerconcept.com.br {
    reverse_proxy 127.0.0.1:8001
}
```

```bash
systemctl reload caddy
```

### 4. DNS

Criar registros A no painel Hostinger:
- `evolution` → 72.60.13.91
- `bot` → 72.60.13.91

### 5. Conectar WhatsApp

```bash
# Criar instância
curl -X POST https://evolution.powerconcept.com.br/instance/create \
  -H "apikey: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"powerconcept-frotas","integration":"WHATSAPP-BAILEYS","qrcode":true}'

# Obter QR Code
curl https://evolution.powerconcept.com.br/instance/connect/powerconcept-frotas \
  -H "apikey: SUA_API_KEY"

# Escanear QR Code com o celular
```

## Migration SQL

Executar no SQL Editor do Supabase:

```sql
-- Coluna de WhatsApp na tabela collaborators
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
CREATE INDEX IF NOT EXISTS idx_collaborators_whatsapp ON collaborators(whatsapp_number);

-- Tabela de sessões do bot
CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    collaborator_id UUID REFERENCES collaborators(id),
    verification_code TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage bot_sessions"
    ON bot_sessions FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
```

## Estrutura de Pastas

```
backend/whatsapp-bot/
├── main.py                     # FastAPI app (porta 8001)
├── config.py                   # Configurações (env vars)
├── requirements.txt            # Dependências Python
├── .env.example                # Template de variáveis
├── README.md                   # Este arquivo
├── flows/                      # Fluxos de conversa
│   ├── base.py                 # State machine + menus
│   ├── flow_km.py              # Fluxo 1: Registrar KM
│   ├── flow_abastecimento.py   # Fluxo 2: Abastecimento
│   ├── flow_despesa.py         # Fluxo 3: Despesa
│   ├── flow_apontamento.py     # Fluxo 4: Apontamento
│   └── flow_comprovante.py     # Fluxo 5: Comprovante/NF
├── services/                   # Serviços externos
│   ├── supabase_client.py      # Cliente Supabase (service_role)
│   ├── evolution_api.py        # Cliente Evolution API
│   ├── qrcode_nfce.py          # QR Code + consulta SEFAZ
│   ├── whisper_service.py      # Transcrição de áudio
│   └── alertas.py              # Alertas proativos (scheduler)
├── models/                     # Schemas
│   └── schemas.py              # Pydantic models
└── deploy/                     # Arquivos de deploy
    ├── docker-compose.yml      # Evolution API
    ├── evolution.env            # Env vars Evolution
    └── whatsapp-bot.service    # systemd unit
```

## Portas

| Serviço | Porta | Domínio |
|---------|-------|---------|
| Motor IA (existente) | 8000 | ia.powerconcept.com.br |
| Evolution API | 8080 | evolution.powerconcept.com.br |
| WhatsApp Bot | 8001 | bot.powerconcept.com.br |

## Health Check

```bash
curl https://bot.powerconcept.com.br/health
# {"status":"ok","service":"PowerConcept WhatsApp Bot"}
```
