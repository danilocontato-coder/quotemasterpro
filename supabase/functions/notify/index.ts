import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface NotificationRequest {
  type: 'email' | 'whatsapp' | 'certification' | 'whatsapp_user_credentials'
  to?: string
  client_id?: string
  supplier_id?: string
  supplier_name?: string
  supplier_email?: string
  supplier_whatsapp?: string
  quoteData?: {
    quoteId: string
    quoteTitle: string
    deadline: string
    items: Array<{
      name: string
      quantity: number
    }>
    clientName: string
    clientContact: string
  }
  // User credentials payload
  user_id?: string
  user_name?: string
  user_email?: string
  temp_password?: string
  app_url?: string
}

Deno.serve(async (req) => {
  console.log('🔔 [NOTIFY] Function invoked at:', new Date().toISOString());
  console.log('🔔 [NOTIFY] Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json();
    console.log('📥 [NOTIFY] Request body:', JSON.stringify(requestBody, null, 2));
    
    const { type, to, client_id, supplier_id, supplier_name, supplier_email, supplier_whatsapp, quoteData, user_id, user_name, user_email, temp_password, app_url }: NotificationRequest = requestBody;

    console.log(`[NOTIFY] Processando notificação tipo ${type}`)
    console.log(`📍 [NOTIFY] client_id recebido:`, client_id || 'null (usará configuração global)')

    let result: any = { success: false }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (type === 'certification') {
      if (!supplier_id || !supplier_name) {
        throw new Error('supplier_id e supplier_name são obrigatórios para certificação')
      }

      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplier_id)
        .single()

      if (supplierError || !supplier) {
        throw new Error('Fornecedor não encontrado')
      }

      await supabase.from('notifications').insert({
        user_id: null,
        title: 'Parabéns! Você foi certificado',
        message: `Seu fornecedor "${supplier.name}" foi certificado pela plataforma QuoteMaster Pro. Agora você tem acesso a mais oportunidades de negócio e maior visibilidade para todos os clientes.`,
        type: 'certification',
        priority: 'high',
        metadata: { supplier_id, certification_date: new Date().toISOString() }
      })

      if (supplier.whatsapp) {
        const cfg = await resolveEvolutionConfig(supabase, supplier.client_id || null)
        const phone = normalizePhone(supplier.whatsapp)
        const text = `🎉 *Parabéns! Fornecedor Certificado* 🎉\n\n` +
          `Olá ${supplier.name}!\n\n` +
          `É com grande prazer que informamos que sua empresa foi **CERTIFICADA** pela plataforma QuoteMaster Pro! 🏆\n\n` +
          `✅ *Benefícios da Certificação:*\n` +
          `• Visibilidade para TODOS os clientes da plataforma\n` +
          `• Prioridade no recebimento de cotações\n` +
          `• Selo de qualidade e confiabilidade\n` +
          `• Maior oportunidade de negócios\n\n` +
          `🚀 A partir de agora, você pode receber cotações de qualquer cliente da plataforma.\n\n` +
          `Obrigado por fazer parte da nossa rede de fornecedores certificados!\n\n` +
          `*QuoteMaster Pro - Conectando negócios*`
        const sent = await sendEvolutionWhatsApp(cfg, phone, text)
        if (sent.success) {
          result = { method: 'whatsapp', ...sent, success: true }
        } else {
          console.warn('[CERTIFICATION] Falha ao enviar WhatsApp:', sent.error)
        }
      }

      if (!result.success) {
        result = { success: true, method: 'database', note: 'Notificação salva no banco' }
      }

      await supabase.from('audit_logs').insert({
        action: 'SUPPLIER_CERTIFIED',
        entity_type: 'suppliers',
        entity_id: supplier_id,
        details: { supplier_name: supplier_name, certification_date: new Date().toISOString(), notification_sent: result.success }
      })

    } else if (type === 'whatsapp_user_credentials') {
      if (!to || !user_email || !temp_password) {
        throw new Error('Campos obrigatórios ausentes: to, user_email, temp_password')
      }

      let clientId: string | null = null
      try {
        if (user_id) {
          const { data: u } = await supabase.from('users').select('client_id').eq('id', user_id).maybeSingle()
          clientId = u?.client_id || null
        }
        if (!clientId && user_email) {
          const { data: u2 } = await supabase.from('users').select('client_id').eq('email', user_email).maybeSingle()
          clientId = u2?.client_id || null
        }
      } catch (e) { console.warn('[WHATSAPP CREDENTIALS] Falha ao obter client_id:', e) }

      const cfg = await resolveEvolutionConfig(supabase, clientId)
      
      console.log(`[WHATSAPP CREDENTIALS] Config Evolution resolvida:`, {
        hasApiUrl: !!cfg.apiUrl,
        hasToken: !!cfg.token,
        apiUrl: cfg.apiUrl,
        instance: cfg.instance,
        scope: cfg.scope,
        clientId
      })

      if (!cfg.apiUrl || !cfg.token) {
        const errorMsg = `❌ Evolution API não configurada. Escopo=${cfg.scope}. Configure no SuperAdmin > Integrações.`
        console.error(errorMsg, { cfg, clientId })
        throw new Error(errorMsg)
      }

      const number = normalizePhone(to)
      const text =
        `🎉 *Bem-vindo(a) ao Cotiz!* 🎉\n\n` +
        `Olá *${user_name || 'Cliente'}*! 👋\n\n` +
        `Seu acesso à plataforma *Cotiz* foi criado com sucesso! Use as credenciais abaixo para fazer seu primeiro login:\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 *E-mail:* ${user_email}\n` +
        `🔑 *Senha temporária:* ${temp_password}\n` +
        `🏢 *Empresa:* ${user_name || 'Sua Empresa'}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🚀 *Acesse agora:*\n` +
        `${app_url || 'https://cotiz.com.br/auth/login'}\n\n` +
        `⚠️ *IMPORTANTE:*\n` +
        `Por segurança, você será solicitado a alterar sua senha no primeiro acesso.\n\n` +
        `💬 *Precisa de ajuda?*\n` +
        `📧 suporte@cotiz.com.br\n` +
        `📱 +55 (71) 99999-9999\n\n` +
        `*Cotiz* - Plataforma de Gestão de Cotações\n` +
        `🌐 www.cotiz.com.br`

      const sent = await sendEvolutionWhatsApp(cfg, number, text)
      result = sent.success
        ? { ...sent, number, config_scope: cfg.scope, success: true }
        : { success: false, error: `Falha na Evolution API. Escopo=${cfg.scope}. Último erro: ${sent.error}`, tried_endpoints: sent.tried_endpoints, number, evo_scope: cfg.scope }

      try {
        await supabase.from('audit_logs').insert({
          action: 'USER_CREDENTIALS_SENT',
          entity_type: 'users',
          entity_id: user_id || user_email || 'unknown',
          details: {
            to: number,
            success: result.success,
            messageId: (result as any).messageId,
            provider: 'evolution-api',
            endpoints_tried: (result as any).tried_endpoints,
            evo_scope: cfg.scope,
          }
        })
      } catch (logErr) { console.warn('[WHATSAPP CREDENTIALS] Falha ao registrar audit log:', logErr) }

    } else if (type === 'whatsapp' && quoteData) {
      const cfg = await resolveEvolutionConfig(supabase, client_id || null)
      console.log(`📍 [NOTIFY] Escopo Evolution resolvido: ${cfg.scope}`)
      const number = normalizePhone(to || '')
      const text = `🏢 *Nova Cotação - ${quoteData.clientName}*\n\n` +
        `Olá ${supplier_name || 'Fornecedor'}!\n\n` +
        `Você recebeu uma nova solicitação de cotação:\n\n` +
        `📋 *Título:* ${quoteData.quoteTitle}\n` +
        `🆔 *ID:* ${quoteData.quoteId}\n` +
        `⏰ *Prazo:* ${quoteData.deadline}\n` +
        `📦 *Itens:* ${quoteData.items.length} item(s)\n\n` +
        `*Itens solicitados:*\n` +
        quoteData.items.map(item => `• ${item.name} - Qtd: ${item.quantity}`).join('\n') +
        `\n\n📞 *Contato do cliente:* ${quoteData.clientContact}\n\n` +
        `Para responder esta cotação, acesse o sistema QuoteMaster Pro.`

      const sent = await sendEvolutionWhatsApp(cfg, number, text)
      result = sent.success
        ? { ...sent, success: true }
        : { success: false, error: `Falha na Evolution API: ${sent.error}` }

      await supabase.from('audit_logs').insert({
        action: 'NOTIFICATION_SENT',
        entity_type: 'quotes',
        entity_id: quoteData.quoteId,
        details: { type, to, supplier_name, success: result.success, messageId: (result as any).messageId, provider: 'evolution-api' }
      })

    } else if (type === 'email' && quoteData) {
      console.log('📧 [EMAIL] Iniciando envio de email para:', to);
      
      try {
        // Importar funções de email do módulo compartilhado
        const { resolveEmailConfig, sendEmail, replaceVariables } = await import('../_shared/email.ts');
        
        // Resolver configuração de email (global -> env)
        const emailConfig = await resolveEmailConfig(supabase, client_id || null);
        
        if (!emailConfig) {
          console.error('❌ [EMAIL] Nenhuma configuração de email encontrada');
          result = { 
            success: false, 
            error: 'Configuração de email não encontrada. Configure RESEND_API_KEY em Secrets.' 
          };
        } else {
          console.log('✅ [EMAIL] Configuração carregada:', { 
            fromEmail: emailConfig.fromEmail, 
            fromName: emailConfig.fromName 
          });
          
          // Buscar template de email para cotações
          const { data: template } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('template_type', 'email_quote_request')
            .eq('active', true)
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          // Construir HTML do email
          const itemsList = quoteData.items.map((item: any) => 
            `<li style="padding: 8px 0; border-bottom: 1px solid #ddd;">${item.name} - Qtd: ${item.quantity}</li>`
          ).join('');
          
          let htmlContent = '';
          
          if (template?.message_content) {
            // Usar template do banco com substituição de variáveis
            const variables = {
              supplier_name: supplier_name || 'Fornecedor',
              client_name: quoteData.clientName || 'Cliente',
              quote_title: quoteData.quoteTitle,
              quote_id: quoteData.quoteId,
              deadline: quoteData.deadline,
              items_list: itemsList,
              client_contact: quoteData.clientContact || ''
            };
            
            htmlContent = replaceVariables(template.message_content, variables);
          } else {
            // Template padrão HTML
            htmlContent = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                  .container { max-width: 600px; margin: 0 auto; }
                  .header { background: #003366; color: white; padding: 20px; text-align: center; }
                  .content { padding: 20px; background: #f9f9f9; }
                  .button { background: #003366; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f0f0f0; }
                  ul { list-style: none; padding: 0; margin: 20px 0; }
                  li { padding: 8px 0; border-bottom: 1px solid #ddd; }
                  .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Nova Solicitação de Cotação</h1>
                  </div>
                  <div class="content">
                    <p>Olá, <strong>${supplier_name || 'Fornecedor'}</strong>!</p>
                    <p>Você recebeu uma nova solicitação de cotação de <strong>${quoteData.clientName}</strong>.</p>
                    
                    <div class="info-box">
                      <h3 style="margin-top: 0;">Detalhes da Cotação:</h3>
                      <p><strong>Título:</strong> ${quoteData.quoteTitle}</p>
                      <p><strong>ID:</strong> ${quoteData.quoteId}</p>
                      <p><strong>Prazo:</strong> ${quoteData.deadline}</p>
                      <p><strong>Contato:</strong> ${quoteData.clientContact}</p>
                    </div>
                    
                    <h3>Itens Solicitados:</h3>
                    <ul>${itemsList}</ul>
                    
                    <p style="text-align: center; margin-top: 30px;">
                      <span style="font-size: 14px; color: #666;">Acesse o sistema Cotiz para responder esta cotação</span>
                    </p>
                  </div>
                  <div class="footer">
                    <p>Este é um email automático. Por favor, não responda.</p>
                    <p><strong>Cotiz</strong> - Sistema de Gestão de Cotações</p>
                    <p>www.cotiz.com.br</p>
                  </div>
                </div>
              </body>
              </html>
            `;
          }
          
          // Enviar email usando Resend
          const emailResult = await sendEmail(emailConfig, {
            to: to || supplier_email || '',
            subject: template?.subject || `Nova Cotação: ${quoteData.quoteTitle}`,
            html: htmlContent,
            plainText: `Nova cotação de ${quoteData.clientName}: ${quoteData.quoteTitle}`
          });
          
          if (emailResult.success) {
            console.log('✅ [EMAIL] Email enviado com sucesso. MessageID:', emailResult.messageId);
            
            // Registrar log de envio
            try {
              await supabase.from('email_logs').insert({
                recipient: to || supplier_email || '',
                subject: template?.subject || `Nova Cotação: ${quoteData.quoteTitle}`,
                status: 'sent',
                provider: 'resend',
                message_id: emailResult.messageId
              });
            } catch (logErr) {
              console.warn('[EMAIL] Falha ao registrar email log:', logErr);
            }
            
            result = { 
              success: true, 
              messageId: emailResult.messageId,
              provider: 'resend'
            };
          } else {
            console.error('❌ [EMAIL] Erro ao enviar email:', emailResult.error);
            
            // Registrar log de falha
            try {
              await supabase.from('email_logs').insert({
                recipient: to || supplier_email || '',
                subject: template?.subject || `Nova Cotação: ${quoteData.quoteTitle}`,
                status: 'failed',
                provider: 'resend',
                error_message: emailResult.error
              });
            } catch (logErr) {
              console.warn('[EMAIL] Falha ao registrar email log:', logErr);
            }
            
            result = { 
              success: false, 
              error: emailResult.error || 'Falha ao enviar email'
            };
          }
        }
        
        // Registrar audit log
        try {
          await supabase.from('audit_logs').insert({
            action: 'EMAIL_SENT',
            entity_type: 'quotes',
            entity_id: quoteData.quoteId,
            details: { 
              type: 'email', 
              to: to || supplier_email, 
              supplier_name, 
              success: result.success, 
              messageId: (result as any).messageId,
              provider: 'resend'
            }
          });
        } catch (auditErr) {
          console.warn('[EMAIL] Falha ao registrar audit log:', auditErr);
        }
        
      } catch (error) {
        console.error('❌ [EMAIL] Exception ao processar email:', error);
        result = { 
          success: false, 
          error: `Erro ao processar email: ${(error as Error).message}`
        };
      }
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error('[NOTIFY] Erro:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  }
})
