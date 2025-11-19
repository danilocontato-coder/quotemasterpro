import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageRolesRequest {
  userId: string;
  rolesToAdd: string[];
  rolesToRemove: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar se o usuário atual é super_admin ou admin
    const { data: currentUserRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching current user roles:', rolesError);
      throw new Error('Failed to verify permissions');
    }

    const hasAdminRole = currentUserRoles?.some(
      (r: any) => r.role === 'admin' || r.role === 'super_admin'
    );

    if (!hasAdminRole) {
      throw new Error('Only admins can manage user roles');
    }

    // Parse request body
    const { userId, rolesToAdd, rolesToRemove }: ManageRolesRequest = await req.json();

    console.log('Managing roles for user:', userId);
    console.log('Roles to add:', rolesToAdd);
    console.log('Roles to remove:', rolesToRemove);

    // Validação: não pode remover último super_admin
    if (rolesToRemove.includes('super_admin') || rolesToRemove.includes('admin')) {
      // Contar quantos super_admins/admins existem
      const { data: allAdmins, error: countError } = await supabaseClient
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['super_admin', 'admin']);

      if (countError) {
        console.error('Error counting admins:', countError);
        throw new Error('Failed to validate admin count');
      }

      const uniqueAdminUsers = new Set(allAdmins?.map((a: any) => a.user_id));
      
      // Se só tem 1 admin e estamos removendo ele
      if (uniqueAdminUsers.size === 1 && uniqueAdminUsers.has(userId)) {
        throw new Error('Cannot remove the last admin from the system');
      }
    }

    // Validação: não pode remover próprio admin
    if (userId === user.id) {
      const removingOwnAdmin = rolesToRemove.some((r) => r === 'admin' || r === 'super_admin');
      if (removingOwnAdmin) {
        throw new Error('You cannot remove your own admin privileges');
      }
    }

    // Remover roles
    if (rolesToRemove.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', rolesToRemove);

      if (deleteError) {
        console.error('Error removing roles:', deleteError);
        throw new Error('Failed to remove roles');
      }

      // Audit log
      for (const role of rolesToRemove) {
        await supabaseClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'ROLE_REMOVED',
          entity_type: 'user_roles',
          entity_id: userId,
          panel_type: 'admin',
          details: {
            target_user_id: userId,
            role_removed: role,
          },
        });
      }
    }

    // Adicionar roles
    if (rolesToAdd.length > 0) {
      const rolesToInsert = rolesToAdd.map((role) => ({
        user_id: userId,
        role,
      }));

      const { error: insertError } = await supabaseClient
        .from('user_roles')
        .insert(rolesToInsert);

      if (insertError) {
        console.error('Error adding roles:', insertError);
        throw new Error('Failed to add roles');
      }

      // Audit log
      for (const role of rolesToAdd) {
        await supabaseClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'ROLE_ADDED',
          entity_type: 'user_roles',
          entity_id: userId,
          panel_type: 'admin',
          details: {
            target_user_id: userId,
            role_added: role,
          },
        });
      }
    }

    // Sincronizar profiles.role com o primeiro role de user_roles
    const { data: updatedRoles, error: fetchError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    if (!fetchError && updatedRoles && updatedRoles.length > 0) {
      await supabaseClient
        .from('profiles')
        .update({ role: updatedRoles[0].role })
        .eq('id', userId);
    }

    console.log('Roles updated successfully for user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Roles updated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in manage-user-roles:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
