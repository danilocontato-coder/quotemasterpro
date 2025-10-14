import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template_id?: string;
  template_data?: Record<string, any>;
}

interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  resend_api_key?: string;
  sendgrid_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  from_email: string;
  from_name: string;
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

    // Load email configuration from system_settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_configuration')
      .single();

    if (settingsError || !settingsData) {
      throw new Error('Configurações de e-mail não encontradas. Configure em Admin > Email Settings.');
    }

    const config: EmailConfig = settingsData.setting_value as EmailConfig;
    const payload: EmailPayload = await req.json();

    // Load branding settings
    const { data: brandingData } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    const branding = {
      company_name: brandingData?.company_name || 'QuoteMaster Pro',
      logo_url: brandingData?.logo_url || '',
      primary_color: brandingData?.primary_color || '#003366',
      secondary_color: brandingData?.secondary_color || '#F5F5F5',
      accent_color: brandingData?.accent_color || '#0066CC',
      footer_text: brandingData?.footer_text || '© 2025 QuoteMaster Pro'
    };

    // If template_type provided, load template
    if (payload.template_type) {
      console.log('📧 Loading template:', payload.template_type);
      
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_type', payload.template_type)
        .eq('active', true)
        .or(`client_id.eq.${payload.client_id || 'null'},is_global.eq.true`)
        .order('client_id', { nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (template) {
        console.log('✅ Template loaded:', template.name);
        
        // Replace branding variables
        let htmlContent = template.message_content;
        
        // Inject branding
        htmlContent = htmlContent
          .replace(/{{primary_color}}/g, branding.primary_color)
          .replace(/{{accent_color}}/g, branding.accent_color)
          .replace(/{{secondary_color}}/g, branding.secondary_color)
          .replace(/{{company_name}}/g, branding.company_name)
          .replace(/{{footer_text}}/g, branding.footer_text);

        // Replace template_data variables
        if (payload.template_data) {
          Object.entries(payload.template_data).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            htmlContent = htmlContent.replace(regex, String(value || ''));
          });
        }

        // Remove any remaining unreplaced variables
        htmlContent = htmlContent.replace(/{{[^}]+}}/g, '');

        payload.subject = template.subject || payload.subject;
        payload.html = htmlContent;
        
        console.log('📝 Subject:', payload.subject);
      } else {
        console.warn('⚠️ Template not found:', payload.template_type);
      }
    }

    console.log('📧 Enviando e-mail via:', config.provider);

    let result: any;

    // Send email based on provider
    switch (config.provider) {
      case 'resend': {
        if (!config.resend_api_key) {
          throw new Error('Resend API Key não configurada');
        }

        const resend = new Resend(config.resend_api_key);

        const emailData = {
          from: `${config.from_name} <${config.from_email}>`,
          to: Array.isArray(payload.to) ? payload.to : [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text
        };

        result = await resend.emails.send(emailData);
        
        if (result.error) {
          throw new Error(`Resend Error: ${result.error.message}`);
        }

        console.log('✅ E-mail enviado via Resend:', result.data?.id);
        break;
      }

      case 'sendgrid': {
        if (!config.sendgrid_api_key) {
          throw new Error('SendGrid API Key não configurada');
        }

        const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.sendgrid_api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: Array.isArray(payload.to) 
                ? payload.to.map(email => ({ email }))
                : [{ email: payload.to }]
            }],
            from: {
              email: config.from_email,
              name: config.from_name
            },
            subject: payload.subject,
            content: [
              payload.html ? {
                type: 'text/html',
                value: payload.html
              } : {
                type: 'text/plain',
                value: payload.text || ''
              }
            ]
          })
        });

        if (!sendgridResponse.ok) {
          const error = await sendgridResponse.text();
          throw new Error(`SendGrid Error: ${error}`);
        }

        result = { success: true, provider: 'sendgrid' };
        console.log('✅ E-mail enviado via SendGrid');
        break;
      }

      case 'smtp': {
        // SMTP implementation would require nodemailer or similar
        // For now, return not implemented
        throw new Error('SMTP provider não implementado ainda. Use Resend ou SendGrid.');
      }

      default:
        throw new Error(`Provider não suportado: ${config.provider}`);
    }

    // Log email send
    await supabase.from('email_logs').insert({
      to_email: Array.isArray(payload.to) ? payload.to[0] : payload.to,
      subject: payload.subject,
      status: 'sent',
      provider: config.provider,
      message_id: result.data?.id || result.id || null
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.data?.id || result.id,
        provider: config.provider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao enviar e-mail:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
