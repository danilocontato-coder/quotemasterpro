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
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating auth user - request received');

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

    const requestBody: CreateUserRequest = await req.json();
    const { email, password, name, role } = requestBody;

    console.log('Creating auth user for:', email);

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

    // Managers cannot create admin users
    if (!isAdmin && role === 'admin') {
      console.error('Only admins can create admin users');
      return new Response(
        JSON.stringify({ error: 'Forbidden - only admin can create admin users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

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
      // Normalize errors to a success:false payload to avoid opaque client errors
      let errorMessage = 'Erro ao criar usuário no sistema de autenticação';
      let errorCode = 'unknown_error';
      const rawMsg = authError.message || '';

      if (rawMsg.includes('already registered')) {
        errorMessage = 'Este e-mail já está registrado no sistema';
        errorCode = 'email_exists';
      } else if (rawMsg.toLowerCase().includes('password')) {
        errorMessage = 'Senha não atende aos requisitos de segurança';
        errorCode = 'invalid_password';
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage, error_code: errorCode, details: rawMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Auth user created successfully:', authData.user?.id);

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