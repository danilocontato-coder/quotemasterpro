import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      token, 
      supplier_name, 
      supplier_email, 
      total_amount, 
      notes,
      attachment_url 
    } = await req.json();

    // Validar campos obrigatórios
    if (!token || !supplier_name || !supplier_email || !total_amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios faltando' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📦 [Quick Response] Processando resposta rápida:', { 
      token, 
      supplier_name, 
      supplier_email 
    });

    // Buscar token válido (usando short_code)
    const { data: tokenData, error: tokenError } = await supabase
      .from('quote_tokens')
      .select('quote_id, expires_at, client_id')
      .eq('short_code', token)
      .maybeSingle();

    if (tokenError) {
      console.error('❌ Erro ao buscar token:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao validar token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Validar expiração
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Buscar ou criar fornecedor
    let supplierId: string;
    
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('email', supplier_email)
      .maybeSingle();

    if (existingSupplier) {
      supplierId = existingSupplier.id;
      console.log('✅ Fornecedor existente encontrado:', supplierId);
    } else {
      // Criar novo fornecedor
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          name: supplier_name,
          email: supplier_email,
          status: 'active',
          type: 'local',
          client_id: tokenData.client_id
        })
        .select('id')
        .single();

      if (supplierError || !newSupplier) {
        console.error('❌ Erro ao criar fornecedor:', supplierError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar fornecedor' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      supplierId = newSupplier.id;
      console.log('✅ Novo fornecedor criado:', supplierId);
    }

    // Criar resposta da cotação
    const { data: response, error: responseError } = await supabase
      .from('quote_responses')
      .insert({
        quote_id: tokenData.quote_id,
        supplier_id: supplierId,
        supplier_name: supplier_name,
        total_amount: total_amount,
        notes: notes,
        attachments: attachment_url ? [attachment_url] : null,
        status: 'submitted'
      })
      .select()
      .single();

    if (responseError) {
      console.error('❌ Erro ao criar resposta:', responseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar resposta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Resposta criada com sucesso:', response.id);

    // Notificar cliente sobre nova proposta
    await supabase.functions.invoke('notify', {
      body: {
        client_id: tokenData.client_id,
        title: 'Nova Proposta Recebida',
        message: `${supplier_name} enviou uma proposta de R$ ${total_amount.toFixed(2)} para a cotação #${tokenData.quote_id}`,
        type: 'proposal',
        priority: 'normal',
        metadata: {
          quote_id: tokenData.quote_id,
          supplier_name: supplier_name,
          amount: total_amount
        }
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        response_id: response.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
