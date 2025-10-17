import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getAsaasConfig } from '../_shared/asaas-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get JWT from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { amount, transferMethod, bankAccount, notes } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Valor inválido');
    }

    if (!transferMethod || !['PIX', 'TED'].includes(transferMethod)) {
      throw new Error('Método de transferência inválido');
    }

    if (!bankAccount) {
      throw new Error('Dados bancários não fornecidos');
    }

    // Buscar fornecedor do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('supplier_id')
      .eq('id', user.id)
      .single();

    if (!profile?.supplier_id) {
      throw new Error('Fornecedor não encontrado');
    }

    // Buscar wallet do fornecedor
    const { data: supplier } = await supabaseClient
      .from('suppliers')
      .select('asaas_wallet_id, bank_data')
      .eq('id', profile.supplier_id)
      .single();

    if (!supplier?.asaas_wallet_id) {
      throw new Error('Wallet Asaas não configurada');
    }

    // Validar dados bancários completos
    const requiredFields = ['bank_code', 'agency', 'account', 'account_digit', 'account_holder_name', 'account_holder_document'];
    const missingFields = requiredFields.filter(field => !bankAccount[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Dados bancários incompletos: ${missingFields.join(', ')}`);
    }

    // Obter configuração do Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    console.log(`Requesting transfer: R$ ${amount} via ${transferMethod}`);

    // Criar transferência no Asaas
    const asaasPayload = {
      value: amount,
      operationType: transferMethod,
      bankAccount: {
        bank: {
          code: bankAccount.bank_code
        },
        accountName: bankAccount.account_holder_name,
        ownerName: bankAccount.account_holder_name,
        cpfCnpj: bankAccount.account_holder_document,
        agency: bankAccount.agency,
        account: bankAccount.account,
        accountDigit: bankAccount.account_digit
      },
      walletId: supplier.asaas_wallet_id
    };

    const response = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(asaasPayload)
    });

    const transferData = await response.json();

    if (!response.ok) {
      console.error('Asaas transfer error:', transferData);
      
      // Registrar transferência falhada
      await supabaseClient
        .from('supplier_transfers')
        .insert({
          supplier_id: profile.supplier_id,
          amount,
          transfer_method: transferMethod,
          bank_account: bankAccount,
          status: 'failed',
          error_message: transferData.errors?.[0]?.description || 'Erro ao processar transferência',
          notes
        });

      throw new Error(transferData.errors?.[0]?.description || 'Erro ao processar transferência');
    }

    console.log('✅ Transfer created successfully:', transferData.id);

    // Registrar transferência no banco
    const { data: transfer, error: transferError } = await supabaseClient
      .from('supplier_transfers')
      .insert({
        supplier_id: profile.supplier_id,
        amount,
        transfer_method: transferMethod,
        bank_account: bankAccount,
        status: transferData.status === 'DONE' ? 'completed' : 'processing',
        asaas_transfer_id: transferData.id,
        processed_at: transferData.status === 'DONE' ? new Date().toISOString() : null,
        completed_at: transferData.status === 'DONE' ? transferData.effectiveDate : null,
        notes
      })
      .select()
      .single();

    if (transferError) {
      console.error('Error saving transfer to database:', transferError);
    }

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'SUPPLIER_TRANSFER_REQUESTED',
        entity_type: 'supplier_transfers',
        entity_id: transfer?.id || 'unknown',
        panel_type: 'supplier',
        details: {
          supplier_id: profile.supplier_id,
          amount,
          transfer_method: transferMethod,
          asaas_transfer_id: transferData.id,
          status: transferData.status,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        transfer: {
          id: transfer?.id,
          asaas_transfer_id: transferData.id,
          status: transferData.status,
          amount,
          transfer_method: transferMethod,
          created_at: transfer?.created_at
        },
        message: transferData.status === 'DONE' ? 'Transferência realizada com sucesso' : 'Transferência em processamento'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in request-supplier-transfer:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
