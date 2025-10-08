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

    // Deletar usuário se já existe usando SQL direto
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (existingUser) {
      console.log('Deletando usuário existente:', existingUser.id);
      await supabaseAdmin.rpc('exec_sql', {
        sql: `DELETE FROM auth.users WHERE id = '${existingUser.id}'`
      }).catch(() => {
        // Ignorar erro se a função não existir
      });
    }

    // Usar signUp ao invés de admin API para evitar erro de schema
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: undefined
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário auth:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado');
    }

    console.log('✅ Usuário auth criado:', authData.user.id);
    
    // Atualizar email_confirmed diretamente via SQL
    await supabaseAdmin
      .from('profiles')
      .update({ email: email })
      .eq('id', authData.user.id);

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
