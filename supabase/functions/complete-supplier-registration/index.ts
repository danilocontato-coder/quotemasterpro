import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveEvolutionConfig, sendEvolutionWhatsApp, normalizePhone } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar senha temporária segura
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem letras ambíguas
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      invitation_token,
      supplier_data 
    } = await req.json();

    console.log('🔐 Complete registration for token:', invitation_token);

    // 1. Buscar token de cotação e dados do fornecedor
    const { data: tokenData, error: tokenError } = await supabase
      .from('quote_tokens')
      .select('quote_id, supplier_id, expires_at')
      .eq('full_token', invitation_token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('Token not found or invalid:', tokenError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Convite inválido ou expirado.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar expiração
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Link de cadastro expirado. Solicite um novo convite.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar dados do fornecedor
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', tokenData.supplier_id)
      .single();

    if (supplierError || !supplier) {
      console.error('Supplier not found:', supplierError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Fornecedor não encontrado.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Gerar senha temporária
    const temporaryPassword = generateTemporaryPassword();
    console.log(`🔑 Temporary password generated for: ${supplier.email}`);

    let userId: string;

    // 4. Tentar criar usuário diretamente (mais eficiente)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: supplier.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        name: supplier.name,
        role: 'supplier'
      }
    });

    if (authError) {
      // Se o erro for "email já registrado", buscar e atualizar senha
      if (authError.message?.includes('already been registered') || authError.status === 422) {
        console.log('⚠️ User already exists, attempting to find...');
        
        try {
          let existingUser = null;

          // TENTATIVA 1: Buscar via profiles (mais rápido)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', supplier.email.toLowerCase())
            .maybeSingle();

          if (profileData) {
            existingUser = { id: profileData.id, email: profileData.email };
            console.log(`📧 Found via profiles: ${existingUser.id}`);
          } else {
            // TENTATIVA 2 (FALLBACK): Buscar via auth.admin
            console.log('⚠️ Profile not found, checking auth.users...');
            
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const authUser = users?.find(u => 
              u.email?.toLowerCase() === supplier.email.toLowerCase()
            );
            
            if (authUser) {
              existingUser = { id: authUser.id, email: authUser.email };
              console.log(`📧 Found via auth.users: ${existingUser.id}`);
            }
          }

          if (!existingUser) {
            console.error('❌ User not found in profiles or auth.users');
            throw new Error(`User with email ${supplier.email} not found`);
          }

          // Atualizar senha do usuário existente
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { 
              password: temporaryPassword,
              email_confirm: true,
              user_metadata: {
                name: supplier.name,
                role: 'supplier'
              }
            }
          );
          
          if (updateError) {
            console.error('❌ Error updating password:', updateError);
            throw new Error(`Failed to update password: ${updateError.message}`);
          }
          
          userId = existingUser.id;
          console.log(`✅ Password updated for existing user: ${userId}`);
          
        } catch (handleError: any) {
          console.error('❌ Error handling existing user:', handleError);
          throw new Error(`Failed to handle existing user: ${handleError.message}`);
        }
      } else {
        // Outro tipo de erro - lançar
        console.error('❌ Auth creation error:', authError);
        throw new Error(`Auth error: ${authError.message}`);
      }
    } else {
      // Usuário criado com sucesso
      userId = authData.user.id;
      console.log(`✅ New user created: ${userId}`);
    }

    // 5. Preparar dados de atualização do fornecedor (NÃO atualizar ainda)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Documento
    if (supplier_data?.document_type) updateData.document_type = supplier_data.document_type;
    if (supplier_data?.document_number) updateData.document_number = supplier_data.document_number;
    
    // Contato
    if (supplier_data?.whatsapp) updateData.whatsapp = supplier_data.whatsapp;
    if (supplier_data?.phone) updateData.phone = supplier_data.phone;
    if (supplier_data?.website) updateData.website = supplier_data.website;
    
    // Endereço completo como JSON
    if (supplier_data?.cep) {
      updateData.address = {
        street: supplier_data.street || '',
        number: supplier_data.number || '',
        complement: supplier_data.complement || '',
        neighborhood: supplier_data.neighborhood || '',
        city: supplier_data.city || '',
        state: supplier_data.state || '',
        zipCode: supplier_data.cep
      };
      
      // Manter campos de localização separados para queries
      updateData.city = supplier_data.city;
      updateData.state = supplier_data.state;
    }
    
    // Especialidades
    if (supplier_data?.specialties && Array.isArray(supplier_data.specialties)) {
      updateData.specialties = supplier_data.specialties;
    }
    
    // Business info
    if (supplier_data?.description) {
      updateData.business_info = {
        ...(supplier.business_info || {}),
        description: supplier_data.description
      };
    }

    // Atualizar dados do fornecedor (SEM mudar status ainda)
    const { error: updateError } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', supplier.id);

    if (updateError) {
      console.error('❌ Supplier update error:', updateError);
      throw new Error(`Failed to update supplier: ${updateError.message}`);
    }

    console.log('✅ Supplier data updated');

    // 6. Vincular profile ao fornecedor
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: supplier.email.trim().toLowerCase(),
        name: supplier.name?.trim() || 'Fornecedor',
        role: 'supplier',
        tenant_type: 'supplier',
        supplier_id: supplier.id,
        onboarding_completed: true,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      throw new Error(`Failed to link profile: ${profileError.message}`);
    }

    console.log('✅ Profile linked to supplier');

    // 7. Gerar tokens de acesso usando signInWithPassword
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: supplier.email,
      password: temporaryPassword
    });

    if (signInError || !signInData.session) {
      console.error('❌ Sign in error:', signInError);
      throw new Error(`Failed to generate session: ${signInError?.message || 'No session created'}`);
    }

    console.log('✅ Session tokens generated for auto-login');

    // 8. Buscar nome do sistema
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'company_name')
      .maybeSingle();

    const platformName = systemSettings?.setting_value?.value || 'QuoteMaster Pro';

    // 9. Enviar WhatsApp com credenciais
    let whatsappSent = false;
    let whatsappError = null;

    try {
      const evolutionConfig = await resolveEvolutionConfig(supabase, supplier.client_id, true);
      
      if (evolutionConfig.apiUrl && evolutionConfig.token) {
        const phone = normalizePhone(supplier.whatsapp || supplier.phone || '');
        
        if (phone && phone.length >= 12) {
          const message = 
            `🎉 Bem-vindo ao ${platformName}!\n\n` +
            `✅ Seu cadastro foi concluído com sucesso!\n\n` +
            `📧 *Email:* ${supplier.email}\n` +
            `🔑 *Senha temporária:* ${temporaryPassword}\n\n` +
            `⚠️ *IMPORTANTE:* Recomendamos trocar sua senha no primeiro acesso.\n\n` +
            `🔗 *Acesse agora:*\n` +
            `${Deno.env.get('PUBLIC_APP_URL') || 'https://app.quotemaster.com'}/auth/login\n\n` +
            `Você já pode responder cotações e gerenciar suas propostas! 🚀`;

          const result = await sendEvolutionWhatsApp(
            evolutionConfig,
            phone,
            message
          );

          whatsappSent = result.success;
          whatsappError = result.error;
          
          console.log('📱 WhatsApp credentials:', { 
            sent: whatsappSent, 
            phone,
            error: whatsappError 
          });
        } else {
          console.warn('⚠️ Invalid phone for WhatsApp:', supplier.phone);
        }
      } else {
        console.warn('⚠️ Evolution API not configured');
      }
    } catch (error: any) {
      console.error('❌ WhatsApp send error:', error);
      whatsappError = error.message;
    }

    // 10. APENAS AGORA marcar fornecedor como ativo (após todas operações críticas)
    const { error: statusError } = await supabase
      .from('suppliers')
      .update({
        status: 'active',
        registration_status: 'active',
        registration_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', supplier.id);

    if (statusError) {
      console.error('❌ Failed to activate supplier:', statusError);
      throw new Error(`Failed to activate supplier: ${statusError.message}`);
    }

    console.log('✅ Supplier activated successfully');

    // 11. Criar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'SUPPLIER_REGISTRATION_COMPLETED',
        entity_type: 'suppliers',
        entity_id: supplier.id,
        panel_type: 'supplier',
        details: {
          supplier_name: supplier.name,
          supplier_email: supplier.email,
          whatsapp_sent: whatsappSent,
          whatsapp_error: whatsappError,
          quote_id: tokenData.quote_id,
          invited_by_client_id: supplier.client_id
        }
      });

    console.log('✅ Registration completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
        supplier_id: supplier.id,
        quote_id: tokenData.quote_id,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token
        },
        temporary_password: temporaryPassword,
        whatsapp_sent: whatsappSent,
        message: 'Cadastro concluído! Credenciais enviadas por WhatsApp.'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Complete registration error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro ao completar cadastro.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
