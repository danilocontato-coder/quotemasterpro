import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UBER-WEBHOOK] Received webhook');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('[UBER-WEBHOOK] Event:', body.event_type, 'Delivery ID:', body.resource_id);

    const { event_type, resource_id, meta } = body;

    // Buscar entrega pelo uber_delivery_id
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id, client_id, status')
      .eq('uber_delivery_id', resource_id)
      .single();

    if (deliveryError || !delivery) {
      console.error('[UBER-WEBHOOK] Delivery not found:', resource_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Delivery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newStatus = delivery.status;
    let notificationTitle = '';
    let notificationMessage = '';

    // Mapear eventos Uber para status internos
    switch (event_type) {
      case 'deliveries.delivery.created':
        newStatus = 'scheduled';
        notificationTitle = 'Entrega Criada';
        notificationMessage = 'Sua entrega foi criada e está sendo preparada';
        break;
      
      case 'deliveries.delivery_status.en_route_to_pickup':
        newStatus = 'in_transit';
        notificationTitle = 'Entregador a Caminho';
        notificationMessage = 'O entregador está a caminho para coletar o pedido';
        break;
      
      case 'deliveries.delivery_status.at_pickup':
        newStatus = 'in_transit';
        notificationTitle = 'Entregador no Local';
        notificationMessage = 'O entregador chegou para coletar o pedido';
        break;
      
      case 'deliveries.delivery_status.en_route_to_dropoff':
        newStatus = 'in_transit';
        notificationTitle = 'A Caminho do Destino';
        notificationMessage = 'Seu pedido está a caminho do endereço de entrega';
        break;
      
      case 'deliveries.delivery_status.at_dropoff':
        newStatus = 'in_transit';
        notificationTitle = 'Entregador no Destino';
        notificationMessage = 'O entregador chegou no endereço de entrega';
        break;
      
      case 'deliveries.delivery_status.completed':
        newStatus = 'delivered';
        notificationTitle = 'Entrega Concluída';
        notificationMessage = 'Sua entrega foi concluída com sucesso!';
        break;
      
      case 'deliveries.delivery_status.canceled':
        newStatus = 'cancelled';
        notificationTitle = 'Entrega Cancelada';
        notificationMessage = 'A entrega foi cancelada';
        break;
      
      case 'deliveries.delivery_status.returned':
        newStatus = 'returned';
        notificationTitle = 'Entrega Devolvida';
        notificationMessage = 'A entrega foi devolvida ao remetente';
        break;
    }

    // Atualizar dados do entrega
    const updateData: any = {
      status: newStatus,
      uber_status: event_type,
      updated_at: new Date().toISOString(),
    };

    // Atualizar localização do entregador se disponível
    if (meta?.courier?.location) {
      updateData.uber_courier_location = {
        lat: meta.courier.location.lat,
        lng: meta.courier.location.lng,
      };
    }

    // Atualizar dados do entregador
    if (meta?.courier) {
      if (meta.courier.name) updateData.uber_courier_name = meta.courier.name;
      if (meta.courier.phone_number) updateData.uber_courier_phone = meta.courier.phone_number;
    }

    // Atualizar tracking URL
    if (meta?.tracking_url) {
      updateData.uber_tracking_url = meta.tracking_url;
    }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', delivery.id);

    if (updateError) {
      console.error('[UBER-WEBHOOK] Update error:', updateError);
      throw updateError;
    }

    console.log('[UBER-WEBHOOK] Delivery updated:', delivery.id, 'New status:', newStatus);

    // Enviar notificação ao cliente
    if (notificationTitle && delivery.client_id) {
      await supabase.rpc('notify_client_users', {
        p_client_id: delivery.client_id,
        p_title: notificationTitle,
        p_message: notificationMessage,
        p_type: 'delivery',
        p_priority: 'normal',
        p_metadata: {
          delivery_id: delivery.id,
          event_type,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[UBER-WEBHOOK] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
