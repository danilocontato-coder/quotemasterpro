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
  supplierId?: string;
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
        JSON.stringify({ success: false, error: 'Unauthorized - invalid user', error_code: 'unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Check if the requesting user has permission to create users
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id, supplier_id')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role as string | undefined;
    console.log('User role:', userRole);

    // Allow admins; allow managers to create non-admin users; allow suppliers to create their own users  
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';
    const isSupplier = userRole === 'supplier';
    if (!isAdmin && !isManager && !isSupplier) {
      console.error('User does not have permissions to create auth users');
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - admin, manager, or supplier permissions required', error_code: 'forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

const { email, password, name, role, clientId, supplierId, temporaryPassword, action = 'create' } = requestBody;

    console.log('🔍 DEBUG: Dados extraídos:', {
      email,
      name,
      role,
      clientId,
      supplierId,
      temporaryPassword,
      action
    });

    console.log('Action type:', action, 'for email:', email);

    // Validate input
    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: email, password, name, role', error_code: 'bad_request' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Managers cannot create admin users (only applies to create action)
    if (!isAdmin && role === 'admin' && action === 'create') {
      console.error('Only admins can create admin users');
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - only admin can create admin users', error_code: 'admin_required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
        if (clientId || supplierId) {
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
            if (clientId || supplierId) {
              // Ensure profile exists and is linked to client and/or supplier
              await supabaseAdmin
                .from('profiles')
                .upsert({
                  id: existingUserId,
                  email,
                  name,
                  role,
                  client_id: clientId ?? null,
                  supplier_id: supplierId ?? null,
                  company_name: name,
                  tenant_type: supplierId ? 'supplier' : 'client',
                  onboarding_completed: supplierId ? true : undefined,
                }, { onConflict: 'id' });

              // Upsert into public.users by auth_user_id
              const { data: existingUserRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('auth_user_id', existingUserId)
                .maybeSingle();

              const userPayload: any = {
                name,
                email,
                role,
                status: 'active',
                client_id: clientId ?? null,
                supplier_id: supplierId ?? null,
                force_password_change: temporaryPassword ?? true,
              };

              if (existingUserRow?.id) {
                await supabaseAdmin
                  .from('users')
                  .update(userPayload)
                  .eq('id', existingUserRow.id);
              } else {
                await supabaseAdmin
                  .from('users')
                  .insert({
                    ...userPayload,
                    auth_user_id: existingUserId,
                  });
              }
            }

            // If a password was provided, update it for the existing auth user
            if (password) {
              const { error: updatePwdErr } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, { password });
              if (updatePwdErr) {
                console.error('Error updating existing user password:', updatePwdErr);
              }
            }
          } catch (linkErr) {
            console.error('Error linking existing user:', linkErr);
          }

          return new Response(
            JSON.stringify({ success: true, auth_user_id: existingUserId, email, linked_existing: true, password_updated: !!password }),
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
    
    if ((clientId || supplierId) && newUserId) {
      try {
        console.log('👤 DEBUG: Criando/atualizando profile');
        await supabaseAdmin
          .from('profiles')
          .upsert({ 
            id: newUserId, 
            email, 
            name, 
            role, 
            client_id: clientId ?? null, 
            supplier_id: supplierId ?? null,
            company_name: name,
            tenant_type: supplierId ? 'supplier' : 'client',
            onboarding_completed: supplierId ? true : undefined,
          }, { onConflict: 'id' });

        console.log('✅ DEBUG: Profile criado/atualizado');

        const { data: existingUserRow } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('auth_user_id', newUserId)
          .maybeSingle();

        console.log('👥 DEBUG: Usuário existente encontrado:', existingUserRow);

        const userPayload: any = { 
          name, 
          email, 
          role, 
          status: 'active', 
          client_id: clientId ?? null, 
          supplier_id: supplierId ?? null,
          force_password_change: temporaryPassword ?? true 
        };

        if (existingUserRow?.id) {
          console.log('🔄 DEBUG: Atualizando usuário existente');
          await supabaseAdmin
            .from('users')
            .update(userPayload)
            .eq('id', existingUserRow.id);
          console.log('✅ DEBUG: Usuário atualizado');
        } else {
          console.log('➕ DEBUG: Criando novo usuário');
          await supabaseAdmin
            .from('users')
            .insert({ 
              ...userPayload,
              auth_user_id: newUserId, 
            });
          console.log('✅ DEBUG: Novo usuário criado');
        }

        if (clientId) {
          // Verificar se o cliente existe e tem plano
          const { data: clientData } = await supabaseAdmin
            .from('clients')
            .select('id, subscription_plan_id')
            .eq('id', clientId)
            .maybeSingle();

          console.log('🏢 DEBUG: Dados do cliente:', clientData);
        }
        
      } catch (dbErr) {
        console.error('❌ DEBUG: Erro ao vincular usuário:', dbErr);
      }
    } else {
      console.log('⚠️ DEBUG: Não vinculando (ids ausentes)');
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