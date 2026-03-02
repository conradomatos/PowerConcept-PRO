-- ============================================
-- SISTEMA DE PERMISSÕES GRANULARES (RBAC)
-- Bloco A — Fases 1-2
-- ============================================

-- 1. MÓDULOS DO SISTEMA
CREATE TABLE IF NOT EXISTS system_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    route VARCHAR(200),
    parent_module_id UUID REFERENCES system_modules(id),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RECURSOS DENTRO DE CADA MÓDULO
CREATE TABLE IF NOT EXISTS system_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    route VARCHAR(200),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(module_id, code)
);

-- 3. AÇÕES POSSÍVEIS
CREATE TABLE IF NOT EXISTS system_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0
);

-- 4. PERMISSÕES = MÓDULO + RECURSO + AÇÃO
CREATE TABLE IF NOT EXISTS system_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES system_resources(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES system_actions(id) ON DELETE CASCADE,
    permission_key VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(module_id, resource_id, action_id),
    UNIQUE(permission_key)
);

-- 5. PERFIS (ROLES)
CREATE TABLE IF NOT EXISTS rbac_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    cloned_from UUID REFERENCES rbac_roles(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PERMISSÕES DO PERFIL
CREATE TABLE IF NOT EXISTS rbac_role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

-- 7. PERFIS DO USUÁRIO (NOVO — não conflita com user_roles existente)
CREATE TABLE IF NOT EXISTS rbac_user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- 8. OVERRIDE POR USUÁRIO
CREATE TABLE IF NOT EXISTS rbac_user_permission_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL,
    reason TEXT,
    granted_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, permission_id)
);

-- 9. LOG DE AUDITORIA
CREATE TABLE IF NOT EXISTS rbac_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ DEFAULT now(),
    ip_address INET
);


-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger updated_at para tabelas que têm
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar apenas se não existir (pode já existir no projeto)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_modules_updated_at') THEN
        CREATE TRIGGER update_system_modules_updated_at BEFORE UPDATE ON system_modules
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rbac_roles_updated_at') THEN
        CREATE TRIGGER update_rbac_roles_updated_at BEFORE UPDATE ON rbac_roles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;


-- ============================================
-- TRIGGER PARA GERAR permission_key AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION generate_permission_key()
RETURNS TRIGGER AS $$
DECLARE
    v_module_code VARCHAR;
    v_resource_code VARCHAR;
    v_action_code VARCHAR;
BEGIN
    SELECT code INTO v_module_code FROM system_modules WHERE id = NEW.module_id;
    SELECT code INTO v_action_code FROM system_actions WHERE id = NEW.action_id;

    IF NEW.resource_id IS NOT NULL THEN
        SELECT code INTO v_resource_code FROM system_resources WHERE id = NEW.resource_id;
        NEW.permission_key := v_module_code || '.' || v_resource_code || '.' || v_action_code;
    ELSE
        NEW.permission_key := v_module_code || '.' || v_action_code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_permission_key
    BEFORE INSERT OR UPDATE ON system_permissions
    FOR EACH ROW EXECUTE FUNCTION generate_permission_key();


-- ============================================
-- FUNCTION: PERMISSÕES EFETIVAS DO USUÁRIO
-- ============================================

