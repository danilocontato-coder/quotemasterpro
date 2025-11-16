import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { resolveEvolutionConfig, sendEvolutionWhatsApp, normalizePhone } from '../_shared/evolution.ts';
import { resolveEmailConfig, sendEmail, replaceVariables } from '../_shared/email.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface OverdueInvoice {
  id: string;
  client_id: string;
  subscription_id: string | null;
  amount: number;
  due_date: string;
  status: string;
  boleto_url: string | null;
  asaas_invoice_url: string | null;
  client: {
    id: string;
    name: string;
    company_name: string | null;
    email: string;
    phone: string | null;
    whatsapp: string | null;
  };
  subscription: {
    plan_id: string;
  } | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Iniciando envio de lembretes de cobrança...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar configurações de lembretes
    const { data: settings, error: settingsError } = await supabase
      .from('financial_settings')
      .select('*')
      .maybeSingle();

    if (settingsError) {
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`);
    }

    if (!settings || !settings.overdue_reminder_enabled) {
      console.log('⏸️ Lembretes automáticos desabilitados');
      return new Response(
        JSON.stringify({ success: true, message: 'Lembretes desabilitados', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const schedule: number[] = settings.overdue_reminder_schedule || [1, 3, 7, 15, 30];
    const channels: string[] = settings.overdue_reminder_channels || ['whatsapp', 'email'];
    const stopAfterDays = settings.overdue_reminder_stop_after_days || 45;
    const lateFeePercentage = settings.late_fee_percentage || 2.0;

    console.log(`📅 Agenda de lembretes: ${schedule.join(', ')} dias`);
    console.log(`📢 Canais ativos: ${channels.join(', ')}`);
    console.log(`⏱️ Parar após: ${stopAfterDays} dias`);

    // 2. Buscar faturas em atraso
    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        client_id,
        subscription_id,
        amount,
        due_date,
        status,
        boleto_url,
        asaas_invoice_url,
        client:clients (
          id,
          name,
          company_name,
          email,
          phone,
          whatsapp
        ),
        subscription:subscriptions (
          plan_id
        )
      `)
      .in('status', ['open', 'past_due'])
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true });

    if (invoicesError) {
      throw new Error(`Erro ao buscar faturas: ${invoicesError.message}`);
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      console.log('✅ Nenhuma fatura em atraso encontrada');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma fatura em atraso', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Encontradas ${overdueInvoices.length} faturas em atraso`);

    const results = {
      processed: 0,
      sent_whatsapp: 0,
      sent_email: 0,
      skipped: 0,
      errors: 0,
    };

    // 3. Processar cada fatura
    for (const invoice of overdueInvoices as unknown as OverdueInvoice[]) {
      try {
        results.processed++;

        // Calcular dias em atraso
        const dueDate = new Date(invoice.due_date);
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`\n📄 Processando fatura ${invoice.id}: ${daysOverdue} dias em atraso`);

        // Verificar se já passou do limite
        if (daysOverdue > stopAfterDays) {
          console.log(`⏭️ Fatura excedeu limite de ${stopAfterDays} dias - ignorando`);
          results.skipped++;
          continue;
        }

        // Verificar se está no schedule
        if (!schedule.includes(daysOverdue)) {
          console.log(`⏭️ Dia ${daysOverdue} não está no schedule - ignorando`);
          results.skipped++;
          continue;
        }

        // Verificar se já enviou lembrete para este dia
        const { data: existingReminder } = await supabase
          .from('overdue_reminders')
          .select('id')
          .eq('invoice_id', invoice.id)
          .eq('reminder_day', daysOverdue)
          .maybeSingle();

        if (existingReminder) {
          console.log(`⏭️ Lembrete D+${daysOverdue} já enviado anteriormente - ignorando`);
          results.skipped++;
          continue;
        }

        // Calcular multa
        const lateFee = (invoice.amount * lateFeePercentage / 100) * daysOverdue;
        const totalWithFee = invoice.amount + lateFee;

        // Preparar variáveis para templates
        const clientName = invoice.client?.company_name || invoice.client?.name || 'Cliente';
        const planName = invoice.subscription?.plan_id || 'seu plano';
        const boletoUrl = invoice.boleto_url || invoice.asaas_invoice_url;

        const variables = {
          client_name: clientName,
          plan_name: planName,
          invoice_id: invoice.id,
          invoice_amount: invoice.amount.toFixed(2),
          due_date: new Date(invoice.due_date).toLocaleDateString('pt-BR'),
          days_overdue: daysOverdue.toString(),
          boleto_url: boletoUrl || '',
          late_fee: lateFee.toFixed(2),
          total_with_fee: totalWithFee.toFixed(2),
        };

        // Criar registro de lembrete
        const reminderRecord = {
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          subscription_id: invoice.subscription_id,
          reminder_day: daysOverdue,
          days_overdue: daysOverdue,
          invoice_amount: invoice.amount,
          invoice_due_date: invoice.due_date,
          sent_via_whatsapp: false,
          sent_via_email: false,
        };

        // Enviar WhatsApp
        if (channels.includes('whatsapp') && invoice.client?.whatsapp) {
          try {
            console.log('📱 Enviando WhatsApp...');
            
            const { data: whatsappTemplate } = await supabase
              .from('whatsapp_templates')
              .select('*')
              .eq('template_type', 'overdue_reminder')
              .eq('is_global', true)
              .eq('active', true)
              .order('is_default', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (whatsappTemplate) {
              const message = replaceVariables(whatsappTemplate.message_content, variables);
              const evoConfig = await resolveEvolutionConfig(supabase, invoice.client_id, true);
              
              if (evoConfig.apiUrl && evoConfig.token) {
                const normalizedPhone = normalizePhone(invoice.client.whatsapp);
                const result = await sendEvolutionWhatsApp(evoConfig, normalizedPhone, message);
                
                if (result.success) {
                  reminderRecord.sent_via_whatsapp = true;
                  reminderRecord.whatsapp_sent_at = new Date().toISOString();
                  reminderRecord.whatsapp_message_id = result.messageId;
                  results.sent_whatsapp++;
                  console.log('✅ WhatsApp enviado com sucesso');
                } else {
                  reminderRecord.whatsapp_error = result.error || 'Erro desconhecido';
                  console.log(`❌ Erro ao enviar WhatsApp: ${result.error}`);
                }
              } else {
                console.log('⚠️ Evolution API não configurada');
              }
            } else {
              console.log('⚠️ Template WhatsApp não encontrado');
            }
          } catch (whatsappError: any) {
            console.error('❌ Erro no envio WhatsApp:', whatsappError);
            reminderRecord.whatsapp_error = whatsappError.message;
          }
        }

        // Enviar E-mail
        if (channels.includes('email') && invoice.client?.email) {
          try {
            console.log('📧 Enviando E-mail...');
            
            const { data: emailTemplate } = await supabase
              .from('email_templates')
              .select('*')
              .eq('template_type', 'overdue_reminder')
              .eq('is_global', true)
              .eq('active', true)
              .order('is_default', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (emailTemplate) {
              const subject = replaceVariables(emailTemplate.subject, variables);
              const htmlContent = replaceVariables(emailTemplate.html_content, variables);
              const plainText = replaceVariables(emailTemplate.plain_text_content || '', variables);
              
              const emailConfig = await resolveEmailConfig(supabase, invoice.client_id);
              
              if (emailConfig) {
                const result = await sendEmail(emailConfig, {
                  to: invoice.client.email,
                  subject,
                  html: htmlContent,
                  plainText: plainText || undefined,
                });
                
                if (result.success) {
                  reminderRecord.sent_via_email = true;
                  reminderRecord.email_sent_at = new Date().toISOString();
                  reminderRecord.email_message_id = result.messageId;
                  results.sent_email++;
                  console.log('✅ E-mail enviado com sucesso');
                } else {
                  reminderRecord.email_error = result.error || 'Erro desconhecido';
                  console.log(`❌ Erro ao enviar e-mail: ${result.error}`);
                }
              } else {
                console.log('⚠️ Configuração de e-mail não encontrada');
              }
            } else {
              console.log('⚠️ Template de e-mail não encontrado');
            }
          } catch (emailError: any) {
            console.error('❌ Erro no envio e-mail:', emailError);
            reminderRecord.email_error = emailError.message;
          }
        }

        // Salvar registro de lembrete
        const { error: insertError } = await supabase
          .from('overdue_reminders')
          .insert(reminderRecord);

        if (insertError) {
          console.error('❌ Erro ao salvar registro:', insertError);
          results.errors++;
        }

        // Registrar em audit_logs
        await supabase.from('audit_logs').insert({
          action: 'OVERDUE_REMINDER_SENT',
          entity_type: 'invoices',
          entity_id: invoice.id,
          panel_type: 'system',
          details: {
            reminder_day: daysOverdue,
            days_overdue: daysOverdue,
            sent_whatsapp: reminderRecord.sent_via_whatsapp,
            sent_email: reminderRecord.sent_via_email,
            client_id: invoice.client_id,
          },
        });

      } catch (invoiceError: any) {
        console.error(`❌ Erro ao processar fatura ${invoice.id}:`, invoiceError);
        results.errors++;
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`✅ Processadas: ${results.processed}`);
    console.log(`📱 WhatsApp enviados: ${results.sent_whatsapp}`);
    console.log(`📧 E-mails enviados: ${results.sent_email}`);
    console.log(`⏭️ Ignoradas: ${results.skipped}`);
    console.log(`❌ Erros: ${results.errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lembretes processados com sucesso',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno',
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);
