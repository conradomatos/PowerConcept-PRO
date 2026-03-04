import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Valid role values
const VALID_ROLES = ['admin', 'rh', 'financeiro', 'super_admin', 'catalog_manager'] as const;
type AppRole = typeof VALID_ROLES[number];

// Input validation helpers
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 255 && emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
  // Aceitar PIN de 6 dígitos OU senha tradicional (retrocompatibilidade)
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
}

function isValidRole(role: string): role is AppRole {
  return VALID_ROLES.includes(role as AppRole);
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('duplicate') || msg.includes('already exists')) {
      return 'Este email já está cadastrado';
    }
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return 'Referência inválida';
    }
    if (msg.includes('permission') || msg.includes('denied')) {
      return 'Sem permissão para esta operação';
    }
    if (msg.includes('invalid') && msg.includes('email')) {
      return 'Email inválido';
    }
  }
  return 'Erro ao processar requisição';
}

// Mapeamento RBAC → legado para compatibilidade
const RBAC_TO_LEGACY: Record<string, string[]> = {
  'god_mode': ['super_admin', 'admin'],
  'diretor': ['admin'],
  'gerente_projetos': ['admin'],
  'administrativo_rh': ['rh'],
  'financeiro': ['financeiro'],
  'engenheiro_campo': ['admin'],
  'operador_frotas': ['admin'],
  'consultor_externo': ['admin'],
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar se o chamador é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Cliente com token do usuário para verificar permissões
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser } } = await userClient.auth.getUser()
    if (!callerUser) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin (RBAC OU legado)
    const { data: callerRoles } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)

    const { data: callerRbac } = await userClient
      .from('rbac_user_roles')
      .select('rbac_roles(code)')
      .eq('user_id', callerUser.id)
      .eq('is_active', true)

    const isAdminLegacy = callerRoles?.some(r =>
      r.role === 'admin' || r.role === 'super_admin'
    )
    const isAdminRbac = callerRbac?.some((r: any) =>
      ['god_mode', 'diretor', 'gerente_projetos'].includes(r.rbac_roles?.code)
    )

    if (!isAdminLegacy && !isAdminRbac) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isGodMode = callerRoles?.some(r => r.role === 'super_admin') ||
      callerRbac?.some((r: any) => r.rbac_roles?.code === 'god_mode')

    // Parse and validate input
    let body: {
      email?: string;
      password?: string;
      fullName?: string;
      rbacRoleId?: string;
      roles?: string[];
      collaboratorId?: string;
      username?: string;
    };
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, fullName, rbacRoleId, roles, collaboratorId, username } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password
    if (!password || !isValidPassword(password)) {
      return new Response(
        JSON.stringify({ error: 'PIN deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate fullName
    if (fullName && (typeof fullName !== 'string' || fullName.length > 100)) {
      return new Response(
        JSON.stringify({ error: 'Nome inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Roles legado agora é opcional (se rbacRoleId fornecido)
    if (!rbacRoleId && (!roles || !Array.isArray(roles) || roles.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Perfil de acesso é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se roles legado fornecido, validar
    if (roles && roles.length > 0) {
      const invalidRoles = roles.filter(r => !isValidRole(r));
      if (invalidRoles.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Papel inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validar rbacRoleId se fornecido
    if (rbacRoleId && !isValidUUID(rbacRoleId)) {
      return new Response(
        JSON.stringify({ error: 'ID de perfil inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate collaboratorId if provided
    if (collaboratorId && !isValidUUID(collaboratorId)) {
      return new Response(
        JSON.stringify({ error: 'ID do colaborador inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente admin para operações privilegiadas
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // God Mode só pode ser atribuído por God Mode
    if (rbacRoleId) {
      const { data: targetRole } = await adminClient
        .from('rbac_roles')
        .select('code')
        .eq('id', rbacRoleId)
        .single()

      if (targetRole?.code === 'god_mode' && !isGodMode) {
        return new Response(
          JSON.stringify({ error: 'Apenas God Mode pode atribuir God Mode a outros usuários' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Verificar super_admin legado só pode ser atribuído por super_admin/god_mode
    if (roles?.includes('super_admin') && !isGodMode) {
      return new Response(
        JSON.stringify({ error: 'Apenas Super Admins podem criar outros Super Admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Criar usuário via Admin API (não faz login)
    console.log(`Creating user with email: ${email}`)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: sanitizeErrorMessage(createError) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Falha ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = newUser.user.id
    console.log(`User created with ID: ${userId}`)

    // 2. Inserir perfil RBAC + roles legado de compatibilidade
    if (rbacRoleId) {
      console.log(`Inserting RBAC role ${rbacRoleId} for user ${userId}`)
      const { error: rbacError } = await adminClient
        .from('rbac_user_roles')
        .insert({
          user_id: userId,
          role_id: rbacRoleId,
          assigned_by: callerUser.id,
          is_active: true,
        })

      if (rbacError) {
        console.error('Error inserting RBAC role:', rbacError)
      }

      // Mapeamento RBAC → legado para compatibilidade
      const { data: roleData } = await adminClient
        .from('rbac_roles')
        .select('code')
        .eq('id', rbacRoleId)
        .single()

      if (roleData?.code) {
        const legacyRoles = RBAC_TO_LEGACY[roleData.code] || ['admin']
        for (const role of legacyRoles) {
          const { error: legacyError } = await adminClient
            .from('user_roles')
            .insert({ user_id: userId, role })

          if (legacyError) {
            console.error(`Error inserting legacy role ${role}:`, legacyError)
          }
        }
      }
    }

    // Se roles legado foram passados diretamente (sem rbacRoleId), inserir normalmente
    if (roles && roles.length > 0 && !rbacRoleId) {
      for (const role of roles) {
        console.log(`Inserting legacy role ${role} for user ${userId}`)
        const { error: roleError } = await adminClient
          .from('user_roles')
          .insert({ user_id: userId, role })
        if (roleError) {
          console.error(`Error inserting role ${role}:`, roleError)
        }
      }
    }

    // 3. Vincular colaborador
    if (collaboratorId) {
      console.log(`Linking collaborator ${collaboratorId} to user ${userId}`)
      const { error: linkError } = await adminClient
        .from('collaborators')
        .update({ user_id: userId })
        .eq('id', collaboratorId)

      if (linkError) {
        console.error('Error linking collaborator:', linkError)
      }
    }

    // 4. Atualizar username em profiles (se fornecido)
    if (username) {
      console.log(`Setting username '${username}' for user ${userId}`)
      const { error: usernameError } = await adminClient
        .from('profiles')
        .update({ username })
        .eq('user_id', userId)

      if (usernameError) {
        console.error('Error setting username:', usernameError)
      }
    }

    console.log('User creation completed successfully')
    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: sanitizeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