-- Override false PREVALECE sobre qualquer role (segurança)
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    permission_id UUID,
    permission_key VARCHAR,
    module_code VARCHAR,
    resource_code VARCHAR,
    action_code VARCHAR,
    is_granted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH role_perms AS (
        -- Todas as permissões de todos os roles ativos do usuário
        SELECT DISTINCT
            sp.id AS permission_id,
            sp.permission_key,
            sm.code AS module_code,
            sr.code AS resource_code,
            sa.code AS action_code,
            rp.granted
        FROM rbac_user_roles ur
        JOIN rbac_role_permissions rp ON rp.role_id = ur.role_id
        JOIN system_permissions sp ON sp.id = rp.permission_id
        JOIN system_modules sm ON sm.id = sp.module_id
        LEFT JOIN system_resources sr ON sr.id = sp.resource_id
        JOIN system_actions sa ON sa.id = sp.action_id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
          AND sp.is_active = true
          AND sm.is_active = true
          AND rp.granted = true
    ),
    overrides AS (
        -- Overrides do usuário (podem conceder OU negar)
        SELECT
            upo.permission_id,
            upo.granted
        FROM rbac_user_permission_overrides upo
        WHERE upo.user_id = p_user_id
          AND (upo.expires_at IS NULL OR upo.expires_at > now())
    )
    SELECT
        rp.permission_id,
        rp.permission_key,
        rp.module_code,
        rp.resource_code,
        rp.action_code,
        -- Override NEGA prevalece. Override CONCEDE adiciona.
        CASE
            WHEN o.permission_id IS NOT NULL THEN o.granted
            ELSE rp.granted
        END AS is_granted
    FROM role_perms rp
    LEFT JOIN overrides o ON o.permission_id = rp.permission_id
    WHERE CASE
            WHEN o.permission_id IS NOT NULL THEN o.granted
            ELSE rp.granted
          END = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- FUNCTION: MÓDULOS VISÍVEIS (NAVBAR)
-- ============================================

CREATE OR REPLACE FUNCTION get_user_visible_modules(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    module_id UUID,
    code VARCHAR,
    name VARCHAR,
    icon VARCHAR,
    route VARCHAR,
    parent_module_id UUID,
    display_order INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        sm.id AS module_id,
        sm.code,
        sm.name,
        sm.icon,
        sm.route,
        sm.parent_module_id,
        sm.display_order
    FROM get_user_effective_permissions(p_user_id) uep
    JOIN system_modules sm ON sm.code = uep.module_code
    WHERE sm.is_active = true
    ORDER BY sm.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- Leitura: todos autenticados podem ler módulos, recursos, ações, permissões (são dados de referência)
CREATE POLICY "authenticated_read_modules" ON system_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_resources" ON system_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_actions" ON system_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_permissions" ON system_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_roles" ON rbac_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_role_perms" ON rbac_role_permissions FOR SELECT TO authenticated USING (true);

-- user_roles: usuário vê seus próprios; admin vê todos
CREATE POLICY "user_reads_own_roles" ON rbac_user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.usuarios.visualizar'
    ));

-- Escrita: apenas quem tem admin.roles.configurar ou admin.usuarios.configurar
CREATE POLICY "admin_manages_roles" ON rbac_roles
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.roles.configurar'
    ));

CREATE POLICY "admin_manages_role_perms" ON rbac_role_permissions
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.roles.configurar'
    ));

CREATE POLICY "admin_manages_user_roles" ON rbac_user_roles
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.usuarios.configurar'
    ));

CREATE POLICY "admin_updates_user_roles" ON rbac_user_roles
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.usuarios.configurar'
    ));

CREATE POLICY "admin_deletes_user_roles" ON rbac_user_roles
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.usuarios.configurar'
    ));

-- Overrides: apenas admin
CREATE POLICY "admin_manages_overrides" ON rbac_user_permission_overrides
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.permissoes.configurar'
    ));

-- Audit log: leitura por admin, inserção por todos (via trigger)
CREATE POLICY "admin_reads_audit" ON rbac_audit_log
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM get_user_effective_permissions(auth.uid()) WHERE permission_key = 'admin.auditoria.visualizar'
    ));

CREATE POLICY "system_inserts_audit" ON rbac_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);


-- ============================================
-- SEED: AÇÕES PADRÃO
-- ============================================
INSERT INTO system_actions (code, name, description, display_order) VALUES
    ('visualizar', 'Visualizar', 'Permite visualizar/ler dados', 1),
    ('criar', 'Criar', 'Permite criar novos registros', 2),
    ('editar', 'Editar', 'Permite editar registros existentes', 3),
    ('excluir', 'Excluir', 'Permite excluir registros', 4),
    ('aprovar', 'Aprovar', 'Permite aprovar/rejeitar itens', 5),
    ('exportar', 'Exportar', 'Permite exportar dados', 6),
    ('importar', 'Importar', 'Permite importar dados', 7),
    ('configurar', 'Configurar', 'Permite alterar configurações', 8)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED: MÓDULOS
