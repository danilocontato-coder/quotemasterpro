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

    // Deletar usuário existente se houver
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === 'superadmin@quotemaster.com');
    
    if (existingUser) {
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      console.log('Usuário existente deletado:', existingUser.id);
    }

    // Criar novo usuário
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'superadmin@quotemaster.com',
      password: 'SuperAdmin2025!',
      email_confirm: true,
      user_metadata: {
        name: 'Super Admin'
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário auth:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const userId = authData.user.id;
    console.log('Usuário auth criado:', userId);

    // Criar profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: 'superadmin@quotemaster.com',
        name: 'Super Admin',
        role: 'admin',
        active: true,
        onboarding_completed: true
      });

    if (profileError) {
      console.error('Erro ao criar profile:', profileError);
    }

    // Criar registro na tabela users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_user_id: userId,
        name: 'Super Admin',
        email: 'superadmin@quotemaster.com',
        role: 'admin',
        status: 'active'
      }, {
        onConflict: 'auth_user_id'
      });

    if (userError) {
      console.error('Erro ao criar user:', userError);
    }

    // Criar role admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin'
      }, {
        onConflict: 'user_id,role'
      });

    if (roleError) {
      console.error('Erro ao criar role:', roleError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Superadmin criado com sucesso!',
        email: 'superadmin@quotemaster.com',
        userId: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
