import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔔 [approve-transfer-webhook] Recebendo requisição do Asaas');

  try {
    const payload = await req.json();
    console.log('📦 Payload recebido:', JSON.stringify(payload, null, 2));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validar estrutura do payload
    if (!payload.transfer || !payload.transfer.id) {
      console.error('❌ Payload inválido - faltando dados da transferência');
      return new Response(
        JSON.stringify({ 
          status: 'REJECTED',
          message: 'Payload inválido'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const transfer = payload.transfer;
    const transferId = transfer.id;
    const value = parseFloat(transfer.value || 0);
    const pixKey = transfer.pixKey;
    const bankAccount = transfer.bankAccount;

    console.log(`💰 Analisando transferência: ID=${transferId}, Valor=R$ ${value}`);

    // ========================================
    // 1. BUSCAR TRANSFERÊNCIA NO BANCO
    // ========================================
    const { data: supplierTransfer, error: fetchError } = await supabase
      .from('supplier_transfers')
      .select('*, suppliers(id, name, bank_data)')
      .eq('asaas_transfer_id', transferId)
      .single();

    if (fetchError || !supplierTransfer) {
      console.warn('⚠️ Transferência não encontrada no banco:', transferId);
      // Rejeitar por segurança
      return new Response(
        JSON.stringify({ 
          status: 'REJECTED',
          message: 'Transferência não registrada no sistema'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Transferência encontrada: Fornecedor=${supplierTransfer.suppliers?.name}`);

    // ========================================
    // 2. VALIDAÇÕES DE SEGURANÇA
    // ========================================
    const validations = {
      valueMatch: Math.abs(supplierTransfer.amount - value) < 0.01,
      statusValid: supplierTransfer.status === 'pending',
      supplierActive: supplierTransfer.suppliers !== null,
      valuePositive: value > 0
    };

    console.log('🔍 Validações:', validations);

    // Se qualquer validação falhar, rejeitar
    if (!Object.values(validations).every(v => v)) {
      console.error('❌ Validações falharam:', validations);
      
      await supabase
        .from('supplier_transfers')
        .update({ 
          status: 'failed',
          error_message: 'Validação de segurança falhou no webhook',
          processed_at: new Date().toISOString()
        })
        .eq('id', supplierTransfer.id);

      return new Response(
        JSON.stringify({ 
          status: 'REJECTED',
          message: 'Validação de segurança falhou'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ========================================
    // 3. VALIDAÇÃO DE LIMITE (OPCIONAL)
    // ========================================
    const MAX_TRANSFER_VALUE = 50000; // R$ 50.000 limite máximo por transferência
    if (value > MAX_TRANSFER_VALUE) {
      console.warn(`⚠️ Valor excede limite máximo: R$ ${value} > R$ ${MAX_TRANSFER_VALUE}`);
      
      await supabase
        .from('supplier_transfers')
        .update({ 
          status: 'pending',
          error_message: `Valor excede limite de R$ ${MAX_TRANSFER_VALUE.toFixed(2)} - requer aprovação manual`,
          notes: `${supplierTransfer.notes || ''}\n[Sistema] Valor excede limite automático`
        })
        .eq('id', supplierTransfer.id);

      return new Response(
        JSON.stringify({ 
          status: 'REJECTED',
          message: `Valor excede limite de R$ ${MAX_TRANSFER_VALUE.toFixed(2)}`
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ========================================
    // 4. VALIDAÇÃO DE DADOS BANCÁRIOS
    // ========================================
    const supplierBankData = supplierTransfer.suppliers?.bank_data;
    
    if (supplierBankData) {
      const expectedPixKey = supplierBankData.pix_key;
      const expectedAccount = supplierBankData.account;

      if (expectedPixKey && pixKey) {
        const pixMatches = expectedPixKey.toLowerCase().trim() === pixKey.toLowerCase().trim();
        if (!pixMatches) {
          console.error(`❌ Chave PIX não confere: esperado=${expectedPixKey}, recebido=${pixKey}`);
          
          await supabase
            .from('supplier_transfers')
            .update({ 
              status: 'failed',
              error_message: 'Chave PIX não confere com cadastro do fornecedor',
              processed_at: new Date().toISOString()
            })
            .eq('id', supplierTransfer.id);

          return new Response(
            JSON.stringify({ 
              status: 'REJECTED',
              message: 'Dados bancários não conferem'
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }

    // ========================================
    // 5. APROVAÇÃO AUTOMÁTICA
    // ========================================
    console.log('✅ Todas as validações passaram - APROVANDO transferência');

    await supabase
      .from('supplier_transfers')
      .update({ 
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', supplierTransfer.id);

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: 'TRANSFER_AUTO_APPROVED',
        entity_type: 'supplier_transfers',
        entity_id: supplierTransfer.id,
        panel_type: 'system',
        details: {
          asaas_transfer_id: transferId,
          supplier_id: supplierTransfer.supplier_id,
          supplier_name: supplierTransfer.suppliers?.name,
          amount: value,
          transfer_method: supplierTransfer.transfer_method,
          validations_passed: validations,
          webhook_timestamp: new Date().toISOString()
        }
      });

    console.log('✅ Transferência aprovada automaticamente:', transferId);

    return new Response(
      JSON.stringify({ 
        status: 'APPROVED',
        message: 'Transferência aprovada automaticamente'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no webhook de autorização:', error);
    
    // Em caso de erro, REJEITAR por segurança
    return new Response(
      JSON.stringify({ 
        status: 'REJECTED',
        message: 'Erro ao processar autorização',
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