-- ============================================
INSERT INTO system_modules (code, name, icon, route, display_order) VALUES
    ('home', 'Home', 'Home', '/home', 0),
    ('recursos', 'Recursos', 'Users', '/collaborators', 1),
    ('projetos', 'Projetos', 'FolderKanban', '/projetos', 2),
    ('orcamentos', 'Orçamentos', 'Calculator', '/orcamentos', 3),
    ('relatorios', 'Relatórios', 'BarChart3', '/dashboard', 4),
    ('financeiro', 'Financeiro', 'Wallet', '/financeiro/conciliacao', 5),
    ('frotas', 'Frotas', 'Truck', '/frotas', 6),
    ('ailab', 'AI Lab', 'Brain', '/ai-lab', 7),
    ('admin', 'Administração', 'Shield', '/admin', 8)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED: RECURSOS POR MÓDULO
-- ============================================
DO $$
DECLARE
    v_mod_recursos UUID;
    v_mod_projetos UUID;
    v_mod_orcamentos UUID;
    v_mod_relatorios UUID;
    v_mod_financeiro UUID;
    v_mod_frotas UUID;
    v_mod_ailab UUID;
    v_mod_admin UUID;
BEGIN
    SELECT id INTO v_mod_recursos FROM system_modules WHERE code = 'recursos';
    SELECT id INTO v_mod_projetos FROM system_modules WHERE code = 'projetos';
    SELECT id INTO v_mod_orcamentos FROM system_modules WHERE code = 'orcamentos';
    SELECT id INTO v_mod_relatorios FROM system_modules WHERE code = 'relatorios';
    SELECT id INTO v_mod_financeiro FROM system_modules WHERE code = 'financeiro';
    SELECT id INTO v_mod_frotas FROM system_modules WHERE code = 'frotas';
    SELECT id INTO v_mod_ailab FROM system_modules WHERE code = 'ailab';
    SELECT id INTO v_mod_admin FROM system_modules WHERE code = 'admin';

    -- RECURSOS
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_recursos, 'colaboradores', 'Colaboradores', '/collaborators', 1),
        (v_mod_recursos, 'custos_pessoal', 'Custos de Pessoal', '/recursos/custos', 2),
        (v_mod_recursos, 'importacao', 'Importação', '/import', 3)
    ON CONFLICT (module_id, code) DO NOTHING;

    -- PROJETOS
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_projetos, 'clientes', 'Clientes', '/empresas', 1),
        (v_mod_projetos, 'projeto', 'Projetos', '/projetos', 2),
        (v_mod_projetos, 'aprovacoes', 'Aprovações', '/aprovacoes-projetos', 3),
        (v_mod_projetos, 'planejamento', 'Planejamento', '/planejamento', 4),
        (v_mod_projetos, 'apontamento_diario', 'Apontamento Diário', '/apontamento-diario', 5),
        (v_mod_projetos, 'apontamentos', 'Apontamentos', '/apontamentos', 6),
        (v_mod_projetos, 'import_apontamentos', 'Importar Apontamentos', '/import-apontamentos', 7)
    ON CONFLICT (module_id, code) DO NOTHING;

    -- ORÇAMENTOS
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_orcamentos, 'orcamento', 'Orçamentos', '/orcamentos', 1),
        (v_mod_orcamentos, 'bases', 'Bases Globais', '/orcamentos/bases', 2)
    ON CONFLICT (module_id, code) DO NOTHING;

    -- RELATÓRIOS
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_relatorios, 'dashboard', 'Dashboard', '/dashboard', 1),
        (v_mod_relatorios, 'rentabilidade', 'Rentabilidade', '/rentabilidade', 2),
        (v_mod_relatorios, 'custos_margem', 'Custos & Margem', '/custos-projeto', 3)
    ON CONFLICT (module_id, code) DO NOTHING;

    -- FINANCEIRO
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_financeiro, 'conciliacao', 'Conciliação', '/financeiro/conciliacao', 1),
        (v_mod_financeiro, 'cartao_credito', 'Cartão de Crédito', '/financeiro/cartao-de-credito', 2),
        (v_mod_financeiro, 'categorias', 'Categorias', '/financeiro/categorias', 3),
        (v_mod_financeiro, 'dre', 'DRE', '/financeiro/dre', 4),
        (v_mod_financeiro, 'mapeamento', 'Mapeamento Omie', '/financeiro/mapeamento-categorias', 5)
    ON CONFLICT (module_id, code) DO NOTHING;

    -- FROTAS
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_frotas, 'dashboard_frotas', 'Dashboard', '/frotas', 1),
        (v_mod_frotas, 'veiculos', 'Veículos', '/frotas/veiculos', 2),
        (v_mod_frotas, 'km', 'KM Rodado', '/frotas/km', 3),
        (v_mod_frotas, 'abastecimentos', 'Abastecimentos', '/frotas/abastecimentos', 4),
        (v_mod_frotas, 'manutencao', 'Manutenção', '/frotas/manutencao', 5),
        (v_mod_frotas, 'custos_frota', 'Custos', '/frotas/custos', 6),
        (v_mod_frotas, 'relatorios_frota', 'Relatórios', '/frotas/relatorios', 7)
    ON CONFLICT (module_id, code) DO NOTHING;

    -- AI LAB
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_ailab, 'projetos_ia', 'Projetos IA', '/ai-lab', 1),
        (v_mod_ailab, 'agentes', 'Agentes', '/ai-lab/agents', 2),
        (v_mod_ailab, 'templates', 'Templates', '/ai-lab/templates', 3),
        (v_mod_ailab, 'configuracoes_ia', 'Configurações', '/ai-lab/settings', 4)
    ON CONFLICT (module_id, code) DO NOTHING;

    -- ADMIN
    INSERT INTO system_resources (module_id, code, name, route, display_order) VALUES
        (v_mod_admin, 'usuarios', 'Usuários', '/admin', 1),
        (v_mod_admin, 'roles', 'Perfis', '/admin/roles', 2),
        (v_mod_admin, 'permissoes', 'Permissões', '/admin/permissoes', 3),
        (v_mod_admin, 'auditoria', 'Auditoria', '/admin/auditoria', 4)
    ON CONFLICT (module_id, code) DO NOTHING;
