import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetClientDataRequest {
  clientId: string;
}

interface DeletedItemsCount {
  quotes: number;
  products: number;
  cost_centers: number;
  notifications: number;
  audit_logs: number;
  quote_items: number;
  quote_responses: number;
  approvals: number;
  payments: number;
  deliveries: number;
  supplier_ratings: number;
  storage_files: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar se é admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Only admins can reset client data');
    }

    const { clientId }: ResetClientDataRequest = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    console.log(`🧹 Starting data reset for client: ${clientId}`);

    const deletedItems: DeletedItemsCount = {
      quotes: 0,
      products: 0,
      cost_centers: 0,
      notifications: 0,
      audit_logs: 0,
      quote_items: 0,
      quote_responses: 0,
      approvals: 0,
      payments: 0,
      deliveries: 0,
      supplier_ratings: 0,
      storage_files: 0,
    };

    // Buscar informações do cliente para log
    const { data: client } = await supabaseClient
      .from('clients')
      .select('company_name, name')
      .eq('id', clientId)
      .single();

    // 1. Deletar cotações (CASCADE automático para itens, respostas, aprovações)
    const { data: quotes, error: quotesError } = await supabaseClient
      .from('quotes')
      .select('id')
      .eq('client_id', clientId);

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
    } else {
      deletedItems.quotes = quotes?.length || 0;
      
      // Deletar arquivos do storage relacionados às cotações
      for (const quote of quotes || []) {
        try {
          const { data: files } = await supabaseClient.storage
            .from('attachments')
            .list(`${quote.id}/`);
          
          if (files && files.length > 0) {
            const filePaths = files.map(f => `${quote.id}/${f.name}`);
            await supabaseClient.storage
              .from('attachments')
              .remove(filePaths);
            deletedItems.storage_files += files.length;
          }
        } catch (err) {
          console.error(`Error deleting storage for quote ${quote.id}:`, err);
        }
      }

      // Deletar as cotações (CASCADE fará o resto)
      await supabaseClient
        .from('quotes')
        .delete()
        .eq('client_id', clientId);
    }

    // 2. Deletar produtos
    const { count: productsCount, error: productsError } = await supabaseClient
      .from('products')
      .delete({ count: 'exact' })
      .eq('client_id', clientId);

    if (!productsError) {
      deletedItems.products = productsCount || 0;
    }

    // 3. Deletar centros de custo
    const { count: costCentersCount, error: costCentersError } = await supabaseClient
      .from('cost_centers')
      .delete({ count: 'exact' })
      .eq('client_id', clientId);

    if (!costCentersError) {
      deletedItems.cost_centers = costCentersCount || 0;
    }

    // 4. Deletar notificações
    const { data: userProfiles } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('client_id', clientId);

    if (userProfiles && userProfiles.length > 0) {
      const userIds = userProfiles.map(p => p.id);
      
      const { count: notificationsCount, error: notificationsError } = await supabaseClient
        .from('notifications')
        .delete({ count: 'exact' })
        .in('user_id', userIds);

      if (!notificationsError) {
        deletedItems.notifications = notificationsCount || 0;
      }
    }

    // 5. Deletar avaliações de fornecedores
    const { count: ratingsCount, error: ratingsError } = await supabaseClient
      .from('supplier_ratings')
      .delete({ count: 'exact' })
      .eq('client_id', clientId);

    if (!ratingsError) {
      deletedItems.supplier_ratings = ratingsCount || 0;
    }

    // 6. Deletar logs de auditoria (opcional - manter comentado se quiser preservar histórico)
    const { count: auditLogsCount, error: auditLogsError } = await supabaseClient
      .from('audit_logs')
      .delete({ count: 'exact' })
      .eq('client_id', clientId);

    if (!auditLogsError) {
      deletedItems.audit_logs = auditLogsCount || 0;
    }

    // 7. Resetar contadores
    await supabaseClient
      .from('client_quote_counters')
      .delete()
      .eq('client_id', clientId);

    await supabaseClient
      .from('client_usage')
      .delete()
      .eq('client_id', clientId);

    // Criar novo registro de uso zerado
    await supabaseClient
      .from('client_usage')
      .insert({ client_id: clientId });

    // Log final de auditoria (antes de deletar logs)
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'CLIENT_DATA_RESET',
        entity_type: 'clients',
        entity_id: clientId,
        panel_type: 'admin',
        details: {
          client_name: client?.company_name || client?.name,
          deleted_items: deletedItems,
          timestamp: new Date().toISOString(),
        },
      });

    console.log(`✅ Data reset completed for client: ${clientId}`, deletedItems);

    return new Response(
      JSON.stringify({
        success: true,
        clientId,
        clientName: client?.company_name || client?.name,
        deletedItems,
        message: 'Client data reset successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error resetting client data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
