import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
    console.log(`[validate-action] User ${user.id} requesting action: ${action} on resource: ${resourceId}`);

    // Buscar roles do usuário via RLS
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('[validate-action] Error fetching roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões', allowed: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRoles = roles?.map(r => r.role) || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
    const isAdminCliente = userRoles.includes('admin_cliente');
    const isManager = userRoles.includes('manager');

    console.log(`[validate-action] User roles:`, userRoles);

    // Validar ação específica
    let allowed = false;
    let reason = '';

    switch (action) {
      case 'delete_quote':
        // Admin pode deletar qualquer cotação
        if (isAdmin) {
          allowed = true;
          break;
        }
        
        // Admin cliente ou criador pode deletar suas cotações
        if (resourceId) {
          const { data: quote } = await supabaseClient
            .from('quotes')
            .select('created_by, client_id')
            .eq('id', resourceId)
            .single();
          
          if (quote) {
            // Verificar se é o criador OU admin do cliente
            if (quote.created_by === user.id) {
              allowed = true;
            } else if (isAdminCliente || isManager) {
              // Verificar se pertence ao mesmo cliente
              const { data: profile } = await supabaseClient
                .from('profiles')
                .select('client_id')
                .eq('id', user.id)
                .single();
              
              allowed = profile?.client_id === quote.client_id;
              reason = allowed ? '' : 'Você não é o criador desta cotação nem admin do cliente';
            } else {
              reason = 'Você não é o criador desta cotação';
            }
          }
        }
        break;

      case 'approve_payment':
        allowed = isAdmin || isAdminCliente;
        reason = allowed ? '' : 'Apenas administradores podem aprovar pagamentos';
        break;

      case 'approve_quote':
        allowed = isAdmin || isAdminCliente || isManager;
        reason = allowed ? '' : 'Apenas administradores e gestores podem aprovar cotações';
        break;

      case 'manage_user':
        allowed = isAdmin || isAdminCliente;
        reason = allowed ? '' : 'Apenas administradores podem gerenciar usuários';
        break;

      case 'create_supplier':
        allowed = isAdmin || isAdminCliente;
        reason = allowed ? '' : 'Apenas administradores podem criar fornecedores';
        break;

      case 'manage_contract':
        allowed = isAdmin || isAdminCliente;
        reason = allowed ? '' : 'Apenas administradores podem gerenciar contratos';
        break;

      default:
        allowed = false;
        reason = 'Ação não reconhecida';
    }

    console.log(`[validate-action] Result: allowed=${allowed}, reason=${reason}`);

    // Log de auditoria para tentativas negadas
    if (!allowed) {
      await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        action: `PERMISSION_DENIED_${action.toUpperCase()}`,
        entity_type: 'security',
        entity_id: resourceId || 'n/a',
        panel_type: 'system',
        details: {
          action,
          resourceId,
          userRoles,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        allowed,
        reason,
        userRoles,
      }),
      { 
        status: allowed ? 200 : 403, 
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
