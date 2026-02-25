import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    
    // Check if caller is admin (via JWT) or using service key header
    const serviceKeyHeader = req.headers.get('x-service-key')
    let isAuthorized = false

    if (serviceKeyHeader === serviceRoleKey) {
      isAuthorized = true
    } else if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user: caller } } = await userClient.auth.getUser()
      if (caller) {
        const { data: callerRoles } = await userClient
          .from('user_roles').select('role').eq('user_id', caller.id)
        isAuthorized = callerRoles?.some(r => r.role === 'admin' || r.role === 'super_admin') ?? false
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { userId, newPassword } = await req.json()
    if (!userId || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await adminClient.auth.admin.updateUser(userId, { password: newPassword })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
