import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

interface SendCodeRequest {
  email: string;
}

// Gera código de 6 dígitos
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { email }: SendCodeRequest = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: máximo 3 códigos por hora por email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: recentCount } = await supabase
      .from('email_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (recentCount && recentCount >= 3) {
      console.log(`⚠️ Rate limit atingido para ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Muitas tentativas. Aguarde 1 hora para tentar novamente.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalidar códigos anteriores não verificados
    await supabase
      .from('email_verifications')
      .update({ expires_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
      .is('verified_at', null);

    // Gerar novo código
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Salvar no banco
    const { error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

    if (insertError) {
      console.error('❌ Erro ao salvar código:', insertError);
      throw new Error('Erro ao gerar código de verificação');
    }

    // Carregar configuração de email
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_configuration')
      .single();

    // Carregar branding
    const { data: brandingData } = await supabase
      .from('branding_settings')
      .select('*')
      .is('client_id', null)
      .maybeSingle();

    const branding = {
      company_name: brandingData?.company_name || 'Cotiz',
      primary_color: brandingData?.primary_color || '#003366'
    };

    // Enviar email
    let emailSent = false;
    
    if (settingsData?.setting_value?.resend_api_key) {
      const resend = new Resend(settingsData.setting_value.resend_api_key);
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: ${branding.primary_color}; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${branding.company_name}</h1>
            </div>
            <div style="padding: 32px 24px; text-align: center;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Código de Verificação</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 15px;">
                Use o código abaixo para verificar seu e-mail:
              </p>
              <div style="background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${branding.primary_color};">
                  ${code}
                </span>
              </div>
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                Este código expira em <strong>15 minutos</strong>.
              </p>
            </div>
            <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Se você não solicitou este código, ignore este e-mail.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await resend.emails.send({
        from: `${settingsData.setting_value.from_name || branding.company_name} <${settingsData.setting_value.from_email || 'noreply@cotiz.com.br'}>`,
        to: normalizedEmail,
        subject: `${code} é seu código de verificação - ${branding.company_name}`,
        html: emailHtml
      });

      if (result.error) {
        console.error('❌ Erro ao enviar email:', result.error);
        throw new Error('Erro ao enviar e-mail de verificação');
      }

      emailSent = true;
      console.log(`✅ Código ${code} enviado para ${normalizedEmail}`);
    } else {
      // Fallback para RESEND_API_KEY env var
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        const resend = new Resend(resendKey);
        
        const result = await resend.emails.send({
          from: `${branding.company_name} <onboarding@resend.dev>`,
          to: normalizedEmail,
          subject: `${code} é seu código de verificação - ${branding.company_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto;">
              <h2 style="color: ${branding.primary_color};">Código de Verificação</h2>
              <p>Use o código abaixo para verificar seu e-mail:</p>
              <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: ${branding.primary_color};">${code}</span>
              </div>
              <p style="color: #666; font-size: 13px;">Este código expira em 15 minutos.</p>
            </div>
          `
        });

        if (result.error) {
          console.error('❌ Erro ao enviar email (fallback):', result.error);
          throw new Error('Erro ao enviar e-mail de verificação');
        }

        emailSent = true;
        console.log(`✅ Código ${code} enviado para ${normalizedEmail} (fallback)`);
      }
    }

    if (!emailSent) {
      throw new Error('Configuração de e-mail não encontrada');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado com sucesso',
        expiresIn: 15 * 60 // segundos
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro em send-verification-code:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
