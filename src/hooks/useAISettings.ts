import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AISettings {
  id: string;
  negotiation_provider: string;
  market_analysis_provider: string;
  openai_model: string;
  perplexity_model: string;
  max_discount_percent: number;
  min_negotiation_amount: number;
  aggressiveness: string;
  auto_analysis: boolean;
  auto_negotiation: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) {
        console.log('Using default AI settings');
        // Usar configurações padrão
        setSettings({
          id: 'default',
          negotiation_provider: 'openai',
          market_analysis_provider: 'perplexity',
          openai_model: 'gpt-5-2025-08-07',
          perplexity_model: 'llama-3.1-sonar-large-128k-online',
          max_discount_percent: 15,
          min_negotiation_amount: 1000,
          aggressiveness: 'moderate',
          auto_analysis: true,
          auto_negotiation: false,
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return;
      }
      
      setSettings(data);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateSettings = useCallback(async (updates: Partial<AISettings>) => {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        // Atualizar configuração existente
        const { error: updateError } = await supabase
          .from('ai_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova configuração
        const { error: insertError } = await supabase
          .from('ai_settings')
          .insert({
            negotiation_provider: 'openai',
            market_analysis_provider: 'perplexity',
            openai_model: 'gpt-5-2025-08-07',
            perplexity_model: 'llama-3.1-sonar-large-128k-online',
            max_discount_percent: 15,
            min_negotiation_amount: 1000,
            aggressiveness: 'moderate',
            auto_analysis: true,
            auto_negotiation: false,
            enabled: true,
            ...updates
          });

        if (insertError) throw insertError;
      }

      await fetchSettings();
      
      toast({
        title: "Sucesso",
        description: "Configurações de IA atualizadas com sucesso",
      });

    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações de IA",
        variant: "destructive",
      });
    }
  }, [fetchSettings, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    updateSettings,
    refetch: fetchSettings
  };
}