import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterRequest {
  email: string;
  password: string;
  cnpj: string;
  companyName: string;
  tradeName?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  specialties?: string;
  bankData?: {
    bankName?: string;
    agency?: string;
    account?: string;
    pixKey?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: RegisterRequest = await req.json();
    console.log('[register-supplier-public] Request received for:', body.email);

    // Validate required fields
    if (!body.email || !body.password || !body.cnpj || !body.companyName) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, password, cnpj, companyName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify email was verified
    const { data: emailVerification, error: emailVerifyError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', body.email.toLowerCase())
      .eq('verified', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (emailVerifyError || !emailVerification) {
      console.log('[register-supplier-public] Email not verified:', body.email);
      return new Response(
        JSON.stringify({ error: 'E-mail não verificado. Por favor, verifique seu e-mail primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if email already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === body.email.toLowerCase());
    
    if (emailExists) {
      console.log('[register-supplier-public] Email already registered:', body.email);
      return new Response(
        JSON.stringify({ error: 'Este e-mail já está cadastrado. Tente fazer login.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check if CNPJ already exists
    const normalizedCNPJ = body.cnpj.replace(/\D/g, '');
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('cnpj', normalizedCNPJ)
      .single();

    if (existingSupplier) {
      console.log('[register-supplier-public] CNPJ already registered:', normalizedCNPJ);
      return new Response(
        JSON.stringify({ error: 'Este CNPJ já está cadastrado na plataforma.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create auth user
    console.log('[register-supplier-public] Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Email already verified via code
      user_metadata: {
        name: body.companyName,
        role: 'supplier'
      }
    });

    if (authError || !authData.user) {
      console.error('[register-supplier-public] Auth user creation failed:', authError);
      return new Response(
        JSON.stringify({ error: authError?.message || 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('[register-supplier-public] Auth user created:', userId);

    // 5. Create supplier record
    const supplierData = {
      name: body.companyName,
      cnpj: normalizedCNPJ,
      email: body.email.toLowerCase(),
      phone: body.phone || null,
      whatsapp: body.whatsapp || null,
      website: body.website || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      active: false, // Will be activated after admin approval
      type: 'local', // Will become 'certified' after approval
      certification_status: 'pending',
      visibility_scope: 'none', // Hidden until approved
      trade_name: body.tradeName || null,
      contacts: {
        phone: body.phone,
        whatsapp: body.whatsapp,
        email: body.email
      },
      specialties: body.specialties ? body.specialties.split(',').map(s => s.trim()) : [],
      bank_data: body.bankData ? {
        bank_name: body.bankData.bankName,
        agency: body.bankData.agency,
        account: body.bankData.account,
        pix_key: body.bankData.pixKey
      } : null,
      self_registered: true,
      self_registered_at: new Date().toISOString()
    };

    console.log('[register-supplier-public] Creating supplier record...');
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single();

    if (supplierError || !supplier) {
      console.error('[register-supplier-public] Supplier creation failed:', supplierError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar fornecedor. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[register-supplier-public] Supplier created:', supplier.id);

    // 6. Create profile
    const profileData = {
      id: userId,
      email: body.email.toLowerCase(),
      role: 'supplier',
      supplier_id: supplier.id,
      onboarding_completed: false,
      first_name: body.companyName.split(' ')[0],
      last_name: body.companyName.split(' ').slice(1).join(' ') || ''
    };

    console.log('[register-supplier-public] Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error('[register-supplier-public] Profile creation failed:', profileError);
      // Continue anyway - profile can be created on first login
    }

    // 7. Create notification for admins
    console.log('[register-supplier-public] Creating admin notification...');
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: 'Novo Fornecedor Aguardando Aprovação',
        message: `${body.companyName} (CNPJ: ${normalizedCNPJ}) realizou auto-cadastro e aguarda aprovação.`,
        type: 'info',
        read: false,
        metadata: {
          supplier_id: supplier.id,
          action: 'supplier_approval_required'
        }
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // 8. Create audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'SUPPLIER_SELF_REGISTER',
      entity_type: 'suppliers',
      entity_id: supplier.id,
      panel_type: 'supplier',
      details: {
        company_name: body.companyName,
        cnpj: normalizedCNPJ,
        email: body.email
      }
    });

    console.log('[register-supplier-public] Registration complete for:', body.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cadastro realizado com sucesso. Aguarde aprovação.',
        supplierId: supplier.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[register-supplier-public] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
