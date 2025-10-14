import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSupplierUserRequest {
  email: string;
  password: string;
  supplier_id: string;
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, supplier_id, name }: CreateSupplierUserRequest = await req.json();

    console.log('🔵 [create-supplier-user] Creating auth user:', { email, supplier_id, name });

    // 1. Criar usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar e-mail automaticamente
      user_metadata: { 
        name, 
        role: 'supplier',
        supplier_id 
      }
    });

    if (authError) {
      console.error('❌ [create-supplier-user] Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ [create-supplier-user] Auth user created:', authUser.user.id);

    // 2. Vincular usuário ao fornecedor na tabela profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email,
        name,
        role: 'supplier',
        supplier_id,
        tenant_type: 'supplier',
        active: true,
        onboarding_completed: true,
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('❌ [create-supplier-user] Profile error:', profileError);
      // Não falhar aqui, usuário já foi criado
      console.warn('⚠️ [create-supplier-user] Continuando mesmo com erro no profile');
    } else {
      console.log('✅ [create-supplier-user] Profile linked successfully');
    }

    // 3. Opcional: Enviar credenciais via WhatsApp (se configurado)
    const whatsappEnabled = Deno.env.get('EVOLUTION_API_URL') && Deno.env.get('EVOLUTION_API_KEY');
    
    if (whatsappEnabled) {
      try {
        // Buscar WhatsApp e client_id do fornecedor
        const { data: supplier } = await supabaseAdmin
          .from('suppliers')
          .select('whatsapp, client_id')
          .eq('id', supplier_id)
          .single();

        if (supplier?.whatsapp) {
          console.log('📱 [create-supplier-user] Sending WhatsApp credentials to:', supplier.whatsapp);
          console.log('📍 [create-supplier-user] Using client_id:', supplier.client_id);
          
          const message = `🔐 *Bem-vindo ao QuoteMaster Pro!*\n\n` +
            `Suas credenciais de acesso:\n\n` +
            `📧 *E-mail:* ${email}\n` +
            `🔑 *Senha temporária:* ${password}\n\n` +
            `🌐 Acesse: ${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://app.quotemaster.com.br'}\n\n` +
            `⚠️ Por segurança, altere sua senha no primeiro acesso.`;

          const { error: whatsappError } = await supabaseAdmin.functions.invoke('notify', {
            body: {
              type: 'whatsapp',
              to: supplier.whatsapp,
              message,
              client_id: supplier.client_id
            }
          });

          if (whatsappError) {
            console.warn('⚠️ [create-supplier-user] WhatsApp send failed:', whatsappError);
          } else {
            console.log('✅ [create-supplier-user] WhatsApp sent successfully');
          }
        } else {
          console.log('ℹ️ [create-supplier-user] No WhatsApp configured for supplier');
        }
      } catch (whatsappError) {
        console.warn('⚠️ [create-supplier-user] WhatsApp error:', whatsappError);
        // Não falhar por causa do WhatsApp
      }
    } else {
      console.log('ℹ️ [create-supplier-user] WhatsApp integration not configured');
    }

    console.log('✅ [create-supplier-user] Process completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authUser.user.id,
        email: authUser.user.email
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ [create-supplier-user] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno ao criar usuário' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
