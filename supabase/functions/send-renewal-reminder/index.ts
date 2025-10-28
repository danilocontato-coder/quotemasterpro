import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    const reminderDays = [7, 3, 1];
    let totalNotifications = 0;
    
    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      
      const { data: subscriptions, error } = await supabaseClient
        .from('subscriptions')
        .select(`
          id,
          current_period_end,
          client_id,
          clients!client_id(name, email)
        `)
        .eq('status', 'active')
        .gte('current_period_end', targetDate.toISOString().split('T')[0])
        .lt('current_period_end', new Date(targetDate.getTime() + 86400000).toISOString().split('T')[0]);

      if (error) {
        console.error(`Erro ao buscar assinaturas para ${days} dias:`, error);
        continue;
      }

      for (const sub of subscriptions || []) {
        const { error: notifError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: sub.client_id,
            title: `Renovação em ${days} dia${days > 1 ? 's' : ''}`,
            message: `Sua assinatura será renovada em ${days} dia${days > 1 ? 's' : ''}. Certifique-se de que seus dados de pagamento estão atualizados.`,
            type: 'billing',
            priority: days === 1 ? 'high' : 'normal',
            read: false
          });

        if (!notifError) {
          totalNotifications++;
          console.log(`Lembrete enviado para ${sub.clients?.name} - ${days} dias`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${totalNotifications} notificações de renovação enviadas` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erro no send-renewal-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
