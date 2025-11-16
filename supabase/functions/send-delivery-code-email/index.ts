import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resolveEmailConfig, sendEmail } from '../_shared/email.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  email: string;
  client_name: string;
  confirmation_code: string;
  delivery_id: string;
  quote_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, client_name, confirmation_code, delivery_id, quote_id }: RequestBody = await req.json();

    console.log('Sending delivery code via Email:', { email, client_name, delivery_id, quote_id });

    // Buscar configuração de email
    const config = await resolveEmailConfig(supabase, null);
    
    if (!config) {
      console.error('Email not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Template do email
    const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header -->
      <tr>
        <td style="background-color: #003366; padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚚 Entrega Agendada</h1>
        </td>
      </tr>
      
      <!-- Content -->
      <tr>
        <td style="padding: 40px 30px; background-color: #f5f5f5;">
          <p style="margin: 0 0 20px; font-size: 16px; color: #333;">Olá <strong>${client_name}</strong>,</p>
          
          <p style="margin: 0 0 30px; font-size: 16px; color: #333;">Sua entrega foi agendada com sucesso!</p>
          
          <!-- Code Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 2px solid #003366; border-radius: 8px; margin: 20px 0;">
            <tr>
              <td style="padding: 30px 20px; text-align: center;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #666;">Código de Confirmação</p>
                <p style="margin: 10px 0; font-size: 36px; font-weight: bold; color: #003366; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                  ${confirmation_code}
                </p>
                <p style="margin: 10px 0 0; font-size: 12px; color: #999;">Válido por 7 dias</p>
              </td>
            </tr>
          </table>
          
          <!-- Warning Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; margin: 20px 0;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="margin: 0 0 15px; color: #856404; font-size: 18px;">⚠️ Importante</h3>
                <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.8;">
                  <li>Confirme o recebimento somente após receber todos os produtos/serviços</li>
                  <li>O pagamento será liberado automaticamente ao fornecedor</li>
                  <li>Este código expira em 7 dias</li>
                </ul>
              </td>
            </tr>
          </table>
          
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
            <tr>
              <td style="text-align: center;">
                <a href="https://${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.lovable.app/client/deliveries" 
                   style="display: inline-block; background-color: #003366; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                  Acessar Minhas Entregas
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      
      <!-- Footer -->
      <tr>
        <td style="padding: 20px; text-align: center; color: #999; font-size: 12px; background-color: #ffffff;">
          <p style="margin: 0;">© 2025 Cotiz - Plataforma de Gestão de Cotações</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const plainText = `
Entrega Agendada - Cotiz

Olá ${client_name},

Sua entrega foi agendada com sucesso!

Código de Confirmação: ${confirmation_code}
(Válido por 7 dias)

⚠️ Importante:
• Confirme o recebimento somente após receber todos os produtos/serviços
• O pagamento será liberado automaticamente ao fornecedor
• Este código expira em 7 dias

Acesse suas entregas: https://${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.lovable.app/client/deliveries

© 2025 Cotiz - Plataforma de Gestão de Cotações
`;

    // Enviar email
    const result = await sendEmail(config, {
      to: email,
      subject: '🚚 Código de Confirmação de Entrega - Cotiz',
      html: htmlContent,
      plainText: plainText
    });

    if (!result.success) {
      console.error('Failed to send email:', result.error);
      
      // Registrar falha no log de auditoria
      await supabase.from('audit_logs').insert({
        action: 'DELIVERY_CODE_EMAIL_FAILED',
        entity_type: 'deliveries',
        entity_id: delivery_id,
        panel_type: 'system',
        details: {
          email: email,
          error: result.error,
          quote_id: quote_id
        }
      });

      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar sucesso no log de auditoria
    await supabase.from('audit_logs').insert({
      action: 'DELIVERY_CODE_EMAIL_SENT',
      entity_type: 'deliveries',
      entity_id: delivery_id,
      panel_type: 'system',
      details: {
        email: email,
        confirmation_code: confirmation_code,
        quote_id: quote_id,
        message_id: result.messageId
      }
    });

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-delivery-code-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
