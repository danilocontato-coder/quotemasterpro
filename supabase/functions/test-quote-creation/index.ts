import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter o token JWT do header Authorization
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Criar cliente Supabase com service role para operações admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Criar cliente Supabase com token do usuário para autenticação
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    console.log('🧪 Iniciando teste de criação de RFQ...');

    // 1. Testar autenticação
    const { data: userData, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !userData?.user) {
      console.error('❌ Erro de autenticação:', authError);
      return new Response(JSON.stringify({ 
        error: 'Usuário não autenticado',
        details: authError 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Usuário autenticado:', userData.user.id);

    // 2. Testar busca de perfil
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('client_id, name, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao buscar perfil',
        details: profileError 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!profile?.client_id) {
      console.error('❌ Cliente não encontrado no perfil');
      return new Response(JSON.stringify({ 
        error: 'Cliente não encontrado no perfil do usuário',
        profile 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Perfil encontrado:', profile);

    // 3. Testar criação de cotação simples
    const testQuote = {
      title: 'Teste de RFQ - ' + new Date().toISOString(),
      description: 'Cotação de teste criada via edge function',
      client_id: profile.client_id,
      created_by: userData.user.id,
      status: 'draft',
      client_name: profile.name || 'Cliente Teste'
    };

    console.log('📝 Tentando inserir cotação:', testQuote);

    const { data: newQuote, error: quoteError } = await supabaseClient
      .from('quotes')
      .insert(testQuote)
      .select()
      .single();

    if (quoteError) {
      console.error('❌ Erro ao inserir cotação:', quoteError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao criar cotação',
        details: quoteError,
        payload: testQuote
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Cotação criada com sucesso:', newQuote);

    // 4. Testar criação de item
    const testItem = {
      quote_id: newQuote.id,
      client_id: profile.client_id,
      product_name: 'Produto de Teste',
      quantity: 1
    };

    console.log('📋 Tentando inserir item:', testItem);

    const { data: newItem, error: itemError } = await supabaseClient
      .from('quote_items')
      .insert(testItem)
      .select()
      .single();

    if (itemError) {
      console.error('❌ Erro ao inserir item:', itemError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao inserir item',
        details: itemError,
        payload: testItem
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Item criado com sucesso:', newItem);

    return new Response(JSON.stringify({
      success: true,
      message: 'Teste concluído com sucesso!',
      data: {
        user: userData.user.id,
        profile,
        quote: newQuote,
        item: newItem
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: 'Erro interno',
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});