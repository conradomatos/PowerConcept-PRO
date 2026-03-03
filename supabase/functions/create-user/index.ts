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
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
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

    // Verificar se é admin
    const { data: callerRoles } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
    
    const isAdmin = callerRoles?.some(r => 
      r.role === 'admin' || r.role === 'super_admin'
    )
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate input
    let body: { email?: string; password?: string; fullName?: string; roles?: string[]; collaboratorId?: string };
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, fullName, roles, collaboratorId } = body;

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
        JSON.stringify({ error: 'Senha deve ter entre 8 e 128 caracteres' }),
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

    // Validate roles
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Pelo menos um papel é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate each role value
    const invalidRoles = roles.filter(r => !isValidRole(r));
    if (invalidRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Papel inválido' }),
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

    // Verificar se SUPER_ADMIN só pode ser atribuído por SUPER_ADMIN
    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin')
    if (roles.includes('super_admin') && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas Super Admins podem criar outros Super Admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente admin para operações privilegiadas
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

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

    // 2. Inserir roles
    for (const role of roles) {
      console.log(`Inserting role ${role} for user ${userId}`)
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({ user_id: userId, role })
      
      if (roleError) {
        console.error(`Error inserting role ${role}:`, roleError)
        // Continue with other roles even if one fails
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
        // User is created, just log the error
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
