import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckModuleAccessRequest {
  moduleKey: string;
  userId?: string; // Opcional - se não fornecido, usa auth.uid()
}

interface CheckModuleAccessResponse {
  hasAccess: boolean;
  enabledModules: string[];
  userPlanId: string | null;
  isAdmin: boolean;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Obter dados do request
    const { moduleKey, userId } = await req.json() as CheckModuleAccessRequest;

    if (!moduleKey) {
      return new Response(
        JSON.stringify({ 
          error: 'moduleKey é obrigatório',
          hasAccess: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obter usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('[check-module-access] Erro ao obter usuário:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Não autenticado',
          hasAccess: false 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const targetUserId = userId || user.id;

    // Chamar função SQL para verificar acesso ao módulo
    const { data: accessData, error: accessError } = await supabaseClient
      .rpc('user_has_module_access', { _module_key: moduleKey });

    if (accessError) {
      console.error('[check-module-access] Erro ao verificar acesso:', accessError);
      throw accessError;
    }

    // Obter módulos habilitados
    const { data: modulesData, error: modulesError } = await supabaseClient
      .rpc('get_user_enabled_modules');

    if (modulesError) {
      console.error('[check-module-access] Erro ao obter módulos:', modulesError);
      throw modulesError;
    }

    // Verificar se é admin
    const { data: isAdminData, error: adminError } = await supabaseClient
      .rpc('has_role_text', { _user_id: targetUserId, _role: 'admin' });

    if (adminError) {
      console.error('[check-module-access] Erro ao verificar admin:', adminError);
    }

    // Obter plan ID do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(`
        client_id,
        supplier_id,
        clients:client_id (subscription_plan_id),
        suppliers:supplier_id (subscription_plan_id)
      `)
      .eq('id', targetUserId)
      .single();

    let userPlanId: string | null = null;
    if (!profileError && profile) {
      // @ts-ignore - typing complexo
      userPlanId = profile.clients?.subscription_plan_id || profile.suppliers?.subscription_plan_id || null;
    }

    const response: CheckModuleAccessResponse = {
      hasAccess: !!accessData,
      enabledModules: modulesData || [],
      userPlanId,
      isAdmin: !!isAdminData,
      message: accessData 
        ? `Acesso concedido ao módulo '${moduleKey}'` 
        : `Acesso negado ao módulo '${moduleKey}'. Plano não inclui este módulo.`
    };

    console.log('[check-module-access] Resultado:', {
      userId: targetUserId,
      moduleKey,
      hasAccess: response.hasAccess,
      enabledModules: response.enabledModules,
      isAdmin: response.isAdmin
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[check-module-access] Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno ao verificar acesso',
        hasAccess: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
