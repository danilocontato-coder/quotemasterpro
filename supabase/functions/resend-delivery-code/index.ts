import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[RESEND-DELIVERY-CODE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
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

    const { delivery_id } = await req.json();
    if (!delivery_id) throw new Error("delivery_id is required");
    
    log("Request parameters", { delivery_id });

    // Verificar se o usuário tem acesso a esta entrega
    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      throw new Error("Perfil de cliente não encontrado");
    }

    // Buscar entrega e verificar se pertence ao cliente
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select(`
        id,
        client_id,
        supplier_id,
        quote_id,
        status,
        quotes!inner(local_code)
      `)
      .eq("id", delivery_id)
      .eq("client_id", profile.client_id)
      .single();

    if (deliveryError || !delivery) {
      throw new Error("Entrega não encontrada ou você não tem permissão para acessá-la");
    }

    if (delivery.status !== 'scheduled') {
      throw new Error("O código só pode ser reenviado para entregas agendadas");
    }

    log("Delivery found", { delivery_id, quote_id: delivery.quote_id });

    // Buscar código de confirmação ativo
    const { data: confirmationCode, error: codeError } = await supabase
      .from("delivery_confirmations")
      .select("confirmation_code, expires_at")
      .eq("delivery_id", delivery_id)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !confirmationCode) {
      throw new Error("Código de confirmação não encontrado ou expirado. Entre em contato com o suporte.");
    }

    log("Active code found", { code: confirmationCode.confirmation_code });

    // Buscar dados do cliente
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("name, email, phone")
      .eq("id", delivery.client_id)
      .single();

    if (clientError || !clientData) {
      throw new Error("Dados do cliente não encontrados");
    }

    log("Client data retrieved", { email: clientData.email, hasPhone: !!clientData.phone });

    // Enviar código via e-mail
    let emailSent = false;
    let whatsappSent = false;

    try {
      const emailResult = await supabase.functions.invoke('send-delivery-code-email', {
        body: {
          email: clientData.email,
          client_name: clientData.name,
          confirmation_code: confirmationCode.confirmation_code,
          delivery_id: delivery.id,
          quote_id: delivery.quote_id
        }
      });
      
      if (emailResult.error) {
        log("Email send failed", { error: emailResult.error });
      } else {
        emailSent = true;
        log("Email sent successfully");
      }
    } catch (emailError) {
      log("Email send error", { error: emailError });
    }

    // Enviar código via WhatsApp (se telefone disponível)
    if (clientData.phone) {
      try {
        const whatsappResult = await supabase.functions.invoke('send-whatsapp', {
          body: {
            to: clientData.phone,
            template: 'delivery_code',
            template_data: {
              client_name: clientData.name,
              confirmation_code: confirmationCode.confirmation_code,
              delivery_id: delivery.id,
              quote_id: delivery.quote_id
            }
          }
        });
        
        if (whatsappResult.error) {
          log("WhatsApp send failed", { error: whatsappResult.error });
        } else {
          whatsappSent = true;
          log("WhatsApp sent successfully");
        }
      } catch (whatsappError) {
        log("WhatsApp send error", { error: whatsappError });
      }
    }

    // Registrar no audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "DELIVERY_CODE_RESENT",
      entity_type: "deliveries",
      entity_id: delivery.id,
      panel_type: "client",
      details: {
        quote_id: delivery.quote_id,
        confirmation_code: confirmationCode.confirmation_code,
        email_sent: emailSent,
        whatsapp_sent: whatsappSent,
        resent_at: new Date().toISOString()
      }
    });

    if (!emailSent && !whatsappSent) {
      throw new Error("Não foi possível enviar o código por nenhum canal. Entre em contato com o suporte.");
    }

    log("Code resent successfully", { emailSent, whatsappSent });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: emailSent && whatsappSent 
          ? "Código reenviado por e-mail e WhatsApp com sucesso"
          : emailSent 
            ? "Código reenviado por e-mail com sucesso"
            : "Código reenviado por WhatsApp com sucesso",
        channels: {
          email: emailSent,
          whatsapp: whatsappSent
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { 
      message,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: message,
        hint: "Verifique se a entrega está agendada e se o código ainda é válido"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
