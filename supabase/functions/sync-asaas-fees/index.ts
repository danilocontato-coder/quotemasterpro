import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'

/**
 * Sincroniza taxas do Asaas diretamente da API GET /myAccount/fees
 * Armazena em system_settings para uso dinâmico pelo sistema
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Iniciando sincronização de taxas do Asaas...')

    // Buscar configuração do Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabase)

    // Consultar taxas da API do Asaas
    const response = await fetch(`${baseUrl}/myAccount/fees`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erro ao consultar taxas do Asaas:', errorText)
      throw new Error(`Erro na API do Asaas: ${response.status} - ${errorText}`)
    }

    const fees = await response.json()
    console.log('📊 Taxas recebidas do Asaas:', JSON.stringify(fees, null, 2))

    // Estruturar taxas para armazenamento
    const formattedFees = {
      // Taxas de pagamento
      pix: fees.payment?.pix?.fixedFeeValue ?? 1.99,
      boleto: fees.payment?.bankSlip?.fixedFeeValue ?? 1.99,
      debit_card: {
        percentage: fees.payment?.debitCard?.percentageFee ?? 0,
        fixed: fees.payment?.debitCard?.fixedFeeValue ?? 0
      },
      credit_card: {
        // Taxa para pagamento à vista (1x)
        installment_1: {
          percentage: fees.payment?.creditCard?.operationValue ?? 2.99,
          fixed: fees.payment?.creditCard?.fixedFeeValue ?? 0.49
        },
        // Taxas escalonadas por parcelas (se disponíveis)
        installment_2_6: {
          percentage: fees.payment?.creditCard?.installment?.["2_6"]?.operationValue ?? 3.49,
          fixed: fees.payment?.creditCard?.fixedFeeValue ?? 0.49
        },
        installment_7_12: {
          percentage: fees.payment?.creditCard?.installment?.["7_12"]?.operationValue ?? 3.99,
          fixed: fees.payment?.creditCard?.fixedFeeValue ?? 0.49
        }
      },
      // Taxas de antecipação
      anticipation: {
        credit_card: fees.anticipation?.creditCard?.monthlyFee ?? 1.25,
        credit_card_installment: fees.anticipation?.creditCard?.installmentMonthlyFee ?? 1.70,
        boleto: fees.anticipation?.bankSlip?.monthlyFee ?? 5.79,
        pix: fees.anticipation?.pix?.monthlyFee ?? 5.79
      },
      // Taxas de notificação/mensageria
      messaging: fees.notification?.messagingFeeValue ?? 0.99,
      whatsapp: fees.notification?.whatsAppFeeValue ?? 0.10,
      // Taxas de transferência
      transfer: {
        pix: fees.transfer?.pix?.fixedFeeValue ?? 0,
        ted: fees.transfer?.ted?.fixedFeeValue ?? 0
      },
      // Metadados
      last_synced: new Date().toISOString(),
      source: 'asaas_api',
      raw_response: fees // Guardar resposta original para debug
    }

    console.log('💾 Salvando taxas formatadas:', {
      pix: formattedFees.pix,
      boleto: formattedFees.boleto,
      credit_card_1x: formattedFees.credit_card.installment_1,
      messaging: formattedFees.messaging
    })

    // Salvar no system_settings
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'asaas_fees',
        setting_value: formattedFees,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })

    if (upsertError) {
      console.error('❌ Erro ao salvar taxas:', upsertError)
      throw new Error(`Erro ao salvar taxas: ${upsertError.message}`)
    }

    // Log de auditoria
    await supabase.from('audit_logs').insert({
      action: 'ASAAS_FEES_SYNCED',
      entity_type: 'system_settings',
      entity_id: 'asaas_fees',
      panel_type: 'admin',
      details: {
        pix: formattedFees.pix,
        boleto: formattedFees.boleto,
        credit_card_1x: formattedFees.credit_card.installment_1,
        messaging: formattedFees.messaging,
        synced_at: formattedFees.last_synced
      }
    })

    console.log('✅ Taxas sincronizadas com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        fees: {
          pix: formattedFees.pix,
          boleto: formattedFees.boleto,
          credit_card: formattedFees.credit_card,
          messaging: formattedFees.messaging,
          anticipation: formattedFees.anticipation
        },
        last_synced: formattedFees.last_synced
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro em sync-asaas-fees:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Erro ao sincronizar taxas'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
