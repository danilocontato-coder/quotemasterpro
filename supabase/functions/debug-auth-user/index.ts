import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DebugRequest {
  email: string;
  entityType: 'client' | 'supplier';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 DEBUG: Starting auth user diagnostic');
    
    const { email, entityType }: DebugRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 DEBUG: Email normalizado:', normalizedEmail);

    // Initialize Supabase Admin client
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

    const report: any = {
      email: normalizedEmail,
      entityType,
      timestamp: new Date().toISOString(),
      auth: null,
      profile: null,
      users: null,
      userRoles: null,
      entity: null,
      auditLogs: [],
      contradictions: [],
      recommendations: []
    };

    // 1) Check Auth Users
    console.log('🔐 Checking auth.users...');
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!authError && authData?.users) {
        const authUser = authData.users.find((u: any) => 
          (u.email || '').toLowerCase() === normalizedEmail
        );
        
        if (authUser) {
          report.auth = {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            email_confirmed_at: authUser.email_confirmed_at,
            confirmed_at: authUser.confirmed_at
          };
          console.log('✅ Auth user found:', authUser.id);
        } else {
          console.log('⚠️ No auth user found');
          report.contradictions.push('Usuário não existe em auth.users');
          report.recommendations.push('Criar usuário via "Criar/Conciliar Profile"');
        }
      }
    } catch (authErr) {
      console.error('❌ Error checking auth:', authErr);
      report.contradictions.push('Erro ao acessar auth.users: ' + (authErr as any).message);
    }

    // 2) Check Profiles
    console.log('👤 Checking profiles...');
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (!profileError && profileData) {
      report.profile = {
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        role: profileData.role,
        client_id: profileData.client_id,
        supplier_id: profileData.supplier_id,
        tenant_type: profileData.tenant_type,
        onboarding_completed: profileData.onboarding_completed,
        created_at: profileData.created_at
      };
      console.log('✅ Profile found:', profileData.id);

      // Check for auth/profile mismatch
      if (report.auth && report.auth.id !== profileData.id) {
        report.contradictions.push('ID do auth.users não corresponde ao profiles.id');
      }
    } else {
      console.log('⚠️ No profile found');
      if (report.auth) {
        report.contradictions.push('Auth user existe mas profile ausente');
        report.recommendations.push('Sincronizar profile com "Criar/Conciliar Profile"');
      }
    }

    // 3) Check Users table
    console.log('👥 Checking users table...');
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (!usersError && usersData) {
      report.users = {
        id: usersData.id,
        auth_user_id: usersData.auth_user_id,
        email: usersData.email,
        name: usersData.name,
        role: usersData.role,
        status: usersData.status,
        client_id: usersData.client_id,
        supplier_id: usersData.supplier_id,
        force_password_change: usersData.force_password_change,
        created_at: usersData.created_at
      };
      console.log('✅ Users record found');

      // Check for mismatches
      if (report.profile && usersData.auth_user_id !== report.profile.id) {
        report.contradictions.push('users.auth_user_id não corresponde ao profile.id');
      }
    } else {
      console.log('⚠️ No users record found');
      if (report.auth) {
        report.contradictions.push('Auth/Profile existem mas registro em users ausente');
      }
    }

    // 4) Check User Roles
    if (report.auth) {
      console.log('🔑 Checking user_roles...');
      const { data: rolesData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', report.auth.id);
      
      if (rolesData && rolesData.length > 0) {
        report.userRoles = rolesData.map((r: any) => r.role);
        console.log('✅ Roles found:', report.userRoles);
      } else {
        console.log('⚠️ No roles found');
      }
    }

    // 5) Check Entity (Client or Supplier)
    console.log('🏢 Checking entity...');
    if (entityType === 'client') {
      const { data: clientData } = await supabaseAdmin
        .from('clients')
        .select('id, name, email, status, subscription_plan_id, created_at')
        .eq('email', normalizedEmail)
        .maybeSingle();
      
      if (clientData) {
        report.entity = { type: 'client', ...clientData };
        console.log('✅ Client found:', clientData.id);

        // Check for profile/client mismatch
        if (report.profile && report.profile.client_id !== clientData.id) {
          report.contradictions.push('profile.client_id não corresponde ao client.id');
        }
      } else {
        console.log('⚠️ No client found');
        report.contradictions.push('Cliente não encontrado na tabela clients');
      }
    } else {
      const { data: supplierData } = await supabaseAdmin
        .from('suppliers')
        .select('id, name, email, status, subscription_plan_id, type, created_at')
        .eq('email', normalizedEmail)
        .maybeSingle();
      
      if (supplierData) {
        report.entity = { type: 'supplier', ...supplierData };
        console.log('✅ Supplier found:', supplierData.id);

        // Check for profile/supplier mismatch
        if (report.profile && report.profile.supplier_id !== supplierData.id) {
          report.contradictions.push('profile.supplier_id não corresponde ao supplier.id');
        }
      } else {
        console.log('⚠️ No supplier found');
        report.contradictions.push('Fornecedor não encontrado na tabela suppliers');
      }
    }

    // 6) Check Audit Logs
    if (report.auth) {
      console.log('📋 Checking audit logs...');
      const { data: auditData } = await supabaseAdmin
        .from('audit_logs')
        .select('action, entity_type, created_at, details')
        .eq('user_id', report.auth.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (auditData) {
        report.auditLogs = auditData;
        console.log('✅ Found', auditData.length, 'audit logs');
      }
    }

    // 7) Generate final recommendations
    if (!report.auth && !report.profile) {
      report.recommendations.push('Usuário não existe. Use "Criar/Conciliar Profile" para criar.');
    } else if (report.auth && !report.profile) {
      report.recommendations.push('Profile ausente. Use "Criar/Conciliar Profile".');
    } else if (!report.users) {
      report.recommendations.push('Registro em users ausente. Criar via "Conciliar".');
    }

    if (report.profile && !report.entity) {
      report.recommendations.push(`${entityType === 'client' ? 'Cliente' : 'Fornecedor'} não encontrado. Verificar e criar entidade.`);
    }

    console.log('✅ DEBUG: Diagnostic complete');
    console.log('📊 Contradictions:', report.contradictions.length);
    console.log('💡 Recommendations:', report.recommendations.length);

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno ao executar diagnóstico', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
