import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getAsaasFees, calculateAsaasFee } from '../_shared/asaas-fees.ts'

/**
 * Endpoint para frontend consultar taxas de pagamento
 * Retorna preview de todas as opções com valores calculados
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

    const { baseAmount } = await req.json()

    if (!baseAmount || baseAmount <= 0) {
      throw new Error('Valor base inválido')
    }

    console.log(`💰 Calculando taxas para valor base: R$ ${baseAmount}`)

    // Buscar taxas do banco
    const fees = await getAsaasFees(supabase)

    // Calcular todas as opções de pagamento
    const pixFee = calculateAsaasFee(baseAmount, 'PIX', fees)
    const boletoFee = calculateAsaasFee(baseAmount, 'BOLETO', fees)
    const creditCard1xFee = calculateAsaasFee(baseAmount, 'CREDIT_CARD', fees, 1)
    const creditCard2_6Fee = calculateAsaasFee(baseAmount, 'CREDIT_CARD', fees, 3) // Exemplo: 3x
    const creditCard7_12Fee = calculateAsaasFee(baseAmount, 'CREDIT_CARD', fees, 10) // Exemplo: 10x

    const messagingFee = fees.messaging || 0.99

    const response = {
      base_amount: baseAmount,
      fees_source: fees.source || 'fallback',
      last_synced: fees.last_synced || null,
      
      payment_options: {
        pix: {
          fee: Math.round((pixFee + messagingFee) * 100) / 100,
          payment_fee: Math.round(pixFee * 100) / 100,
          messaging_fee: Math.round(messagingFee * 100) / 100,
          total: Math.round((baseAmount + pixFee + messagingFee) * 100) / 100,
          label: 'PIX (instantâneo)',
          description: 'Pagamento instantâneo via PIX'
        },
        boleto: {
          fee: Math.round((boletoFee + messagingFee) * 100) / 100,
          payment_fee: Math.round(boletoFee * 100) / 100,
          messaging_fee: Math.round(messagingFee * 100) / 100,
          total: Math.round((baseAmount + boletoFee + messagingFee) * 100) / 100,
          label: 'Boleto Bancário',
          description: 'Compensação em 1-2 dias úteis'
        },
        credit_card_1x: {
          fee: Math.round((creditCard1xFee + messagingFee) * 100) / 100,
          payment_fee: Math.round(creditCard1xFee * 100) / 100,
          messaging_fee: Math.round(messagingFee * 100) / 100,
          total: Math.round((baseAmount + creditCard1xFee + messagingFee) * 100) / 100,
          label: 'Cartão à Vista',
          description: 'Crédito em 1x sem juros',
          installments: 1
        },
        credit_card_2_6x: {
          fee: Math.round((creditCard2_6Fee + messagingFee) * 100) / 100,
          payment_fee: Math.round(creditCard2_6Fee * 100) / 100,
          messaging_fee: Math.round(messagingFee * 100) / 100,
          total: Math.round((baseAmount + creditCard2_6Fee + messagingFee) * 100) / 100,
          label: 'Cartão 2-6x',
          description: 'Parcelado de 2 a 6 vezes',
          installments: '2-6'
        },
        credit_card_7_12x: {
          fee: Math.round((creditCard7_12Fee + messagingFee) * 100) / 100,
          payment_fee: Math.round(creditCard7_12Fee * 100) / 100,
          messaging_fee: Math.round(messagingFee * 100) / 100,
          total: Math.round((baseAmount + creditCard7_12Fee + messagingFee) * 100) / 100,
          label: 'Cartão 7-12x',
          description: 'Parcelado de 7 a 12 vezes',
          installments: '7-12'
        }
      },
      
      // Taxas brutas para exibição
      raw_fees: {
        pix: fees.pix,
        boleto: fees.boleto,
        credit_card: fees.credit_card,
        messaging: fees.messaging
      }
    }

    console.log('📊 Opções calculadas:', {
      pix_total: response.payment_options.pix.total,
      boleto_total: response.payment_options.boleto.total,
      credit_1x_total: response.payment_options.credit_card_1x.total
    })

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro em get-payment-fees:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Erro ao calcular taxas'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
