import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    console.log('[COMPLETE-TOUR] 📥 Requisição recebida:', { userId, timestamp: new Date().toISOString() });

    if (!userId) {
      console.error('[COMPLETE-TOUR] ❌ userId não fornecido');
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar se usuário existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, tour_completed')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[COMPLETE-TOUR] ❌ Usuário não encontrado:', profileError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[COMPLETE-TOUR] 👤 Usuário encontrado:', {
      userId: profile.id,
      email: profile.email,
      tourAlreadyCompleted: profile.tour_completed
    });

    // Atualizar tour_completed para true
    const { error } = await supabase
      .from('profiles')
      .update({ tour_completed: true })
      .eq('id', userId);

    if (error) {
      console.error('[COMPLETE-TOUR] ❌ Erro ao marcar tour como completo:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[COMPLETE-TOUR] ✅ Tour marcado como completo com sucesso');

    // Log de auditoria
    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'TOUR_COMPLETED',
      entity_type: 'user_onboarding',
      entity_id: userId,
      panel_type: 'system',
      details: { completed_at: new Date().toISOString() }
    });

    if (auditError) {
      console.error('[COMPLETE-TOUR] ⚠️ Erro ao criar audit log:', auditError);
      // Não falha a requisição por causa do audit log
    } else {
      console.log('[COMPLETE-TOUR] 📝 Audit log criado com sucesso');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[COMPLETE-TOUR] ❌ Erro na função complete-tour:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