END$$;

-- ============================================
-- SEED: GERAR PERMISSÕES (todas as combinações recurso × ação)
-- ============================================
-- O trigger gera o permission_key automaticamente
INSERT INTO system_permissions (module_id, resource_id, action_id, permission_key)
SELECT
    sr.module_id,
    sr.id AS resource_id,
    sa.id AS action_id,
    '' AS permission_key  -- trigger preenche
FROM system_resources sr
CROSS JOIN system_actions sa
ON CONFLICT (module_id, resource_id, action_id) DO NOTHING;

-- Permissões de módulo (sem recurso) para home
INSERT INTO system_permissions (module_id, resource_id, action_id, permission_key)
SELECT
    sm.id AS module_id,
    NULL AS resource_id,
    sa.id AS action_id,
    '' AS permission_key
FROM system_modules sm
CROSS JOIN system_actions sa
WHERE sm.code = 'home' AND sa.code = 'visualizar'
ON CONFLICT (module_id, resource_id, action_id) DO NOTHING;

-- ============================================
-- SEED: PERFIS PRÉ-DEFINIDOS
-- ============================================
INSERT INTO rbac_roles (code, name, description, is_system) VALUES
    ('super_admin', 'Super Admin', 'Acesso total ao sistema. Não pode ser excluído.', true),
    ('diretor', 'Diretor', 'Visualiza tudo + aprovações em projetos e financeiro.', false),
    ('gerente_projetos', 'Gerente de Projetos', 'Gestão completa de projetos e orçamentos.', false),
    ('engenheiro_campo', 'Engenheiro de Campo', 'Execução de OS, diário de obra, medições.', false),
    ('administrativo_rh', 'Administrativo / RH', 'Cadastro de colaboradores e documentos.', false),
    ('financeiro', 'Financeiro', 'Contas a pagar/receber, fluxo de caixa, DRE.', false),
    ('consultor_externo', 'Consultor Externo', 'Somente leitura em projetos.', false),
    ('operador_frotas', 'Operador de Frotas', 'Gestão de veículos e abastecimentos.', false)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED: ATRIBUIR TODAS AS PERMISSÕES AO SUPER ADMIN
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT
    r.id,
    sp.id,
    true
