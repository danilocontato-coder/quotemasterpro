import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Checking quote deadlines for suppliers...')

    // Chamar a função SQL
    const { error } = await supabaseClient.rpc('check_quote_deadlines_for_suppliers')

    if (error) {
      console.error('❌ Error checking deadlines:', error)
      throw error
    }

    console.log('✅ Deadline check completed')

    return new Response(
      JSON.stringify({ success: true, message: 'Deadline check completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in check-quote-deadlines:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as any)?.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
