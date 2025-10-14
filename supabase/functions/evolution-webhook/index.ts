import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { normalizePhone } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookMessage {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
    messageTimestamp?: number;
  };
}

interface SupplierResponse {
  intent: 'accepted' | 'counter_offer' | 'rejected' | 'question' | 'unclear';
  extracted_amount: number | null;
  confidence: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar webhook secret se configurado
    if (webhookSecret) {
      const authHeader = req.headers.get('authorization') || req.headers.get('x-webhook-token');
      if (!authHeader || !authHeader.includes(webhookSecret)) {
        console.log('⚠️ Unauthorized webhook attempt');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const payload: WebhookMessage = await req.json();
    console.log('📩 Webhook recebido:', JSON.stringify(payload, null, 2));

    // Extrair dados da mensagem
    const event = payload.event || '';
    const data = payload.data;

    // Ignorar mensagens enviadas por nós mesmos
    if (data?.key?.fromMe) {
      console.log('⏭️ Ignorando mensagem própria');
      return new Response(JSON.stringify({ status: 'ignored', reason: 'own_message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extrair telefone e texto
    const rawPhone = data?.key?.remoteJid?.split('@')[0] || '';
    const normalizedPhone = normalizePhone(rawPhone);
    const messageText = data?.message?.conversation || data?.message?.extendedTextMessage?.text || '';
    const messageId = data?.key?.id || '';
    const senderName = data?.pushName || '';

    if (!normalizedPhone || !messageText) {
      console.log('⚠️ Mensagem sem telefone ou texto');
      return new Response(JSON.stringify({ status: 'ignored', reason: 'invalid_message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📱 Telefone: ${normalizedPhone}, Mensagem: "${messageText}"`);

    // Buscar negociação ativa para este fornecedor
    const { data: negotiations, error: negError } = await supabase
      .from('ai_negotiations')
      .select(`
        *,
        quotes!inner(
          id,
          local_code,
          title,
          supplier_id,
          client_id
        )
      `)
      .eq('status', 'negotiating')
      .order('created_at', { ascending: false });

    if (negError) {
      console.error('❌ Erro ao buscar negociações:', negError);
      throw negError;
    }

    if (!negotiations || negotiations.length === 0) {
      console.log('⚠️ Nenhuma negociação ativa encontrada');
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no_active_negotiations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar fornecedor pelo telefone
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, name, whatsapp, phone')
      .or(`whatsapp.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
      .maybeSingle();

    if (!supplier) {
      console.log('⚠️ Fornecedor não encontrado para telefone:', normalizedPhone);
      return new Response(JSON.stringify({ status: 'ignored', reason: 'supplier_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Encontrar negociação deste fornecedor
    const activeNegotiation = negotiations.find(n => 
      (n.quotes as any)?.supplier_id === supplier.id
    );

    if (!activeNegotiation) {
      console.log('⚠️ Nenhuma negociação ativa para este fornecedor');
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no_negotiation_for_supplier' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Negociação encontrada: ${activeNegotiation.id} para cotação ${(activeNegotiation.quotes as any)?.local_code}`);

    // Processar resposta com GPT-5
    let parsedResponse: SupplierResponse | null = null;

    if (openaiKey) {
      try {
        const interpretPrompt = `Você é um assistente que analisa respostas de fornecedores em negociações.

Contexto da negociação:
- Valor original da cotação: R$ ${activeNegotiation.original_amount}
- Já enviamos uma proposta de negociação por WhatsApp

Resposta do fornecedor:
"${messageText}"

Analise e classifique a intenção do fornecedor:
1. "accepted" - aceitou explicitamente o valor proposto
2. "counter_offer" - fez uma contra-proposta com novo valor (extrair valor)
3. "rejected" - recusou negociar ou disse que não pode baixar o preço
4. "question" - tem dúvida ou pediu mais informações
5. "unclear" - mensagem ambígua ou fora do contexto

IMPORTANTE: Se houver menção de valor monetário (ex: "R$ 950", "950 reais", "novecentos e cinquenta"), considere como "counter_offer" e extraia o valor numérico.

Responda APENAS com JSON válido:
{
  "intent": "accepted" | "counter_offer" | "rejected" | "question" | "unclear",
  "extracted_amount": número ou null,
  "confidence": 0-100,
  "reasoning": "breve explicação"
}`;

        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Você é um assistente especializado em análise de negociações comerciais.' },
              { role: 'user', content: interpretPrompt }
            ],
            temperature: 0.3,
            max_tokens: 300
          })
        });

        if (gptResponse.ok) {
          const gptData = await gptResponse.json();
          const content = gptData.choices[0]?.message?.content || '{}';
          parsedResponse = JSON.parse(content);
          console.log('🤖 Análise GPT:', parsedResponse);
        }
      } catch (gptError) {
        console.error('⚠️ Erro ao processar com GPT:', gptError);
      }
    }

    // Atualizar conversation_log
    const currentLog = activeNegotiation.conversation_log || [];
    const newEntry = {
      role: 'supplier',
      message: messageText,
      timestamp: new Date().toISOString(),
      channel: 'whatsapp',
      messageId,
      phone: normalizedPhone,
      supplier_name: supplier.name,
      parsed: parsedResponse || undefined
    };

    const updatedLog = [...currentLog, newEntry];

    // Determinar novo status
    let newStatus = activeNegotiation.status;
    let negotiatedAmount = activeNegotiation.negotiated_amount;
    let discountPercentage = activeNegotiation.discount_percentage;

    if (parsedResponse) {
      if (parsedResponse.intent === 'accepted' && parsedResponse.confidence > 70) {
        newStatus = 'pending_approval';
        negotiatedAmount = activeNegotiation.original_amount; // Aceitou nossa proposta
        discountPercentage = 0;
      } else if (parsedResponse.intent === 'counter_offer' && parsedResponse.extracted_amount) {
        newStatus = 'pending_approval';
        negotiatedAmount = parsedResponse.extracted_amount;
        const discount = ((activeNegotiation.original_amount - parsedResponse.extracted_amount) / activeNegotiation.original_amount) * 100;
        discountPercentage = Math.max(0, discount);
      } else if (parsedResponse.intent === 'rejected' && parsedResponse.confidence > 70) {
        newStatus = 'failed';
      }
    }

    // Atualizar negociação
    const { error: updateError } = await supabase
      .from('ai_negotiations')
      .update({
        conversation_log: updatedLog,
        status: newStatus,
        negotiated_amount: negotiatedAmount,
        discount_percentage: discountPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeNegotiation.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar negociação:', updateError);
      throw updateError;
    }

    // Criar notificação para o cliente se mudou status
    if (newStatus !== activeNegotiation.status) {
      const quote = activeNegotiation.quotes as any;
      const notificationData = {
        user_id: null as string | null, // Will be set by trigger
        title: newStatus === 'pending_approval' 
          ? '🤝 Fornecedor Respondeu Negociação'
          : newStatus === 'failed'
          ? '❌ Negociação Recusada'
          : '💬 Nova Mensagem na Negociação',
        message: newStatus === 'pending_approval'
          ? `${supplier.name} respondeu a negociação da cotação #${quote?.local_code}. Valor: R$ ${negotiatedAmount?.toFixed(2)}`
          : newStatus === 'failed'
          ? `${supplier.name} recusou a negociação da cotação #${quote?.local_code}`
          : `Nova mensagem de ${supplier.name} na cotação #${quote?.local_code}`,
        type: 'ai_negotiation',
        priority: 'high',
        action_url: '/ai-negotiations',
        metadata: {
          negotiation_id: activeNegotiation.id,
          quote_id: quote?.id,
          supplier_name: supplier.name,
          new_status: newStatus,
          parsed_intent: parsedResponse?.intent
        },
        client_id: quote?.client_id
      };

      // Buscar usuários do cliente para notificar
      const { data: clientUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('client_id', quote?.client_id)
        .eq('active', true);

      if (clientUsers && clientUsers.length > 0) {
        for (const user of clientUsers) {
          await supabase
            .from('notifications')
            .insert({ ...notificationData, user_id: user.id });
        }
      }
    }

    // Criar audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: null,
        action: 'AI_NEGOTIATION_MESSAGE_RECEIVED',
        entity_type: 'ai_negotiations',
        entity_id: activeNegotiation.id,
        panel_type: 'system',
        details: {
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          phone: normalizedPhone,
          message: messageText,
          parsed: parsedResponse,
          new_status: newStatus
        }
      });

    console.log('✅ Mensagem processada com sucesso');

    return new Response(JSON.stringify({ 
      status: 'success',
      negotiation_id: activeNegotiation.id,
      new_status: newStatus,
      parsed: parsedResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
