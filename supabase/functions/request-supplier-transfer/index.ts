import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getAsaasConfig } from '../_shared/asaas-utils.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { validateSupplierAuth } from '../_shared/auth-helper.ts';

// Função para mapear tipo de conta PT → EN (Asaas)
function mapAccountType(accountType: string): string {
  const mapping: Record<string, string> = {
    'corrente': 'CHECKING_ACCOUNT',
    'poupanca': 'SAVINGS_ACCOUNT',
    'poupança': 'SAVINGS_ACCOUNT',
    'salario': 'SALARY_ACCOUNT',
    'salário': 'SALARY_ACCOUNT',
    'pagamento': 'PAYMENT_ACCOUNT'
  };
  
  return mapping[accountType?.toLowerCase()] || 'CHECKING_ACCOUNT';
}

// Função para detectar tipo de chave PIX
function detectPixKeyType(pixKey: string): string | null {
  if (!pixKey) return null;
  
  console.log(`🔍 Detectando tipo de chave PIX: "${pixKey}"`);
  
  // Remove apenas espaços em branco
  const cleanKey = pixKey.trim();
  
  // CPF: 015.229.475-90 ou 01522947590
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(cleanKey)) {
    console.log('✅ Tipo detectado: CPF');
    return 'CPF';
  }
  
  // CNPJ: 12.345.678/0001-90 ou 12345678000190
  if (/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(cleanKey)) {
    console.log('✅ Tipo detectado: CNPJ');
    return 'CNPJ';
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey)) {
    console.log('✅ Tipo detectado: EMAIL');
    return 'EMAIL';
  }
  
  // Telefone: +5571985350277 ou 5571985350277
  if (/^\+?55\d{10,11}$/.test(cleanKey.replace(/\D/g, ''))) {
    console.log('✅ Tipo detectado: PHONE');
    return 'PHONE';
  }
  
  // EVP (chave aleatória) - UUID format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey)) {
    console.log('✅ Tipo detectado: EVP');
    return 'EVP';
  }
  
  console.log('❌ Tipo não detectado');
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate authentication and get supplier profile
    const { user, profile } = await validateSupplierAuth(req, supabaseClient);

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
    const requiredFields = ['bank_code', 'agency', 'account_number', 'account_digit', 'account_holder_name', 'account_holder_document', 'account_type'];
    const missingFields = requiredFields.filter(field => !bankAccount[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Dados bancários incompletos: ${missingFields.join(', ')}`);
    }

    // Obter configuração do Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    console.log(`Requesting transfer: R$ ${amount} via ${transferMethod}`);
    console.log('Bank account data received:', JSON.stringify(bankAccount, null, 2));

    // Montar payload base
    const asaasPayload: any = {
      value: amount,
      operationType: transferMethod,
      walletId: supplier.asaas_wallet_id
    };

    // Para transferências PIX, priorizar chave PIX se disponível
    if (transferMethod === 'PIX' && bankAccount.pix_key) {
      const pixKeyType = detectPixKeyType(bankAccount.pix_key);
      console.log(`🔑 PIX Key Type detected: ${pixKeyType}`);
      
      if (pixKeyType) {
        // Transferência PIX via chave - NÃO enviar dados bancários
        asaasPayload.pixAddressKey = bankAccount.pix_key;
        asaasPayload.pixAddressKeyType = pixKeyType;
        console.log(`✅ Using PIX key transfer (no bank account data)`);
      } else {
        console.log(`⚠️ PIX key type not detected, falling back to bank account data`);
        // Fallback: usar dados bancários
        asaasPayload.bankAccount = {
          bank: { code: bankAccount.bank_code },
          accountName: bankAccount.account_holder_name,
          ownerName: bankAccount.account_holder_name,
          cpfCnpj: bankAccount.account_holder_document,
          agency: bankAccount.agency,
          account: bankAccount.account_number,
          accountDigit: bankAccount.account_digit,
          bankAccountType: mapAccountType(bankAccount.account_type)
        };
      }
    } else {
      // Transferência TED ou PIX sem chave - usar dados bancários
      asaasPayload.bankAccount = {
        bank: { code: bankAccount.bank_code },
        accountName: bankAccount.account_holder_name,
        ownerName: bankAccount.account_holder_name,
        cpfCnpj: bankAccount.account_holder_document,
        agency: bankAccount.agency,
        account: bankAccount.account_number,
        accountDigit: bankAccount.account_digit,
        bankAccountType: mapAccountType(bankAccount.account_type)
      };
      console.log(`✅ Using bank account data transfer`);
    }

    console.log('Asaas payload being sent:', JSON.stringify(asaasPayload, null, 2));

    let response = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(asaasPayload)
    });

    let transferData = await response.json();

    // Se falhar com "chave não encontrada" no sandbox e temos dados bancários, tentar com dados bancários
    if (!response.ok && 
        transferData.errors?.[0]?.description?.includes('chave informada não foi encontrada') &&
        transferMethod === 'PIX' &&
        environment === 'sandbox') {
      
      console.log('⚠️ PIX key not found in sandbox, retrying with bank account data...');
      
      // Tentar novamente com dados bancários completos
      asaasPayload.bankAccount = {
        bank: { code: bankAccount.bank_code },
        accountName: bankAccount.account_holder_name,
        ownerName: bankAccount.account_holder_name,
        cpfCnpj: bankAccount.account_holder_document,
        agency: bankAccount.agency,
        account: bankAccount.account_number,
        accountDigit: bankAccount.account_digit,
        bankAccountType: mapAccountType(bankAccount.account_type)
      };
      delete asaasPayload.pixAddressKey;
      delete asaasPayload.pixAddressKeyType;
      
      console.log('🔄 Retrying with bank account data:', JSON.stringify(asaasPayload, null, 2));
      
      response = await fetch(`${baseUrl}/transfers`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(asaasPayload)
      });
      
      transferData = await response.json();
    }

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
