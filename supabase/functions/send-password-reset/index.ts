import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
  client_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, client_id }: PasswordResetRequest = await req.json();

    console.log('🔐 [Password Reset] Solicitação para:', email);

    // 1. Verificar se usuário existe
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, client_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!profile) {
      console.log('⚠️ E-mail não encontrado no sistema');
      // Retornar sucesso mesmo se não existir (segurança)
      return new Response(
        JSON.stringify({ success: true, message: 'Se o e-mail existir, as instruções foram enviadas.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Gerar link de reset usando Supabase Auth
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/auth/reset-password`
      }
    });

    if (resetError || !resetData) {
      console.error('❌ Erro ao gerar link:', resetError);
      throw new Error('Não foi possível gerar o link de recuperação');
    }

    console.log('✅ Link de reset gerado:', resetData.properties.action_link);

    // 3. Enviar e-mail via send-email com template
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        template_type: 'email_password_reset',
        template_data: {
          user_name: profile.name || 'Usuário',
          reset_link: resetData.properties.action_link,
          expiry_time: '1 hora'
        },
        client_id: profile.client_id || client_id
      }
    });

    if (emailError) {
      console.error('❌ Erro ao enviar e-mail:', emailError);
      throw emailError;
    }

    console.log('✅ E-mail de recuperação enviado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Instruções de recuperação enviadas para seu e-mail.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Erro em send-password-reset:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro ao processar solicitação de recuperação de senha' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
