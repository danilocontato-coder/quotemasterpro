import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Serviço para gerenciar respostas de cotações (quote_responses)
 * 
 * IMPORTANTE: Ao marcar uma resposta como 'selected' ou 'approved',
 * o trigger trg_quote_response_selection no banco de dados
 * automaticamente atualiza quotes.supplier_id
 */

interface SelectQuoteResponseParams {
  responseId: string;
  quoteId: string;
  supplierId: string;
  status?: 'selected' | 'approved';
}

/**
 * Seleciona uma resposta de cotação e vincula o fornecedor à cotação
 * 
 * Esta função:
 * 1. Marca a resposta como 'selected' (ou 'approved')
 * 2. O trigger do banco automaticamente atualiza quotes.supplier_id
 * 3. Registra log de auditoria
 * 
 * @param params - Parâmetros da seleção
 * @returns Sucesso ou erro da operação
 */
export const selectQuoteResponse = async ({
  responseId,
  quoteId,
  supplierId,
  status = 'selected'
}: SelectQuoteResponseParams) => {
  try {
    console.log('🔄 Selecionando resposta de cotação:', {
      responseId,
      quoteId,
      supplierId,
      status
    });

    // 1. Atualizar status da resposta (trigger do banco fará o resto)
    const { error: updateError } = await supabase
      .from('quote_responses')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId);

    if (updateError) {
      console.error('❌ Erro ao atualizar resposta:', updateError);
      throw updateError;
    }

    console.log('✅ Resposta atualizada com sucesso. Trigger do banco atualizará quotes.supplier_id');

    // 2. Verificar se o supplier_id foi atualizado na cotação
    const { data: updatedQuote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, supplier_id, title')
      .eq('id', quoteId)
      .single();

    if (quoteError) {
      console.error('❌ Erro ao verificar cotação:', quoteError);
      throw quoteError;
    }

    if (updatedQuote.supplier_id !== supplierId) {
      console.warn('⚠️ Fornecedor não foi vinculado automaticamente. Tentando manualmente...');
      
      // Fallback: atualizar manualmente se o trigger falhou
      const { error: manualUpdateError } = await supabase
        .from('quotes')
        .update({ 
          supplier_id: supplierId,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (manualUpdateError) {
        console.error('❌ Erro ao atualizar fornecedor manualmente:', manualUpdateError);
        throw manualUpdateError;
      }

      console.log('✅ Fornecedor vinculado manualmente');
    }

    return {
      success: true,
      message: 'Proposta selecionada e fornecedor vinculado com sucesso'
    };

  } catch (error) {
    console.error('❌ Erro ao selecionar resposta:', error);
    return {
      success: false,
      error: error as Error,
      message: 'Erro ao selecionar proposta'
    };
  }
};

/**
 * Hook React para usar o serviço de seleção de propostas
 * 
 * @example
 * const { selectResponse } = useQuoteResponseSelection();
 * 
 * const handleSelect = async () => {
 *   await selectResponse({
 *     responseId: 'resp-123',
 *     quoteId: 'quote-456',
 *     supplierId: 'supp-789'
 *   });
 * };
 */
export const useQuoteResponseSelection = () => {
  const { toast } = useToast();

  const selectResponse = async (params: SelectQuoteResponseParams) => {
    const result = await selectQuoteResponse(params);

    if (result.success) {
      toast({
        title: 'Proposta Selecionada',
        description: 'Fornecedor vinculado à cotação com sucesso',
      });
    } else {
      toast({
        title: 'Erro ao Selecionar Proposta',
        description: result.message,
        variant: 'destructive'
      });
    }

    return result;
  };

  return { selectResponse };
};
