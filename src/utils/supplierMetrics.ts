import { supabase } from '@/integrations/supabase/client';

/**
 * Calcula score de pontualidade (0-100) baseado no histórico de avaliações
 * @param supplierId - UUID do fornecedor
 * @returns Score normalizado (0-100), ou 50 se sem histórico
 */
export const calculateDeliveryScore = async (supplierId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('supplier_ratings')
      .select('delivery_rating')
      .eq('supplier_id', supplierId);
    
    if (error || !data || data.length === 0) {
      return 50; // Score neutro para fornecedores novos
    }
    
    // Calcular média das avaliações (escala 1-5)
    const avgRating = data.reduce((sum, r) => sum + (r.delivery_rating || 3), 0) / data.length;
    
    // Normalizar de 1-5 para 0-100
    // 1 estrela = 0%, 3 estrelas = 50%, 5 estrelas = 100%
    return Math.round(((avgRating - 1) / 4) * 100);
  } catch (error) {
    console.error('Error calculating delivery score:', error);
    return 50; // Retornar score neutro em caso de erro
  }
};
