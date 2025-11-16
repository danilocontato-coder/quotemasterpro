import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkPermission, logDeniedPermission } from '../_shared/permission-helper.ts';

interface ValidateActionRequest {
  action: 'delete_quote' | 'approve_payment' | 'manage_user' | 'create_supplier' | 'approve_quote' | 'manage_contract';
  resourceId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[validate-action] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autenticado', allowed: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[validate-action] Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido', allowed: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, resourceId } = await req.json() as ValidateActionRequest;
    console.log(`[validate-action] User ${user.id} requesting action: ${action}`);

    // Usar helper centralizado para verificar permissões
    const permissionResult = await checkPermission(user.id, action, supabaseClient, resourceId);

    console.log(`[validate-action] Result: allowed=${permissionResult.allowed}`);

    // Log de auditoria para tentativas negadas
    if (!permissionResult.allowed) {
      await logDeniedPermission(user.id, action, permissionResult.reason || 'Permissão negada', supabaseClient, resourceId);
    }

    return new Response(
      JSON.stringify({ 
        allowed: permissionResult.allowed,
        reason: permissionResult.reason,
      }),
      { 
        status: permissionResult.allowed ? 200 : 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[validate-action] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', allowed: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
