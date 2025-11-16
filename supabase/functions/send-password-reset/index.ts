import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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

    // 1. Buscar URL base configurada no sistema
    let baseUrl = 'http://localhost:3000'; // fallback para desenvolvimento local
    
    try {
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'base_url')
        .maybeSingle();
      
      if (settingData?.setting_value) {
        const value = typeof settingData.setting_value === 'string'
          ? settingData.setting_value.replace(/"/g, '')
          : String(settingData.setting_value || '').replace(/"/g, '');
        
        if (value) {
          baseUrl = value;
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar base_url, usando fallback:', baseUrl);
    }

    console.log('🌐 Base URL para recuperação de senha:', baseUrl);

    // 2. Verificar se usuário existe
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, client_id, supplier_id, onboarding_completed')
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

    // 3. Validar onboarding completo
    if (!profile.client_id && !profile.supplier_id) {
      console.log('⚠️ Usuário sem client_id/supplier_id - onboarding incompleto');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Usuário ainda não completou o cadastro. Complete o onboarding antes de redefinir a senha.',
          error_code: 'INCOMPLETE_ONBOARDING'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 4. Gerar link de reset usando Supabase Auth
    
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${baseUrl}/auth/reset-password`
      }
    });

    if (resetError || !resetData) {
      console.error('❌ Erro ao gerar link:', resetError);
      throw new Error('Não foi possível gerar o link de recuperação');
    }

    console.log('✅ Link de reset gerado:', resetData.properties.action_link);

    // Verificar e corrigir localhost no link
    let finalResetLink = resetData.properties.action_link;
    if (finalResetLink.includes('localhost')) {
      console.warn('⚠️ Link contém localhost! Substituindo por base_url...');
      finalResetLink = finalResetLink.replace(/https?:\/\/localhost(:\d+)?/g, baseUrl);
      console.log('🔧 Link corrigido:', finalResetLink);
    }

    // 5. Enviar e-mail via send-email com template
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        template_type: 'email_password_reset',
        template_data: {
          user_name: profile.name || 'Usuário',
          reset_link: finalResetLink,
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
