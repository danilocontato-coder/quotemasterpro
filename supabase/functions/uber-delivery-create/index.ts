import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

interface CreateDeliveryRequest {
  deliveryId: string;
  quoteId: string;
  pickup: {
    address: string;
    name: string;
    phone: string;
    notes?: string;
  };
  dropoff: {
    address: string;
    name: string;
    phone: string;
    notes?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UBER-CREATE] Starting delivery creation');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Buscar credenciais Uber
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'uber_credentials')
      .single();

    if (settingsError || !settings?.setting_value) {
      throw new Error('Credenciais Uber não configuradas');
    }

    const uberCreds = settings.setting_value as any;
    const { customer_id, client_id, client_secret, api_url } = uberCreds;

    console.log('[UBER-CREATE] Autenticando com Uber...');

    // Obter access token
    const tokenResponse = await fetch(`${api_url}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: 'client_credentials',
        scope: 'eats.deliveries direct.organizations',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Falha na autenticação Uber');
    }

    const { access_token } = await tokenResponse.json();

    const body: CreateDeliveryRequest = await req.json();

    // Criar entrega
    const deliveryPayload = {
      quote_id: body.quoteId,
      pickup_address: body.pickup.address,
      pickup_name: body.pickup.name,
      pickup_phone_number: body.pickup.phone,
      pickup_notes: body.pickup.notes || '',
      dropoff_address: body.dropoff.address,
      dropoff_name: body.dropoff.name,
      dropoff_phone_number: body.dropoff.phone,
      dropoff_notes: body.dropoff.notes || '',
      manifest_items: [
        {
          name: 'Package',
          quantity: 1,
          size: 'small',
        },
      ],
      undeliverable_action: 'leave_at_door',
    };

    console.log('[UBER-CREATE] Criando entrega na Uber...');

    const deliveryResponse = await fetch(
      `${api_url}/v1/customers/${customer_id}/deliveries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryPayload),
      }
    );

    if (!deliveryResponse.ok) {
      const errorText = await deliveryResponse.text();
      console.error('[UBER-CREATE] Erro ao criar entrega:', errorText);
      throw new Error('Falha ao criar entrega Uber');
    }

    const deliveryData = await deliveryResponse.json();
    console.log('[UBER-CREATE] Entrega criada:', deliveryData);

    // Atualizar registro no banco
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        delivery_method: 'uber',
        uber_delivery_id: deliveryData.id,
        uber_quote_id: body.quoteId,
        uber_status: deliveryData.status,
        uber_tracking_url: deliveryData.tracking_url,
        uber_fee: deliveryData.fee / 100, // Converter centavos para reais
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.deliveryId);

    if (updateError) {
      console.error('[UBER-CREATE] Erro ao atualizar banco:', updateError);
      throw updateError;
    }

    // Criar notificação para o cliente
    const { data: delivery } = await supabase
      .from('deliveries')
      .select('client_id')
      .eq('id', body.deliveryId)
      .single();

    if (delivery?.client_id) {
      await supabase.rpc('notify_client_users', {
        p_client_id: delivery.client_id,
        p_title: 'Entrega Uber Agendada',
        p_message: 'Sua entrega foi agendada via Uber Direct e está a caminho!',
        p_type: 'delivery',
        p_priority: 'normal',
        p_metadata: {
          delivery_id: body.deliveryId,
          tracking_url: deliveryData.tracking_url,
        },
      });
    }

    console.log('[UBER-CREATE] Entrega criada com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        delivery: {
          id: deliveryData.id,
          status: deliveryData.status,
          tracking_url: deliveryData.tracking_url,
          courier: deliveryData.courier,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[UBER-CREATE] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
