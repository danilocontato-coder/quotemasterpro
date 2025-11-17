import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SCHEDULE-DELIVERY] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log("Start");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    if (!userData?.user?.id) throw new Error("User not authenticated");
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    const { quote_id, scheduled_date, delivery_address, notes } = await req.json();
    if (!quote_id || !scheduled_date) throw new Error("quote_id and scheduled_date are required");
    
    log("Request parameters", { quote_id, scheduled_date, has_address: !!delivery_address });

    // Buscar local_code da cotação
    const { data: quote } = await supabase
      .from("quotes")
      .select("local_code")
      .eq("id", quote_id)
      .single();

    // Verificar se existe pagamento para esta cotação
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, client_id, supplier_id, status")
      .eq("quote_id", quote_id)
      .single();

    if (paymentError || !payment) {
      throw new Error("Nenhum pagamento encontrado para esta cotação.");
    }

    // Verificar se pagamento está em custódia
    if (payment.status !== "in_escrow") {
      const statusMessages: Record<string, string> = {
        'pending': 'O pagamento ainda está pendente. Aguarde a confirmação do pagamento pelo cliente.',
        'paid': 'O pagamento já foi liberado. Esta entrega já foi confirmada.',
        'completed': 'O pagamento já foi finalizado. Esta entrega já foi confirmada.',
        'overdue': 'O pagamento está vencido. Solicite ao cliente que regularize o pagamento.',
        'cancelled': 'O pagamento foi cancelado. Entre em contato com o suporte.'
      };

      const detailedMessage = statusMessages[payment.status] || 
        'O pagamento não está no status adequado para agendamento de entrega.';

      throw new Error(
        `Não é possível agendar a entrega. ${detailedMessage}\n\n` +
        `Status atual: ${payment.status}\n` +
        `Status necessário: in_escrow (pagamento confirmado em custódia)\n\n` +
        `Se o pagamento foi recentemente confirmado, aguarde alguns instantes para sincronização. ` +
        `Caso o problema persista, entre em contato com o suporte.`
      );
    }

    // Verificar se usuário é o fornecedor da cotação
    const { data: profile } = await supabase
      .from("profiles")
      .select("supplier_id")
      .eq("id", user.id)
      .single();

    if (!profile?.supplier_id || profile.supplier_id !== payment.supplier_id) {
      throw new Error("Apenas o fornecedor designado pode agendar a entrega");
    }

    // Buscar entrega existente (placeholder ou já agendada)
    const { data: existingDelivery } = await supabase
      .from("deliveries")
      .select("id, status")
      .eq("quote_id", quote_id)
      .eq("supplier_id", profile.supplier_id)
      .maybeSingle();

    let delivery;
    
    if (existingDelivery && (existingDelivery.status === 'pending' || existingDelivery.status === 'scheduled')) {
      // ATUALIZAR delivery placeholder existente
      log("Updating existing placeholder delivery", { deliveryId: existingDelivery.id });
      
      const updateData: Record<string, any> = {
        scheduled_date: scheduled_date,
        notes: notes,
        status: "scheduled",
        updated_at: new Date().toISOString()
      };
      
      // Only update delivery_address if provided
      if (delivery_address) {
        updateData.delivery_address = delivery_address;
      }
      
      log("Update data", updateData);
      
      const { data: updatedDelivery, error: updateError } = await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", existingDelivery.id)
        .select()
        .single();
      
      if (updateError) {
        log("Update error", { error: updateError, code: updateError.code, details: updateError.details });
        throw new Error(
          `Não foi possível atualizar o status da entrega: ${updateError.message}\n` +
          `Código: ${updateError.code || 'N/A'}\n` +
          `Detalhes: ${updateError.details || 'N/A'}\n\n` +
          `Se o erro persistir, verifique os logs da edge function para mais detalhes.`
        );
      }
      delivery = updatedDelivery;
      
    } else if (existingDelivery) {
      // Já existe entrega em outro status (completed, etc)
      throw new Error("Já existe uma entrega finalizada para esta cotação");
      
    } else {
      // INSERIR nova delivery (fallback para casos legacy)
      log("Creating new delivery (legacy fallback)");
      
      const { data: newDelivery, error: insertError } = await supabase
        .from("deliveries")
        .insert({
          payment_id: payment.id,
          quote_id: quote_id,
          client_id: payment.client_id,
          supplier_id: payment.supplier_id,
          scheduled_date: scheduled_date,
          delivery_address: delivery_address,
          notes: notes,
          status: "scheduled"
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      delivery = newDelivery;
    }

    // Atualizar status da cotação para 'delivering'
    await supabase
      .from("quotes")
      .update({
        status: "delivering",
        updated_at: new Date().toISOString()
      })
      .eq("id", quote_id);

    // Notificar cliente sobre agendamento
    await supabase.functions.invoke('create-notification', {
      body: {
        user_ids: [payment.client_id],
        title: 'Entrega Agendada',
        message: `A entrega da cotação #${quote?.local_code || quote_id} foi agendada para ${new Date(scheduled_date).toLocaleDateString('pt-BR')}.`,
        type: 'delivery_scheduled',
        priority: 'normal',
        metadata: {
          delivery_id: delivery.id,
          quote_id: quote_id,
          scheduled_date: scheduled_date,
          action_url: '/quotes'
        }
      }
    });

    // Log de auditoria
    await supabase
      .from("audit_logs")
      .insert({
        user_id: user.id,
        action: "DELIVERY_SCHEDULED",
        entity_type: "deliveries",
        entity_id: delivery.id,
        panel_type: "supplier",
        details: {
          quote_id: quote_id,
          scheduled_date: scheduled_date,
          delivery_address: delivery_address
        }
      });

    log("Delivery scheduled successfully", { deliveryId: delivery.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        delivery_id: delivery.id,
        message: "Delivery scheduled successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { 
      message,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Provide more helpful error messages
    let userMessage = message;
    
    // Check for common database trigger errors
    if (message?.includes('current_setting') || message?.includes('app.supabase_url')) {
      userMessage = 
        "Erro de configuração do sistema. Os parâmetros do banco de dados não estão configurados.\n\n" +
        "Por favor, entre em contato com o suporte técnico informando este erro:\n" +
        "Faltam configurações: app.supabase_url e app.service_role_key no banco de dados.\n\n" +
        "Erro original: " + message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        technical_details: message,
        hint: "Verifique os logs da edge function 'schedule-delivery' para mais detalhes"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});