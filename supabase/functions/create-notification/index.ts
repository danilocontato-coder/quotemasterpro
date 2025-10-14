import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface NotificationRequest {
  user_id?: string
  client_id?: string
  supplier_id?: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket'
  priority?: 'low' | 'normal' | 'high'
  action_url?: string
  metadata?: Record<string, any>
  notify_all_client_users?: boolean
  notify_all_supplier_users?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body: NotificationRequest = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      user_id,
      client_id,
      supplier_id,
      title,
      message,
      type = 'info',
      priority = 'normal',
      action_url,
      metadata,
      notify_all_client_users = false,
      notify_all_supplier_users = false
    } = body

    // Validar que pelo menos um identificador foi fornecido
    if (!user_id && !client_id && !supplier_id && !notify_all_client_users && !notify_all_supplier_users) {
      console.error('❌ Missing required parameters')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'É necessário fornecer user_id, client_id, supplier_id ou notify_all_*' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log('🔔 Creating notification:', { 
      user_id, 
      client_id, 
      supplier_id, 
      title, 
      type, 
      notify_all_client_users,
      notify_all_supplier_users
    })

    let targetUserIds: string[] = []

    if (notify_all_client_users && client_id) {
      // Buscar todos os usuários do cliente
      const { data: clientUsers, error: clientUsersError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('client_id', client_id)
        .eq('active', true)

      if (clientUsersError) {
        console.error('❌ Error fetching client users:', clientUsersError)
        throw clientUsersError
      }

      targetUserIds = clientUsers?.map(user => user.id) || []
      console.log('👥 Found client users:', targetUserIds.length)
    } else if (notify_all_supplier_users && supplier_id) {
      // Buscar todos os usuários do fornecedor
      const { data: supplierUsers, error: supplierUsersError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('supplier_id', supplier_id)
        .eq('active', true)

      if (supplierUsersError) {
        console.error('❌ Error fetching supplier users:', supplierUsersError)
        throw supplierUsersError
      }

      targetUserIds = supplierUsers?.map(user => user.id) || []
      console.log('🏭 Found supplier users for notifications:', targetUserIds.length)
      
      // Se não encontrou usuários, logar mas não falhar
      if (targetUserIds.length === 0) {
        console.warn('⚠️ No active users found for supplier, notification will be skipped')
      }
    } else if (supplier_id && !notify_all_supplier_users) {
      // Buscar usuários do fornecedor (modo individual)
      const { data: supplierUsers, error: supplierUsersError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('supplier_id', supplier_id)
        .eq('active', true)

      if (supplierUsersError) {
        console.error('❌ Error fetching supplier users:', supplierUsersError)
        throw supplierUsersError
      }

      targetUserIds = supplierUsers?.map(user => user.id) || []
      console.log('🏭 Found supplier users (individual):', targetUserIds.length)
    } else if (user_id) {
      targetUserIds = [user_id]
    } else {
      throw new Error('Must provide user_id, client_id, or supplier_id')
    }

    if (targetUserIds.length === 0) {
      console.log('⚠️ No target users found - returning success (non-critical)')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active users found for notification target',
          notifications_created: 0,
          target_users: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Criar notificações para todos os usuários alvo
    const notifications = targetUserIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      priority,
      action_url,
      metadata: metadata || {},
      read: false
    }))

    const { data, error } = await supabaseClient
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      console.error('❌ Error creating notifications:', error)
      throw error
    }

    console.log('✅ Created notifications:', data?.length)

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: data?.length || 0,
        target_users: targetUserIds.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in create-notification function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as any)?.message || 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})