import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: string;
  clientId?: string;
  temporaryPassword?: boolean;
  action?: 'create' | 'reset_password';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating auth user - request received');
    
    const requestBody: CreateUserRequest = await req.json();
    console.log('🔧 DEBUG: Request body recebido:', {
      email: requestBody.email,
      name: requestBody.name,
      role: requestBody.role,
      clientId: requestBody.clientId,
      hasPassword: !!requestBody.password
    });

    // Get the auth user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth header' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Initialize Supabase client with service role for admin operations
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

    // Initialize regular client to check the requesting user's permissions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get the current user to verify permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid user' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Check if the requesting user has permission to create users
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role as string | undefined;
    console.log('User role:', userRole);

    // Allow admins; allow managers to create non-admin users
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    if (!isAdmin && !isManager) {
      console.error('User does not have permissions to create auth users');
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin or manager permissions required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { email, password, name, role, clientId, temporaryPassword, action = 'create' } = requestBody;

    console.log('🔍 DEBUG: Dados extraídos:', {
      email,
      name,
      role,
      clientId,
      temporaryPassword,
      action
    });

    console.log('Action type:', action, 'for email:', email);

    // Validate input
    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, name, role' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Managers cannot create admin users (only applies to create action)
    if (!isAdmin && role === 'admin' && action === 'create') {
      console.error('Only admins can create admin users');
      return new Response(
        JSON.stringify({ error: 'Forbidden - only admin can create admin users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Handle password reset action
    if (action === 'reset_password') {
      try {
        // Find existing user by email
        const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) throw listErr;

        const existingUser = (usersList as any)?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!existingUser) {
          return new Response(
            JSON.stringify({ success: false, error: 'Usuário não encontrado', error_code: 'user_not_found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        // Update user password
        const { data: updateData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password }
        );

        if (updateErr) {
          console.error('Error updating password:', updateErr);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao redefinir senha', error_code: 'password_reset_failed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        // Update force_password_change in users table
        if (clientId) {
          await supabaseAdmin
            .from('users')
            .update({ force_password_change: temporaryPassword ?? true })
            .eq('auth_user_id', existingUser.id);
        }

        console.log('Password reset successful for user:', existingUser.id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            auth_user_id: existingUser.id,
            email: existingUser.email,
            password_reset: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (error) {
        console.error('Error resetting password:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro interno ao redefinir senha', error_code: 'internal_error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Original create user logic continues below...

    // Create the auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        name,
        role
      }
    });

if (authError) {
      console.error('Error creating auth user:', authError);
      const rawMsg = (authError as any).message || '';
      const isEmailExists = rawMsg.includes('already registered') || (authError as any)?.code === 'email_exists';

      if (isEmailExists) {
        // Try to fetch existing auth user by email and link to client
        let existingUserId: string | null = null;

        // 1) Try profiles by email
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (existingProfile?.id) existingUserId = existingProfile.id as string;

        // 2) Fallback: list users and match by email
        if (!existingUserId) {
          const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (!listErr && (usersList as any)?.users?.length) {
            const match = (usersList as any).users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
            if (match?.id) existingUserId = match.id as string;
          }
        }

        if (existingUserId) {
          try {
            if (clientId) {
              // Ensure profile exists and is linked
              await supabaseAdmin
                .from('profiles')
                .upsert({
                  id: existingUserId,
                  email,
                  name,
                  role,
                  client_id: clientId,
                  company_name: name,
                }, { onConflict: 'id' });

              // Upsert into public.users by auth_user_id
              const { data: existingUserRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('auth_user_id', existingUserId)
                .maybeSingle();

              if (existingUserRow?.id) {
                await supabaseAdmin
                  .from('users')
                  .update({
                    name,
                    email,
                    role,
                    status: 'active',
                    client_id: clientId,
                    force_password_change: temporaryPassword ?? true,
                  })
                  .eq('id', existingUserRow.id);
              } else {
                await supabaseAdmin
                  .from('users')
                  .insert({
                    name,
                    email,
                    role,
                    status: 'active',
                    client_id: clientId,
                    auth_user_id: existingUserId,
                    force_password_change: temporaryPassword ?? true,
                  });
              }
            }
          } catch (linkErr) {
            console.error('Error linking existing user to client:', linkErr);
          }

          return new Response(
            JSON.stringify({ success: true, auth_user_id: existingUserId, email, linked_existing: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: 'E-mail já existe e não foi possível vincular automaticamente', error_code: 'email_exists_unlinked', details: rawMsg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Other errors
      let errorMessage = 'Erro ao criar usuário no sistema de autenticação';
      let errorCode = 'unknown_error';
      if (rawMsg.toLowerCase().includes('password')) {
        errorMessage = 'Senha não atende aos requisitos de segurança';
        errorCode = 'invalid_password';
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage, error_code: errorCode, details: rawMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Auth user created successfully:', authData.user?.id);

    // Link profile and users to client when provided
    const newUserId = authData.user?.id as string | undefined;
    console.log('🔗 DEBUG: Iniciando vinculação ao cliente', { newUserId, clientId });
    
    if (clientId && newUserId) {
      try {
        console.log('👤 DEBUG: Criando/atualizando profile');
        await supabaseAdmin
          .from('profiles')
          .upsert({ 
            id: newUserId, 
            email, 
            name, 
            role, 
            client_id: clientId, 
            company_name: name 
          }, { onConflict: 'id' });

        console.log('✅ DEBUG: Profile criado/atualizado');

        const { data: existingUserRow } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('auth_user_id', newUserId)
          .maybeSingle();

        console.log('👥 DEBUG: Usuário existente encontrado:', existingUserRow);

        if (existingUserRow?.id) {
          console.log('🔄 DEBUG: Atualizando usuário existente');
          await supabaseAdmin
            .from('users')
            .update({ 
              name, 
              email, 
              role, 
              status: 'active', 
              client_id: clientId, 
              force_password_change: temporaryPassword ?? true 
            })
            .eq('id', existingUserRow.id);
          console.log('✅ DEBUG: Usuário atualizado');
        } else {
          console.log('➕ DEBUG: Criando novo usuário');
          await supabaseAdmin
            .from('users')
            .insert({ 
              name, 
              email, 
              role, 
              status: 'active', 
              client_id: clientId, 
              auth_user_id: newUserId, 
              force_password_change: temporaryPassword ?? true 
            });
          console.log('✅ DEBUG: Novo usuário criado');
        }

        // Verificar se o cliente existe e tem plano
        const { data: clientData } = await supabaseAdmin
          .from('clients')
          .select('id, subscription_plan_id')
          .eq('id', clientId)
          .maybeSingle();

        console.log('🏢 DEBUG: Dados do cliente:', clientData);
        
      } catch (dbErr) {
        console.error('❌ DEBUG: Erro ao vincular usuário ao cliente:', dbErr);
      }
    } else {
      console.log('⚠️ DEBUG: Não vinculando ao cliente (clientId ou newUserId ausente)');
    }

    // Return the created user data
    return new Response(
      JSON.stringify({ 
        success: true, 
        auth_user_id: authData.user?.id,
        email: authData.user?.email
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});