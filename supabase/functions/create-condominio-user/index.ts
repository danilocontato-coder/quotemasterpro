import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gerar senha temporária forte
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { condominioId, condominioName, condominioEmail, administradoraName } = await req.json();

    console.log('🏗️ [create-condominio-user] Iniciando criação de usuário para:', condominioEmail);

    // Validações
    if (!condominioId || !condominioName || !condominioEmail) {
      throw new Error('Dados incompletos: condominioId, condominioName e condominioEmail são obrigatórios');
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.some(u => u.email?.toLowerCase() === condominioEmail.toLowerCase());

    if (userExists) {
      console.log('⚠️ [create-condominio-user] Usuário já existe para este email');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Este email já está cadastrado no sistema' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Gerar senha temporária
    const temporaryPassword = generateTemporaryPassword();
    console.log('🔑 [create-condominio-user] Senha temporária gerada');

    // Criar usuário no auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: condominioEmail,
      password: temporaryPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: condominioName,
        client_type: 'condominio_vinculado',
        onboarding_completed: false
      }
    });

    if (authError) {
      console.error('❌ [create-condominio-user] Erro ao criar usuário:', authError);
      throw authError;
    }

    console.log('✅ [create-condominio-user] Usuário criado no auth:', authUser.user.id);

    // Criar profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: condominioEmail,
        name: condominioName,
        role: 'manager',
        client_id: condominioId,
        tenant_type: 'client',
        onboarding_completed: true,
        active: true
      });

    if (profileError) {
      console.error('❌ [create-condominio-user] Erro ao criar profile:', profileError);
      // Reverter criação do usuário
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    console.log('✅ [create-condominio-user] Profile criado');

    // Criar registro em users
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        client_id: condominioId,
        name: condominioName,
        email: condominioEmail,
        role: 'manager',
        status: 'active'
      });

    if (usersError) {
      console.error('❌ [create-condominio-user] Erro ao criar em users:', usersError);
    }

    // Atribuir role admin_cliente (primeiro usuário)
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role: 'admin_cliente'
      });

    if (roleError) {
      console.error('⚠️ [create-condominio-user] Erro ao atribuir role (pode já existir):', roleError);
    }

    console.log('✅ [create-condominio-user] Role admin_cliente atribuída');

    // Buscar configurações do sistema para base_url
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'platform_config')
      .single();

    const baseUrl = settings?.setting_value?.base_url || 'https://lovable.dev';

    // Enviar email de boas-vindas
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: condominioEmail,
        template_type: 'condominio_welcome',
        template_data: {
          condominio_name: condominioName,
          administradora_name: administradoraName,
          email: condominioEmail,
          temporary_password: temporaryPassword,
          login_url: `${baseUrl}/auth`,
          support_email: 'suporte@cotiz.com'
        },
        client_id: condominioId
      }
    });

    if (emailError) {
      console.error('⚠️ [create-condominio-user] Erro ao enviar email:', emailError);
      // Não falhar a operação por causa do email
    } else {
      console.log('📧 [create-condominio-user] Email de boas-vindas enviado');
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: authUser.user.id,
      action: 'CONDOMINIO_USER_CREATED',
      entity_type: 'users',
      entity_id: authUser.user.id,
      panel_type: 'system',
      details: {
        condominio_id: condominioId,
        condominio_name: condominioName,
        created_by_administradora: administradoraName
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId: authUser.user.id,
        email: condominioEmail,
        temporaryPassword: temporaryPassword,
        profileId: authUser.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [create-condominio-user] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
