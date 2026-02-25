

# Fix: User Creation + Build Errors (Frotas Types)

## Diagnostico

Identifiquei 3 problemas:

### 1. Criacao de usuarios nao funciona corretamente
- O usuario `sandro@conceptengenharia.com.br` (id: `43e376d7`) existe no `profiles` mas NAO tem nenhum registro em `user_roles` -- por isso aparece "Sem Papeis" e cai em "Acesso Pendente" ao logar
- A Edge Function `create-user` tinha ZERO logs (nunca foi chamada com sucesso) -- ja foi deployada agora
- A politica RLS de `user_roles` so permite `admin`, mas NAO `super_admin`. Se o admin logado so tem role `super_admin` (sem `admin` separado), ele nao consegue inserir roles via RLS

### 2. Build errors nos componentes de Frotas
- As tabelas `veiculos`, `abastecimentos`, `registros_km`, `despesas_deslocamento`, `manutencoes`, `plano_manutencao` existem no banco de dados mas NAO estao no arquivo `types.ts` auto-gerado
- Isso causa ~50 erros de TypeScript em 13 arquivos da pasta `frotas`
- O arquivo `types.ts` nao pode ser editado manualmente

### 3. Sandro sem roles (fix imediato)
- Precisa inserir role para o usuario sandro diretamente via migration

---

## Alteracoes

### 1. Migration: Corrigir RLS de user_roles + inserir role do Sandro

Criar migration SQL:

```sql
-- Corrigir politica RLS para incluir super_admin
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Inserir role admin para o sandro (que esta sem papeis)
INSERT INTO public.user_roles (user_id, role)
VALUES ('43e376d7-a6d3-4b50-a927-5c510ba534e6', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. Helper para tabelas Frotas sem types

**Novo arquivo:** `src/lib/frotas/supabase-helpers.ts`

Criar funcao `frotasFrom(table)` que faz `(supabase as any).from(table)` para as tabelas de frotas nao tipadas.

### 3. Atualizar componentes Frotas para usar helper

**13 arquivos afetados** (6 componentes + 7 paginas):

Componentes:
- `src/components/frotas/AbastecimentoForm.tsx`
- `src/components/frotas/DespesaDeslocamentoForm.tsx`
- `src/components/frotas/KmRegistroForm.tsx`
- `src/components/frotas/VeiculoForm.tsx`
- `src/components/frotas/ManutencaoForm.tsx`
- `src/components/frotas/PlanoManutencaoForm.tsx`

Paginas:
- `src/pages/frotas/Abastecimentos.tsx`
- `src/pages/frotas/FrotasCustos.tsx`
- `src/pages/frotas/FrotasDashboard.tsx`
- `src/pages/frotas/FrotasRelatorios.tsx`
- `src/pages/frotas/KmRodado.tsx`
- `src/pages/frotas/Manutencao.tsx`
- `src/pages/frotas/Veiculos.tsx`

Em cada arquivo, substituir `supabase.from('veiculos')` por `frotasFrom('veiculos')` (e idem para as outras tabelas frotas). Adicionar import do helper.

### 4. Edge Function create-user

Ja foi deployada com sucesso. Nenhuma alteracao de codigo necessaria.

---

## Resumo

| Item | Acao |
|------|------|
| RLS user_roles | Migration: adicionar super_admin a politica |
| Sandro sem papel | Migration: INSERT role admin |
| Edge Function | Ja deployada |
| Build errors frotas | Helper + refactor de 13 arquivos |

