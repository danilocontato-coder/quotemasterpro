import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Creating superadmin user...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const email = 'superadmin@quotemaster.com';
    const password = 'SuperAdmin2025!';
    const name = 'Super Admin';

    // Deletar usuário se já existe via Admin API
    const { data: listed } = await supabaseAdmin.auth.admin.listUsers();
    const existing = listed.users.find((u: any) => u.email === email);
    
    if (existing) {
      console.log('Deletando usuário existente (admin):', existing.id);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(existing.id);
      if (delErr) {
        console.error('Erro ao deletar usuário existente:', delErr);
        throw delErr;
      }
    }

    // Criar via Admin API com e-mail confirmado
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      console.error('Erro ao criar usuário auth:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado');
    }

    console.log('✅ Usuário auth criado:', authData.user.id);
    
    // E-mail já definido na criação do usuário; seguiremos para upsert do profile abaixo

    // Criar profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        name,
        role: 'admin',
        active: true,
        onboarding_completed: true
      });

    if (profileError) {
      console.error('Erro ao criar profile:', profileError);
      throw profileError;
    }

    console.log('✅ Profile criado');

    // Criar entrada na tabela users
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_user_id: authData.user.id,
        name,
        email,
        role: 'admin',
        status: 'active'
      }, {
        onConflict: 'auth_user_id'
      });

    if (usersError) {
      console.error('Erro ao criar user:', usersError);
      throw usersError;
    }

    console.log('✅ User criado');

    // Adicionar role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: authData.user.id,
        role: 'admin'
      }, {
        onConflict: 'user_id,role'
      });

    if (roleError) {
      console.error('Erro ao criar role:', roleError);
      throw roleError;
    }

    console.log('✅ Role criada');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Superadmin criado com sucesso!',
        userId: authData.user.id,
        email,
        password
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
