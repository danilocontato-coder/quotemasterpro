import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Telefone é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number (remove non-digits, add country code if missing)
    let normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone.startsWith("55")) {
      normalizedPhone = "55" + normalizedPhone;
    }

    // Validate phone length (55 + DDD + number = 12 or 13 digits)
    if (normalizedPhone.length < 12 || normalizedPhone.length > 13) {
      return new Response(
        JSON.stringify({ success: false, error: "Número de telefone inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Check for recent verification attempts (rate limiting)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("phone_verifications")
      .select("*", { count: "exact", head: true })
      .eq("phone", normalizedPhone)
      .gte("created_at", fiveMinutesAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Muitas tentativas. Aguarde alguns minutos." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save verification code
    const { error: insertError } = await supabase
      .from("phone_verifications")
      .insert({
        phone: normalizedPhone,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent")
      });

    if (insertError) {
      console.error("Error saving verification:", insertError);
      throw new Error("Erro ao salvar código de verificação");
    }

    // Format message
    const message = `🔐 *Código de Verificação Cotiz*\n\nSeu código é: *${code}*\n\n⏰ Válido por 10 minutos.\n\nSe você não solicitou este código, ignore esta mensagem.`;

    // Send via WhatsApp using existing send-whatsapp function
    const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke(
      "send-whatsapp",
      {
        body: {
          to: normalizedPhone,
          message
        }
      }
    );

    if (whatsappError) {
      console.error("WhatsApp error:", whatsappError);
      // Don't fail completely - code is saved, user can try again
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erro ao enviar mensagem. Verifique se o número tem WhatsApp." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp response:", whatsappData);

    // Check if WhatsApp send was successful
    if (!whatsappData?.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: whatsappData?.error || "Erro ao enviar mensagem via WhatsApp" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Código enviado via WhatsApp",
        phone: normalizedPhone.slice(-4) // Last 4 digits for UI confirmation
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-phone-verification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
