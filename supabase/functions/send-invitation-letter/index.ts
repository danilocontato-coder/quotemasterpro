import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resolveEmailConfig, sendEmail, replaceVariables } from '../_shared/email.ts';
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendLetterRequest {
  letterId: string;
  isResend?: boolean;
  sendWhatsapp?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { letterId, isResend = false, sendWhatsapp = false }: SendLetterRequest = await req.json();

    console.log('[send-invitation-letter] Processing letter:', letterId, 'isResend:', isResend, 'sendWhatsapp:', sendWhatsapp);

    // Fetch letter data
    const { data: letter, error: letterError } = await supabase
      .from('invitation_letters')
      .select(`
        *,
        quotes (
          id,
          local_code,
          title,
          description
        ),
        clients (
          id,
          name,
          cnpj
        )
      `)
      .eq('id', letterId)
      .single();

    if (letterError || !letter) {
      console.error('[send-invitation-letter] Letter not found:', letterError);
      throw new Error('Carta convite não encontrada');
    }

    // Fetch suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('invitation_letter_suppliers')
      .select(`
        id,
        supplier_id,
        suppliers (
          id,
          name,
          email,
          contacts
        )
      `)
      .eq('invitation_letter_id', letterId);

    if (suppliersError) {
      console.error('[send-invitation-letter] Error fetching suppliers:', suppliersError);
      throw new Error('Erro ao buscar fornecedores');
    }

    // Resolve email config
    const emailConfig = await resolveEmailConfig(supabase, letter.client_id);
    if (!emailConfig) {
      throw new Error('Configuração de email não encontrada');
    }

    // Resolve WhatsApp config if requested
    let evolutionConfig = null;
    if (sendWhatsapp) {
      try {
        evolutionConfig = await resolveEvolutionConfig(supabase, letter.client_id, false);
        console.log('[send-invitation-letter] Evolution config resolved:', evolutionConfig ? 'Yes' : 'No');
      } catch (err) {
        console.error('[send-invitation-letter] Evolution config error:', err);
        // Continue without WhatsApp if config fails
      }
    }

    // Get app URL
    const appUrl = Deno.env.get('APP_URL') || 'https://bpsqyaxdhqejozmlejcb.supabase.co';

    let sentCount = 0;
    let whatsappSentCount = 0;
    const errors: string[] = [];

    // Send email to registered suppliers
    if (suppliers && suppliers.length > 0) {
      console.log('[send-invitation-letter] Found', suppliers.length, 'registered suppliers');
      
      for (const supplierRecord of suppliers) {
        try {
          const supplier = supplierRecord.suppliers;
          if (!supplier) continue;

          // Get or generate token
          let token = supplierRecord.response_token;
          let tokenExpiresAt = supplierRecord.token_expires_at;

          if (!token || (isResend && new Date(tokenExpiresAt!) < new Date())) {
            // Generate new token (valid for 30 days)
            token = crypto.randomUUID();
            tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            await supabase
              .from('invitation_letter_suppliers')
              .update({
                response_token: token,
                token_expires_at: tokenExpiresAt,
                sent_at: new Date().toISOString()
              })
              .eq('id', supplierRecord.id);
          }

          // Build response URL
          const responseUrl = `${appUrl}/invitation-response/${token}`;

          // Email template for linked quotes
          const emailHtml = letter.quote_id ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #003366; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f5f5f5; }
    .button { display: inline-block; padding: 12px 24px; background: #003366; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #003366; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Carta Convite de Cotação</h1>
    </div>
    <div class="content">
      <p>Prezado(a) fornecedor <strong>${supplier.name}</strong>,</p>
      
      <p>Você foi convidado(a) a participar do processo de cotação:</p>
      
      <div class="info-box">
        <strong>Carta:</strong> ${letter.letter_number}<br>
        <strong>Cliente:</strong> ${letter.clients?.name || 'N/A'}<br>
        <strong>RFQ:</strong> ${letter.quotes?.local_code || 'N/A'}<br>
        <strong>Título:</strong> ${letter.title}<br>
        <strong>Prazo de Resposta:</strong> ${new Date(letter.deadline).toLocaleDateString('pt-BR')}
      </div>
      
      <p><strong>Descrição:</strong></p>
      <p>${letter.description}</p>
      
      ${letter.attachments && letter.attachments.length > 0 ? `
        <p><strong>Anexos:</strong></p>
        <ul>
          ${letter.attachments.map((att: any) => `<li>${att.name}</li>`).join('')}
        </ul>
      ` : ''}
      
      <p>Para visualizar os detalhes completos e responder a esta carta convite, clique no botão abaixo:</p>
      
      <div style="text-align: center;">
        <a href="${responseUrl}" class="button">Responder Carta Convite</a>
      </div>
      
      <p style="font-size: 12px; color: #666;">
        Ou copie e cole este link no seu navegador:<br>
        <a href="${responseUrl}">${responseUrl}</a>
      </p>
      
      <p><strong>Atenção:</strong> Este link é único e pessoal. Não compartilhe com terceiros.</p>
    </div>
    <div class="footer">
      <p>Este é um email automático da plataforma Cotiz. Não responda diretamente a este email.</p>
      <p>© ${new Date().getFullYear()} Cotiz - Plataforma de Gestão de Cotações</p>
    </div>
  </div>
</body>
</html>
          ` : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #003366; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f5f5f5; }
    .button { display: inline-block; padding: 12px 24px; background: #003366; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #003366; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sondagem de Mercado</h1>
    </div>
    <div class="content">
      <p>Prezado(a) fornecedor <strong>${supplier.name}</strong>,</p>
      
      <p>Estamos realizando uma sondagem de mercado e gostaríamos de convidá-lo(a) a participar:</p>
      
      <div class="info-box">
        <strong>Carta:</strong> ${letter.letter_number}<br>
        <strong>Cliente:</strong> ${letter.clients?.name || 'N/A'}<br>
        <strong>Categoria:</strong> ${letter.quote_category || 'Geral'}<br>
        ${letter.estimated_budget ? `<strong>Orçamento Estimado:</strong> R$ ${letter.estimated_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br>` : ''}
        <strong>Título:</strong> ${letter.title}<br>
        <strong>Prazo de Resposta:</strong> ${new Date(letter.deadline).toLocaleDateString('pt-BR')}
      </div>
      
      <p><strong>Detalhes:</strong></p>
      <p>${letter.description}</p>
      
      ${letter.attachments && letter.attachments.length > 0 ? `
        <p><strong>Anexos:</strong></p>
        <ul>
          ${letter.attachments.map((att: any) => `<li>${att.name}</li>`).join('')}
        </ul>
      ` : ''}
      
      <p>Para visualizar os detalhes completos e manifestar seu interesse, clique no botão abaixo:</p>
      
      <div style="text-align: center;">
        <a href="${responseUrl}" class="button">Responder Convite</a>
      </div>
      
      <p style="font-size: 12px; color: #666;">
        Ou copie e cole este link no seu navegador:<br>
        <a href="${responseUrl}">${responseUrl}</a>
      </p>
      
      <p><strong>Atenção:</strong> Este link é único e pessoal. Não compartilhe com terceiros.</p>
    </div>
    <div class="footer">
      <p>Este é um email automático da plataforma Cotiz. Não responda diretamente a este email.</p>
      <p>© ${new Date().getFullYear()} Cotiz - Plataforma de Gestão de Cotações</p>
    </div>
  </div>
</body>
</html>
          `;

          // Send email
          const emailResult = await sendEmail(emailConfig, {
            to: supplier.email || supplier.contacts?.email,
            subject: letter.quote_id 
              ? `Carta Convite de Cotação - ${letter.letter_number}`
              : `Sondagem de Mercado - ${letter.letter_number}`,
            html: emailHtml,
            plainText: letter.quote_id
              ? `Você foi convidado a participar da cotação ${letter.letter_number}. Acesse: ${responseUrl}`
              : `Você foi convidado a participar de uma sondagem de mercado ${letter.letter_number}. Acesse: ${responseUrl}`
          });

          if (emailResult.success) {
            sentCount++;
            console.log('[send-invitation-letter] Email sent to:', supplier.name);

            // Send WhatsApp if requested and configured
            if (sendWhatsapp && evolutionConfig) {
              const phone = supplier.contacts?.phone || supplier.contacts?.whatsapp;
              if (phone) {
                try {
                  const normalizedPhone = normalizePhone(phone);
                  const whatsappMessage = `🔔 *Carta Convite - ${letter.letter_number}*

Olá, ${supplier.name}!

Você foi convidado para: *${letter.title}*

📋 Cliente: ${letter.clients?.name}
⏰ Prazo: ${new Date(letter.deadline).toLocaleDateString('pt-BR')}

🔗 Acesse para responder:
${responseUrl}

_Link único e pessoal. Não compartilhar._`;

                  const whatsappResult = await sendEvolutionWhatsApp(evolutionConfig, normalizedPhone, whatsappMessage);
                  if (whatsappResult.success) {
                    whatsappSentCount++;
                    console.log('[send-invitation-letter] WhatsApp sent to:', normalizedPhone);
                  } else {
                    console.error('[send-invitation-letter] WhatsApp failed for:', normalizedPhone, whatsappResult.error);
                  }
                } catch (whatsappError: any) {
                  console.error('[send-invitation-letter] WhatsApp error for', supplier.name, ':', whatsappError);
                }
              }
            }
          } else {
            errors.push(`${supplier.name}: ${emailResult.error}`);
            console.error('[send-invitation-letter] Failed to send to:', supplier.name, emailResult.error);
          }

        } catch (err: any) {
          errors.push(`${supplierRecord.suppliers?.name || 'Unknown'}: ${err.message}`);
          console.error('[send-invitation-letter] Error sending to supplier:', err);
        }
      }
    }

    // Send to direct emails (standalone mode)
    if (letter.direct_emails && letter.direct_emails.length > 0) {
      console.log('[send-invitation-letter] Found', letter.direct_emails.length, 'direct emails');

      const directEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #003366; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f5f5f5; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #003366; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Convite para Participar de Processo</h1>
    </div>
    <div class="content">
      <p>Prezado(a) fornecedor,</p>
      
      <p>Você foi convidado(a) a participar de um processo de cotação/sondagem:</p>
      
      <div class="info-box">
        <strong>Carta:</strong> ${letter.letter_number}<br>
        <strong>Cliente:</strong> ${letter.clients?.name || 'N/A'}<br>
        <strong>Categoria:</strong> ${letter.quote_category || 'Geral'}<br>
        ${letter.estimated_budget ? `<strong>Orçamento Estimado:</strong> R$ ${letter.estimated_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br>` : ''}
        <strong>Título:</strong> ${letter.title}<br>
        <strong>Prazo de Resposta:</strong> ${new Date(letter.deadline).toLocaleDateString('pt-BR')}
      </div>
      
      <p><strong>Detalhes:</strong></p>
      <p>${letter.description}</p>
      
      ${letter.attachments && letter.attachments.length > 0 ? `
        <p><strong>Anexos disponíveis após cadastro:</strong></p>
        <ul>
          ${letter.attachments.map((att: any) => `<li>${att.name}</li>`).join('')}
        </ul>
      ` : ''}
      
      <p>Para participar, por favor entre em contato conosco através deste email ou acesse nossa plataforma.</p>
    </div>
    <div class="footer">
      <p>Este é um email automático da plataforma Cotiz.</p>
      <p>© ${new Date().getFullYear()} Cotiz - Plataforma de Gestão de Cotações</p>
    </div>
  </div>
</body>
</html>
      `;

      for (const email of letter.direct_emails) {
        try {
          const emailResult = await sendEmail(emailConfig, {
            to: email,
            subject: `Convite para Participação - ${letter.letter_number}`,
            html: directEmailHtml,
            plainText: `Você foi convidado a participar do processo ${letter.letter_number}. Entre em contato para mais informações.`
          });

          if (emailResult.success) {
            sentCount++;
            console.log('[send-invitation-letter] Direct email sent to:', email);
          } else {
            errors.push(`${email}: ${emailResult.error}`);
            console.error('[send-invitation-letter] Failed to send to:', email, emailResult.error);
          }
        } catch (err: any) {
          errors.push(`${email}: ${err.message}`);
          console.error('[send-invitation-letter] Error sending to direct email:', err);
        }
      }
    }

    // Update letter status to 'sent'
    await supabase
      .from('invitation_letters')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', letterId);

    // Audit log
    await supabase
      .from('audit_logs')
      .insert({
        action: isResend ? 'RESEND_INVITATION_LETTER' : 'SEND_INVITATION_LETTER',
        panel_type: 'system',
        entity_type: 'invitation_letters',
        entity_id: letterId,
        details: {
          letter_number: letter.letter_number,
          sent_count: sentCount,
          whatsapp_sent_count: whatsappSentCount,
          total_suppliers: (suppliers?.length || 0) + (letter.direct_emails?.length || 0),
          errors: errors.length > 0 ? errors : undefined
        }
      });

    console.log('[send-invitation-letter] Completed. Emails:', sentCount, 'WhatsApp:', whatsappSentCount, 'Errors:', errors.length);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        whatsapp_sent_count: whatsappSentCount,
        totalSuppliers: (suppliers?.length || 0) + (letter.direct_emails?.length || 0),
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[send-invitation-letter] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});