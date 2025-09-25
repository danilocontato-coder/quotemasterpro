import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { quoteId, action } = await req.json()

    console.log('🔄 Updating quote status:', { quoteId, action })

    let newStatus = ''
    switch (action) {
      case 'mark_as_sent':
        newStatus = 'sent'
        break
      case 'mark_as_receiving':
        newStatus = 'receiving'
        break
      case 'mark_as_under_review':
        newStatus = 'under_review'
        break
      case 'approve':
        newStatus = 'approved'
        break
      case 'reject':
        newStatus = 'rejected'
        break
      case 'finalize':
        newStatus = 'finalized'
        break
      case 'cancel':
        newStatus = 'cancelled'
        break
      default:
        throw new Error('Invalid action')
    }

    // Update quote status
    const { data, error } = await supabase
      .from('quotes')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating quote status:', error)
      throw error
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      action: 'STATUS_UPDATE',
      entity_type: 'quotes',
      entity_id: quoteId,
      panel_type: 'system',
      details: {
        action,
        new_status: newStatus,
        updated_at: new Date().toISOString()
      }
    })

    console.log('✅ Quote status updated successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        quote: data,
        message: `Quote status updated to ${newStatus}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in update-quote-status:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as any)?.message || 'Unknown error' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})