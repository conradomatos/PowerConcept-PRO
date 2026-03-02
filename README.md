# PowerConcept

Plataforma de Gestão de Projetos e Portfólio para construção civil.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS + Recharts |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions + Storage) |
| ERP | Omie (financeiro, NFs, conciliação) |
| Infra | Hostinger VPS + Docker + Caddy |

## Módulos

- **Home** — Dashboard de entrada
- **Recursos** — Colaboradores, custos pessoais, importação Secullum
- **Projetos** — Projetos, empresas, planejamento, apontamento diário
- **Orçamentos** — Orçamentos detalhados com composições, BDI, MO
- **Relatórios** — Dashboard gerencial, custos por projeto, rentabilidade
- **Financeiro** — DRE, conciliação bancária, cartão de crédito, categorias Omie
- **Frotas** — Veículos, abastecimentos, KM, manutenção, custos, relatórios
- **AI Lab** — Agentes IA especializados para construção civil

## Estrutura do código

```
src/
├── calculations/            # Fórmulas e cálculos puros (análogo ao Power Query)
├── rules/                   # Regras de negócio, constantes, alíquotas
├── services/                # Integrações externas (Omie, storage)
├── components/              # Componentes React por módulo
├── hooks/                   # Custom hooks (useQuery/useMutation)
├── pages/                   # Páginas por módulo
├── lib/                     # Utilitários de UI (formatação, validação)
└── integrations/            # Cliente Supabase e types
    supabase/
    ├── functions/           # Edge Functions (create-user, omie-*, generate-pdf)
    └── migrations/          # 79 migrations SQL

backend/
└── whatsapp-bot/           # Bot WhatsApp (Python/FastAPI)
```

## Setup local

```bash
git clone https://github.com/conradomatos/POWERCONCEPT_LOVEBLE.git
cd POWERCONCEPT_LOVEBLE

cp .env.example .env   # preencher com suas credenciais Supabase

npm install
npm run dev            # http://localhost:8080
```

## Variáveis de ambiente

```
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## Deploy

O projeto usa Docker + Nginx para deploy:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sua_key \
  -t powerconcept .

docker run -p 80:80 powerconcept
```

## Workflow de desenvolvimento

1. **Briefings técnicos** → Claude Code implementa em branch `claude/*`
2. **PR no GitHub** → review → merge em `main`
3. **Migrations SQL** → executar manualmente no Supabase SQL Editor
4. **Edge Functions** → deploy via Supabase Dashboard

---

## Licença

Proprietary — Concept Engenharia
