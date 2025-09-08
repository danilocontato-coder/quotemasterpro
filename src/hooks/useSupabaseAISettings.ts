import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AISettings {
  id: string;
  negotiation_provider: 'openai' | 'perplexity';
  market_analysis_provider: 'openai' | 'perplexity';
  openai_model: string;
  perplexity_model: string;
  max_discount_percent: number;
  min_negotiation_amount: number;
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  auto_analysis: boolean;
  auto_negotiation: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useSupabaseAISettings() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.warn('AI settings not found in Supabase, creating default');
        // Criar configuração padrão se não existir
        await createDefaultSettings();
      } else {
        setSettings(data as AISettings);
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações de IA',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .insert({
          negotiation_provider: 'openai',
          market_analysis_provider: 'perplexity',
          openai_model: 'gpt-5-2025-08-07',
          perplexity_model: 'llama-3.1-sonar-large-128k-online',
          max_discount_percent: 15,
          min_negotiation_amount: 1000.00,
          aggressiveness: 'moderate',
          auto_analysis: true,
          auto_negotiation: false,
          enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data as AISettings);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateSettings = async (updates: Partial<Omit<AISettings, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data as AISettings);
      toast({
        title: 'Configurações Atualizadas',
        description: 'As configurações de IA foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar configurações de IA',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    refetch: fetchSettings
  };
}