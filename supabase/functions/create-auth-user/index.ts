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

    // Para criadores com papel de fornecedor, sempre forçar o supplier_id do criador
    const effectiveSupplierId = isSupplier ? (profile as any)?.supplier_id : supplierId;
    // Se é fornecedor criando usuário E o role solicitado não é 'supplier', manter o role solicitado
    // Se é fornecedor criando usuário E role é 'supplier', usar 'supplier'
    const effectiveRole = isSupplier && role === 'supplier' ? 'supplier' : role;
    // Forçar isolamento: fornecedores nunca vinculam client_id
    const effectiveClientId = isSupplier ? null : clientId;

    console.log('🔍 DEBUG: Dados extraídos:', {
      email,
      name,
      role,
      clientId,
      supplierId,
      effectiveSupplierId,
      effectiveRole,
      isSupplier,
      temporaryPassword,
      action
    });

    // 🔐 FASE 1.1: Debug detalhado de senha
    console.log('🔐 [PASSWORD_DEBUG]', {
      passwordLength: password?.length || 0,
      hasPassword: !!password,
      emailToCreate: email,
      willAutoConfirm: true
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
        console.log('🔄 Iniciando reset de senha para:', email);
        
        // Find user auth_id from profiles table (avoid listUsers which may fail)
        const { data: profile, error: profileErr } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();
        
        if (profileErr || !profile) {
          console.error('Usuário não encontrado no profiles:', email, profileErr);
          return new Response(
            JSON.stringify({ success: false, error: 'Usuário não encontrado', error_code: 'user_not_found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        console.log('✅ Usuário encontrado:', profile.id);

        // Update user password using profile.id (which is the auth user id)
        const { data: updateData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          profile.id,
          { password }
        );

        if (updateErr) {
          console.error('Error updating password:', updateErr);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao redefinir senha', error_code: 'password_reset_failed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        console.log('✅ Senha atualizada com sucesso');

        // Update force_password_change in users table
        if (clientId || effectiveSupplierId) {
          const { error: usersUpdateErr } = await supabaseAdmin
            .from('users')
            .update({ force_password_change: temporaryPassword ?? true })
            .eq('auth_user_id', profile.id);
          
          if (usersUpdateErr) {
            console.error('Erro ao atualizar force_password_change:', usersUpdateErr);
          } else {
            console.log('✅ force_password_change atualizado');
          }
        }

        console.log('Password reset successful for user:', profile.id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            auth_user_id: profile.id,
            email: email,
            temporary_password: password, // ← NOVO: Retorna senha em reset
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
        role: effectiveRole
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      const rawMsg = (authError as any).message || '';
      const isEmailExists = rawMsg.includes('already registered') || (authError as any)?.code === 'email_exists';

      if (isEmailExists) {
        console.log('⚠️ Email já existe, tentando obter auth_user_id...');
        
        // 🔧 FASE 1.2: Melhorar tratamento de usuário existente com atualização de senha
        let existingUserId: string | null = null;

        // 1) Try profiles by email first (faster)
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle();
        
        if (existingProfile?.id) {
          existingUserId = existingProfile.id as string;
          console.log('✅ Auth user encontrado via profiles:', existingUserId);
        }

        // 2) Fallback: list users and match by email
        if (!existingUserId) {
          const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (!listErr && (usersList as any)?.users?.length) {
            const match = (usersList as any).users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
            if (match?.id) {
              existingUserId = match.id as string;
              console.log('✅ Auth user encontrado via listUsers:', existingUserId);
            }
          }
        }

        if (existingUserId) {
          // 🔐 FASE 1.2: Forçar atualização de senha para usuário existente
          console.log('🔄 [USER_EXISTS] Atualizando senha do usuário existente...');
          
          try {
            const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
              existingUserId,
              { 
                password, 
                email_confirm: true,
                user_metadata: {
                  name,
                  role: effectiveRole,
                  password_updated_at: new Date().toISOString()
                }
              }
            );
            
            if (updateErr) {
              console.error('❌ Erro ao atualizar senha:', updateErr);
              throw updateErr;
            }
            
            console.log('✅ Senha atualizada com sucesso para usuário existente');
            
            // Return the existing user ID with password updated flag
            return new Response(
              JSON.stringify({ 
                success: true, 
                auth_user_id: existingUserId,
                already_existed: true,
                password_updated: true,
                temporary_password: password,
                message: 'Auth user já existia, senha atualizada'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          } catch (updateError) {
            console.error('❌ Falha ao atualizar senha do usuário existente:', updateError);
            // Continue para retornar o usuário existente mesmo se a atualização falhar
            return new Response(
              JSON.stringify({ 
                success: true, 
                auth_user_id: existingUserId,
                already_existed: true,
                password_updated: false,
                message: 'Auth user já existia (senha não atualizada)'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          }
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
    
    // ✅ FASE 1.1: Log detalhado após criação
    console.log('✅ [AUTH_USER_CREATED]', {
      userId: authData.user?.id,
      email: authData.user?.email,
      emailConfirmed: authData.user?.email_confirmed_at,
      lastSignIn: authData.user?.last_sign_in_at,
      createdAt: authData.user?.created_at
    });

    // Link profile and users to client when provided
    const newUserId = authData.user?.id as string | undefined;
    console.log('🔗 DEBUG: Iniciando vinculação ao cliente', { newUserId, clientId });
    
    if ((clientId || effectiveSupplierId) && newUserId) {
      try {
        console.log('👤 DEBUG: Criando/atualizando profile');
        await supabaseAdmin
          .from('profiles')
          .upsert({ 
            id: newUserId, 
            email, 
            name, 
            role: effectiveRole, 
            client_id: clientId ?? null, 
            supplier_id: effectiveSupplierId ?? null,
            company_name: name,
            tenant_type: effectiveSupplierId ? 'supplier' : 'client',
            onboarding_completed: true, // Sempre true para usuários criados via admin
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
          role: effectiveRole, 
          status: 'active', 
          client_id: clientId ?? null, 
          supplier_id: effectiveSupplierId ?? null,
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

    // Registrar auditoria de criação de usuário
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id, // Quem criou
        action: 'USER_CREATED',
        entity_type: 'users',
        entity_id: authData.user?.id,
        panel_type: 'admin',
        details: {
          email: email,
          name: name,
          role: effectiveRole,
          client_id: effectiveClientId,
          supplier_id: effectiveSupplierId,
          created_by: user.id,
          created_by_role: userRole,
          temporary_password: temporaryPassword ?? true
        }
      });
      console.log('✅ Audit log registrado com sucesso');
    } catch (auditErr) {
      console.error('⚠️ Erro ao registrar audit log (não bloqueante):', auditErr);
    }

    // 🧪 FASE 1.3: Validação imediata de senha
    console.log('🧪 [PASSWORD_TEST] Testando login com credenciais recém-criadas...');
    try {
      const { data: testSession, error: testError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (testError) {
        console.error('🚨 [CRITICAL] Senha criada mas login falhou!', {
          error: testError.message,
          errorCode: testError.status,
          email: email
        });
        
        // Registrar falha crítica em audit_logs
        try {
          await supabaseAdmin.from('audit_logs').insert({
            user_id: user.id,
            action: 'PASSWORD_TEST_FAILED',
            entity_type: 'users',
            entity_id: authData.user?.id,
            panel_type: 'admin',
            details: {
              email: email,
              error: testError.message,
              test_timestamp: new Date().toISOString()
            }
          });
        } catch (auditErr) {
          console.error('Erro ao registrar falha de teste de senha:', auditErr);
        }
      } else {
        console.log('✅ [PASSWORD_TEST] Login bem-sucedido!', {
          canLogin: true,
          sessionId: testSession?.session?.access_token?.substring(0, 20) + '...'
        });
        
        // Fazer logout imediatamente após teste
        await supabase.auth.signOut();
        console.log('🔓 [PASSWORD_TEST] Logout realizado após teste');
      }
    } catch (testErr) {
      console.error('❌ [PASSWORD_TEST] Erro inesperado ao testar senha:', testErr);
    }

    // Return the created user data
    return new Response(
      JSON.stringify({ 
        success: true, 
        auth_user_id: authData.user?.id,
        email: authData.user?.email,
        temporary_password: password // ← NOVO: Retorna senha em criação
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