import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  quote_id?: string;
  hours_since_sent?: number; // Enviar lembrete após X horas sem resposta
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send quote reminders function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json() as ReminderRequest;
    const hoursSinceSent = body.hours_since_sent || 48; // Padrão: 48 horas

    // Buscar cotações que precisam de lembrete
    let quotesQuery = supabase
      .from('quotes')
      .select('*')
      .eq('status', 'sent')
      .lt('created_at', new Date(Date.now() - hoursSinceSent * 60 * 60 * 1000).toISOString());

    if (body.quote_id) {
      quotesQuery = quotesQuery.eq('id', body.quote_id);
    }

    const { data: quotes, error: quotesError } = await quotesQuery;

    if (quotesError || !quotes || quotes.length === 0) {
      console.log('No quotes need reminders');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma cotação precisa de lembrete', reminders_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let remindersSent = 0;
    const results: any[] = [];

    for (const quote of quotes) {
      console.log(`Processing reminders for quote ${quote.id}`);

      // Buscar fornecedores que ainda não responderam e não recusaram
      const { data: pendingStatuses, error: statusError } = await supabase
        .from('quote_supplier_status')
        .select(`
          *,
          suppliers (*)
        `)
        .eq('quote_id', quote.id)
        .in('status', ['pending', 'reminded_once']);

      if (statusError || !pendingStatuses || pendingStatuses.length === 0) {
        console.log(`No pending suppliers for quote ${quote.id}`);
        continue;
      }

      // Resolver configuração Evolution API
      const evo = await resolveEvolutionConfig(supabase, quote.client_id);
      
      if (!evo.apiUrl || !evo.token) {
        console.error(`Evolution API not configured for client ${quote.client_id}`);
        results.push({
          quote_id: quote.id,
          error: 'Evolution API não configurada'
        });
        continue;
      }

      // Buscar cliente
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', quote.client_id)
        .single();

      // Enviar lembretes
      for (const supplierStatus of pendingStatuses) {
        const supplier = supplierStatus.suppliers;
        
        if (!supplier) continue;

        // Verificar se deve enviar lembrete (não enviar mais que 2 vezes)
        if (supplierStatus.status === 'reminded_twice') {
          console.log(`Supplier ${supplier.id} already reminded twice, skipping`);
          continue;
        }

        // Verificar tempo desde último lembrete (mínimo 24h)
        if (supplierStatus.last_reminder_sent_at) {
          const hoursSinceLastReminder = (Date.now() - new Date(supplierStatus.last_reminder_sent_at).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastReminder < 24) {
            console.log(`Too soon to remind supplier ${supplier.id} again`);
            continue;
          }
        }

        // Buscar token único para este fornecedor
        const { data: token } = await supabase
          .from('quote_tokens')
          .select('short_code, full_token')
          .eq('quote_id', quote.id)
          .eq('supplier_id', supplier.id)
          .maybeSingle();

        if (!token) {
          console.log(`No token found for supplier ${supplier.id} on quote ${quote.id}`);
          continue;
        }

        // Construir link único
        const baseUrl = Deno.env.get('FRONTEND_BASE_URL') || 'https://bcadcdb0-8f04-4a14-8998-22e01e1b27d7.lovableproject.com';
        const proposalLink = `${baseUrl}/s/${token.short_code}`;

        // Preparar mensagem de lembrete
        const reminderCount = supplierStatus.status === 'pending' ? 'primeiro' : 'segundo';
        const message = `🔔 *Lembrete - Cotação Pendente*

Olá ${supplier.name}!

Este é o *${reminderCount} lembrete* sobre a cotação *${quote.title}* (${quote.id}).

${client ? `Cliente: ${client.name}` : ''}
Prazo: ${quote.deadline ? new Date(quote.deadline).toLocaleDateString('pt-BR') : 'Não definido'}

⏰ *Ainda não recebemos sua proposta!*

📋 Para responder, acesse: ${proposalLink}

Caso não tenha interesse, responda com *"Não tenho interesse"* ou acesse o link acima para declinar formalmente.

Aguardamos seu retorno! 🙏`;

        // Enviar WhatsApp via Evolution API
        const phone = normalizePhone(supplier.whatsapp || supplier.phone || '');
        
        if (!phone) {
          console.log(`No valid phone for supplier ${supplier.id}`);
          continue;
        }

        const whatsappResult = await sendEvolutionWhatsApp(evo, phone, message);

        if (whatsappResult.success) {
          // Atualizar status
          const newStatus = supplierStatus.status === 'pending' ? 'reminded_once' : 'reminded_twice';
          
          await supabase
            .from('quote_supplier_status')
            .update({
              status: newStatus,
              last_reminder_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', supplierStatus.id);

          remindersSent++;
          
          results.push({
            quote_id: quote.id,
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            success: true,
            reminder_count: newStatus === 'reminded_once' ? 1 : 2
          });

          console.log(`Reminder sent to supplier ${supplier.name} for quote ${quote.id}`);
        } else {
          results.push({
            quote_id: quote.id,
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            success: false,
            error: whatsappResult.error
          });

          console.error(`Failed to send reminder to supplier ${supplier.name}:`, whatsappResult.error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Lembretes enviados com sucesso`,
        reminders_sent: remindersSent,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-quote-reminders:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
