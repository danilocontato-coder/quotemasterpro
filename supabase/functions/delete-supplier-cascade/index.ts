import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { supplierId, forceDelete } = await req.json()

    if (!supplierId) {
      return new Response(
        JSON.stringify({ error: 'supplier_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Iniciando exclusão do fornecedor ${supplierId}, forceDelete: ${forceDelete}`)

    // Verificar se há dados vinculados
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)

    const { count: quotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)

    const { count: quotesSelectedCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .contains('selected_supplier_ids', [supplierId])

    const hasLinkedData = (productsCount || 0) > 0 || (quotesCount || 0) > 0 || (quotesSelectedCount || 0) > 0

    console.log(`Dados vinculados encontrados: produtos=${productsCount}, cotações=${quotesCount}, cotações_selecionadas=${quotesSelectedCount}`)

    if (hasLinkedData && !forceDelete) {
      // Apenas desativar o fornecedor
      const { error: updateError } = await supabase
        .from('suppliers')
        .update({ status: 'inactive' })
        .eq('id', supplierId)

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'deactivated',
          message: 'Fornecedor desativado devido a dados vinculados'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (forceDelete && hasLinkedData) {
      console.log('Executando exclusão forçada - removendo dados vinculados...')
      
      // 1. Remover produtos vinculados
      if ((productsCount || 0) > 0) {
        const { error: productsError } = await supabase
          .from('products')
          .delete()
          .eq('supplier_id', supplierId)

        if (productsError) {
          console.error('Erro ao remover produtos:', productsError)
          throw productsError
        }
        console.log(`${productsCount} produtos removidos`)
      }

      // 2. Remover referências em cotações (supplier_id)
      if ((quotesCount || 0) > 0) {
        const { error: quotesError } = await supabase
          .from('quotes')
          .update({ supplier_id: null })
          .eq('supplier_id', supplierId)

        if (quotesError) {
          console.error('Erro ao limpar referências em cotações:', quotesError)
          throw quotesError
        }
        console.log(`${quotesCount} referências em cotações removidas`)
      }

      // 3. Remover fornecedor de arrays selected_supplier_ids
      if ((quotesSelectedCount || 0) > 0) {
        // Buscar cotações que contêm o fornecedor no array
        const { data: quotesWithSupplier, error: fetchError } = await supabase
          .from('quotes')
          .select('id, selected_supplier_ids')
          .contains('selected_supplier_ids', [supplierId])

        if (fetchError) {
          console.error('Erro ao buscar cotações com fornecedor selecionado:', fetchError)
          throw fetchError
        }

        // Atualizar cada cotação removendo o fornecedor do array
        for (const quote of quotesWithSupplier || []) {
          const updatedSuppliers = (quote.selected_supplier_ids || []).filter((id: string) => id !== supplierId)
          
          const { error: updateError } = await supabase
            .from('quotes')
            .update({ selected_supplier_ids: updatedSuppliers })
            .eq('id', quote.id)

          if (updateError) {
            console.error('Erro ao atualizar cotação:', updateError)
            throw updateError
          }
        }
        console.log(`${quotesSelectedCount} referências em selected_supplier_ids removidas`)
      }

      // 4. Remover outras tabelas relacionadas
      const relatedTables = [
        'quote_responses',
        'supplier_ratings', 
        'payments',
        'deliveries',
        'client_suppliers'
      ]

      for (const table of relatedTables) {
        try {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq('supplier_id', supplierId)
          
          if (error && !error.message.includes('does not exist')) {
            console.warn(`Aviso ao limpar tabela ${table}:`, error)
          }
        } catch (error) {
          console.warn(`Tabela ${table} pode não existir ou ter estrutura diferente`)
        }
      }
    }

    // Finalmente, excluir o fornecedor
    const { error: deleteError } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId)

    if (deleteError) {
      console.error('Erro ao excluir fornecedor:', deleteError)
      throw deleteError
    }

    console.log('Fornecedor excluído com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: 'deleted',
        message: 'Fornecedor excluído com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na exclusão do fornecedor:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: 'Falha ao excluir fornecedor'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})