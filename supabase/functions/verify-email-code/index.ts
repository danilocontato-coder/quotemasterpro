import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface VerifyCodeRequest {
  email: string;
  code: string;
}

const MAX_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, code }: VerifyCodeRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ verified: false, error: 'E-mail e código são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Buscar código válido (não expirado, não usado, dentro do limite de tentativas)
    const now = new Date().toISOString();
    
    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .is('verified_at', null)
      .gt('expires_at', now)
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erro ao buscar verificação:', fetchError);
      throw new Error('Erro ao verificar código');
    }

    if (!verification) {
      console.log(`⚠️ Nenhum código válido encontrado para ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Código expirado ou inválido. Solicite um novo código.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o código está correto
    if (verification.code !== normalizedCode) {
      // Incrementar tentativas
      const newAttempts = (verification.attempts || 0) + 1;
      
      await supabase
        .from('email_verifications')
        .update({ attempts: newAttempts })
        .eq('id', verification.id);

      const remainingAttempts = MAX_ATTEMPTS - newAttempts;
      
      console.log(`❌ Código incorreto para ${normalizedEmail}. Tentativas restantes: ${remainingAttempts}`);

      if (remainingAttempts <= 0) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            error: 'Máximo de tentativas excedido. Solicite um novo código.',
            remainingAttempts: 0
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: `Código incorreto. ${remainingAttempts} tentativa(s) restante(s).`,
          remainingAttempts
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Código correto - marcar como verificado
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar verificação:', updateError);
      throw new Error('Erro ao confirmar verificação');
    }

    console.log(`✅ E-mail ${normalizedEmail} verificado com sucesso`);

    return new Response(
      JSON.stringify({ 
        verified: true, 
        message: 'E-mail verificado com sucesso!',
        verificationId: verification.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro em verify-email-code:', error);
    
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
