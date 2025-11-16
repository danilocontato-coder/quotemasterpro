import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Verifica se o usuário tem permissão para executar uma ação
 * @param userId - ID do usuário
 * @param action - Ação a ser executada
 * @param resourceId - ID do recurso (opcional)
 * @param supabase - Cliente Supabase
 * @returns Resultado da verificação de permissão
 */
export async function checkPermission(
  userId: string,
  action: string,
  supabase: SupabaseClient,
  resourceId?: string
): Promise<PermissionCheck> {
  try {
    // Buscar roles do usuário
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('[permission-helper] Error fetching roles:', rolesError);
      return { allowed: false, reason: 'Erro ao verificar permissões' };
    }

    const userRoles = roles?.map(r => r.role) || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
    const isAdminCliente = userRoles.includes('admin_cliente');
    const isManager = userRoles.includes('manager');

    // Admin pode tudo
    if (isAdmin) {
      return { allowed: true };
    }

    // Validações específicas por ação
    switch (action) {
      case 'delete_quote':
        if (!resourceId) {
          return { allowed: false, reason: 'ID do recurso não fornecido' };
        }

        // Buscar cotação
        const { data: quote } = await supabase
          .from('quotes')
          .select('created_by, client_id')
          .eq('id', resourceId)
          .single();

        if (!quote) {
          return { allowed: false, reason: 'Cotação não encontrada' };
        }

        // Verificar se é o criador
        if (quote.created_by === userId) {
          return { allowed: true };
        }

        // Verificar se é admin do cliente
        if (isAdminCliente || isManager) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('client_id')
            .eq('id', userId)
            .single();

          if (profile?.client_id === quote.client_id) {
            return { allowed: true };
          }
        }

        return { allowed: false, reason: 'Você não tem permissão para deletar esta cotação' };

      case 'approve_payment':
        return isAdminCliente || isManager
          ? { allowed: true }
          : { allowed: false, reason: 'Apenas administradores podem aprovar pagamentos' };

      case 'approve_quote':
        return isAdminCliente || isManager
          ? { allowed: true }
          : { allowed: false, reason: 'Apenas administradores e gestores podem aprovar cotações' };

      case 'manage_user':
      case 'create_supplier':
      case 'manage_contract':
        return isAdminCliente
          ? { allowed: true }
          : { allowed: false, reason: 'Apenas administradores podem executar esta ação' };

      default:
        return { allowed: false, reason: 'Ação não reconhecida' };
    }
  } catch (error) {
    console.error('[permission-helper] Error:', error);
    return { allowed: false, reason: 'Erro interno ao verificar permissões' };
  }
}

/**
 * Registra tentativa negada de permissão no audit log
 */
export async function logDeniedPermission(
  userId: string,
  action: string,
  reason: string,
  supabase: SupabaseClient,
  resourceId?: string
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: `PERMISSION_DENIED_${action.toUpperCase()}`,
      entity_type: 'security',
      entity_id: resourceId || 'n/a',
      panel_type: 'system',
      details: {
        action,
        resourceId,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[permission-helper] Error logging denied permission:', error);
  }
}
