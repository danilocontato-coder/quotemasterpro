import { supabase } from '@/integrations/supabase/client';

export const CREDIT_COSTS = {
  AI_CHAT_MESSAGE: 2,
  PDF_EXTRACTION: 20,
  INDIVIDUAL_ANALYSIS: 15,
  COMPARATIVE_ANALYSIS: 25,
  NEGOTIATION_ANALYSIS: 10,
  ACTIVE_NEGOTIATION: 30,
} as const;

export const administradoraAICreditsService = {
  async checkCredits(clientId: string, required: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ai_credits')
        .select('available_credits')
        .eq('client_id', clientId)
        .single();

      if (error) throw error;
      return (data?.available_credits || 0) >= required;
    } catch (error) {
      console.error('Error checking credits:', error);
      return false;
    }
  },

  async getCredits(clientId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting credits:', error);
      return null;
    }
  },

  async debitCredits(
    clientId: string,
    amount: number,
    reason: string,
    referenceId?: string
  ): Promise<boolean> {
    try {
      // Call RPC to debit credits
      const { error: rpcError } = await supabase.rpc('debit_ai_credits', {
        p_client_id: clientId,
        p_amount: amount,
      });

      if (rpcError) throw rpcError;

      // Log transaction
      const { error: logError } = await supabase
        .from('ai_credit_transactions')
        .insert({
          client_id: clientId,
          amount: -amount,
          reason,
          reference_id: referenceId,
        });

      if (logError) console.error('Error logging transaction:', logError);

      return true;
    } catch (error) {
      console.error('Error debiting credits:', error);
      return false;
    }
  },

  async getTransactions(clientId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('ai_credit_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },
};