FROM rbac_roles r
CROSS JOIN system_permissions sp
WHERE r.code = 'super_admin'
  AND sp.is_active = true
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: PERMISSÕES DO PERFIL "FINANCEIRO"
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT r.id, sp.id, true
FROM rbac_roles r
JOIN system_permissions sp ON (
    sp.permission_key LIKE 'financeiro.%'
    OR sp.permission_key LIKE 'relatorios.%.visualizar'
    OR sp.permission_key = 'home.visualizar'
)
WHERE r.code = 'financeiro'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: PERMISSÕES DO PERFIL "GERENTE DE PROJETOS"
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT r.id, sp.id, true
FROM rbac_roles r
JOIN system_permissions sp ON (
    sp.permission_key LIKE 'projetos.%'
    OR sp.permission_key LIKE 'orcamentos.%'
    OR sp.permission_key LIKE 'recursos.%.visualizar'
    OR sp.permission_key LIKE 'relatorios.%'
    OR sp.permission_key = 'home.visualizar'
)
WHERE r.code = 'gerente_projetos'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: PERMISSÕES DO PERFIL "ADMINISTRATIVO / RH"
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT r.id, sp.id, true
FROM rbac_roles r
JOIN system_permissions sp ON (
    sp.permission_key LIKE 'recursos.%'
    OR sp.permission_key LIKE 'relatorios.%.visualizar'
    OR sp.permission_key = 'home.visualizar'
)
WHERE r.code = 'administrativo_rh'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: PERMISSÕES DO PERFIL "OPERADOR DE FROTAS"
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT r.id, sp.id, true
FROM rbac_roles r
JOIN system_permissions sp ON (
    sp.permission_key LIKE 'frotas.%'
    OR sp.permission_key = 'home.visualizar'
)
WHERE r.code = 'operador_frotas'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: PERMISSÕES DO PERFIL "CONSULTOR EXTERNO"
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT r.id, sp.id, true
FROM rbac_roles r
JOIN system_permissions sp ON (
    sp.permission_key LIKE 'projetos.%.visualizar'
    OR sp.permission_key = 'home.visualizar'
)
WHERE r.code = 'consultor_externo'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: PERMISSÕES DO PERFIL "ENGENHEIRO DE CAMPO"
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT r.id, sp.id, true
FROM rbac_roles r
JOIN system_permissions sp ON (
    sp.permission_key LIKE 'projetos.%'
    AND sp.permission_key NOT LIKE '%.configurar'
    OR sp.permission_key LIKE 'recursos.colaboradores.visualizar'
    OR sp.permission_key = 'home.visualizar'
)
WHERE r.code = 'engenheiro_campo'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- SEED: PERMISSÕES DO PERFIL "DIRETOR"
-- ============================================
INSERT INTO rbac_role_permissions (role_id, permission_id, granted)
SELECT r.id, sp.id, true
FROM rbac_roles r
JOIN system_permissions sp ON (
    sp.permission_key LIKE '%.visualizar'
    OR sp.permission_key LIKE '%.exportar'
    OR sp.permission_key LIKE '%.aprovar'
    OR sp.permission_key = 'home.visualizar'
)
WHERE r.code = 'diretor'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- MIGRAR USUÁRIOS DO SISTEMA ANTIGO PARA O NOVO
-- ============================================
-- Mapeia os papéis antigos (user_roles.role) para os novos rbac_roles
INSERT INTO rbac_user_roles (user_id, role_id, assigned_by)
SELECT
    ur.user_id,
    r.id AS role_id,
    ur.user_id AS assigned_by  -- auto-atribuição na migração
FROM user_roles ur
JOIN rbac_roles r ON (
    CASE ur.role
        WHEN 'super_admin' THEN 'super_admin'
        WHEN 'admin' THEN 'super_admin'  -- admin vira super_admin no novo sistema
        WHEN 'rh' THEN 'administrativo_rh'
        WHEN 'financeiro' THEN 'financeiro'
        WHEN 'catalog_manager' THEN 'gerente_projetos'  -- catalog_manager mapeia para gerente
    END = r.code
)
ON CONFLICT (user_id, role_id) DO NOTHING;
