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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ========================================
    // 0. VALIDAR CONFIGURAÇÃO DO WEBHOOK
    // ========================================
    const { data: webhookConfig } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_webhook_config')
      .single();

    const config = webhookConfig?.setting_value as any;

    // Validar se webhook está ativo
    if (!config?.enabled) {
      console.warn('⚠️ Webhook desabilitado nas configurações');
      return new Response(
        JSON.stringify({ 
          status: 'REJECTED',
          message: 'Webhook não está ativo'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar token de autenticação (Asaas usa "asaas-access-token" no header)
    const authToken = req.headers.get('asaas-access-token') || req.headers.get('asaas-webhook-token');
    
    console.log('🔐 Headers recebidos:', {
      'asaas-access-token': req.headers.get('asaas-access-token') ? '***configurado***' : null,
      'asaas-webhook-token': req.headers.get('asaas-webhook-token') ? '***configurado***' : null,
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent')
    });
    
    if (config?.auth_token && authToken !== config.auth_token) {
      console.error('❌ Token de autenticação inválido. Esperado:', config.auth_token?.substring(0, 8) + '...');
      console.error('❌ Token recebido:', authToken ? authToken.substring(0, 8) + '...' : 'NENHUM');
      return new Response(
        JSON.stringify({ 
          status: 'REJECTED',
          message: 'Token de autenticação inválido'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('✅ Token de autenticação validado');

    const payload = await req.json();
    console.log('📦 Payload recebido:', JSON.stringify(payload, null, 2));

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
    // 1. BUSCAR TRANSFERÊNCIA NO BANCO (supplier_transfers OU payments)
    // ========================================
    let transferRecord: any = null;
    let recordType: 'supplier_transfers' | 'payments' = 'supplier_transfers';
    let supplierData: any = null;

    // Primeiro tentar em supplier_transfers
    const { data: supplierTransfer, error: stError } = await supabase
      .from('supplier_transfers')
      .select('*, suppliers(id, name, bank_data, pix_key)')
      .eq('asaas_transfer_id', transferId)
      .single();

    if (supplierTransfer) {
      transferRecord = supplierTransfer;
      recordType = 'supplier_transfers';
      supplierData = supplierTransfer.suppliers;
      console.log(`✅ Transferência encontrada em supplier_transfers: Fornecedor=${supplierData?.name}`);
    } else {
      console.log('⚠️ Não encontrado em supplier_transfers, buscando em payments...');
      
      // Tentar buscar em payments
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          suppliers!payments_supplier_id_fkey(id, name, bank_data, pix_key)
        `)
        .eq('asaas_transfer_id', transferId)
        .single();
      
      if (payment) {
        transferRecord = payment;
        recordType = 'payments';
        supplierData = payment.suppliers;
        console.log(`✅ Transferência encontrada em payments: Fornecedor=${supplierData?.name}, PaymentID=${payment.id}`);
      }
    }

    if (!transferRecord) {
      console.warn('⚠️ Transferência não encontrada em nenhuma tabela:', transferId);
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

    // ========================================
    // 2. VALIDAÇÕES DE SEGURANÇA
    // ========================================
    // Adaptar campos baseado no tipo de registro
    const recordAmount = recordType === 'payments' ? transferRecord.amount : transferRecord.amount;
    const recordStatus = transferRecord.status;
    
    // Para payments, aceitar status 'escrow' ou 'releasing' (quando estamos liberando fundos)
    const validStatuses = recordType === 'payments' 
      ? ['escrow', 'releasing', 'processing']
      : ['pending'];

    const validations = {
      valueMatch: Math.abs(recordAmount - value) < 0.01,
      statusValid: validStatuses.includes(recordStatus),
      supplierActive: supplierData !== null,
      valuePositive: value > 0
    };

    console.log('🔍 Validações:', { 
      ...validations, 
      recordType, 
      recordAmount, 
      expectedValue: value,
      recordStatus,
      validStatuses 
    });

    // Se qualquer validação falhar, rejeitar
    if (!Object.values(validations).every(v => v)) {
      console.error('❌ Validações falharam:', validations);
      
      // Atualizar status baseado no tipo de registro
      if (recordType === 'supplier_transfers') {
        await supabase
          .from('supplier_transfers')
          .update({ 
            status: 'failed',
            error_message: 'Validação de segurança falhou no webhook',
            processed_at: new Date().toISOString()
          })
          .eq('id', transferRecord.id);
      } else {
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            notes: (transferRecord.notes || '') + '\n[Webhook] Validação de segurança falhou'
          })
          .eq('id', transferRecord.id);
      }

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
    // 3. VALIDAÇÃO DE LIMITE (CONFIGURÁVEL)
    // ========================================
    const MAX_TRANSFER_VALUE = config?.max_auto_approve_amount || 50000;
    if (value > MAX_TRANSFER_VALUE) {
      console.warn(`⚠️ Valor excede limite máximo: R$ ${value} > R$ ${MAX_TRANSFER_VALUE}`);
      
      if (recordType === 'supplier_transfers') {
        await supabase
          .from('supplier_transfers')
          .update({ 
            status: 'pending',
            error_message: `Valor excede limite de R$ ${MAX_TRANSFER_VALUE.toFixed(2)} - requer aprovação manual`,
            notes: `${transferRecord.notes || ''}\n[Sistema] Valor excede limite automático`
          })
          .eq('id', transferRecord.id);
      } else {
        await supabase
          .from('payments')
          .update({ 
            status: 'pending_approval',
            notes: `${transferRecord.notes || ''}\n[Sistema] Valor excede limite de R$ ${MAX_TRANSFER_VALUE.toFixed(2)} - requer aprovação manual`
          })
          .eq('id', transferRecord.id);
      }

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
    // 4. VALIDAÇÃO DE DADOS BANCÁRIOS (se habilitado)
    // ========================================
    if (config?.validate_pix_key !== false && supplierData) {
      const supplierBankData = supplierData.bank_data;
      const supplierPixKey = supplierData.pix_key || supplierBankData?.pix_key;
      
      if (supplierPixKey && pixKey) {
        const pixMatches = supplierPixKey.toLowerCase().trim() === pixKey.toLowerCase().trim();
        if (!pixMatches) {
          console.error(`❌ Chave PIX não confere: esperado=${supplierPixKey}, recebido=${pixKey}`);
          
          if (recordType === 'supplier_transfers') {
            await supabase
              .from('supplier_transfers')
              .update({ 
                status: 'failed',
                error_message: 'Chave PIX não confere com cadastro do fornecedor',
                processed_at: new Date().toISOString()
              })
              .eq('id', transferRecord.id);
          } else {
            await supabase
              .from('payments')
              .update({ 
                status: 'failed',
                notes: (transferRecord.notes || '') + '\n[Webhook] Chave PIX não confere'
              })
              .eq('id', transferRecord.id);
          }

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

    if (recordType === 'supplier_transfers') {
      await supabase
        .from('supplier_transfers')
        .update({ 
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', transferRecord.id);
    } else {
      // Para payments, atualizar para 'released' indicando que a transferência foi aprovada
      await supabase
        .from('payments')
        .update({ 
          status: 'released',
          released_at: new Date().toISOString()
        })
        .eq('id', transferRecord.id);
      
      // Também atualizar a cotação para 'paid'
      if (transferRecord.quote_id) {
        await supabase
          .from('quotes')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', transferRecord.quote_id);
        
        console.log(`✅ Quote ${transferRecord.quote_id} atualizada para 'paid'`);
      }
    }

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: 'TRANSFER_AUTO_APPROVED',
        entity_type: recordType,
        entity_id: transferRecord.id,
        panel_type: 'system',
        details: {
          asaas_transfer_id: transferId,
          supplier_id: supplierData?.id,
          supplier_name: supplierData?.name,
          amount: value,
          record_type: recordType,
          quote_id: transferRecord.quote_id,
          validations_passed: validations,
          webhook_timestamp: new Date().toISOString()
        }
      });

    console.log(`✅ Transferência aprovada automaticamente (${recordType}):`, transferId);

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
