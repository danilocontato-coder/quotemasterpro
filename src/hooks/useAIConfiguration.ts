import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AISettings {
  id: string;
  setting_key: string;
  setting_value: any;
  category: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AIPrompt {
  id: string;
  prompt_type: string;
  prompt_name: string;
  prompt_content: string;
  variables?: any[];
  is_default: boolean;
  active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export function useAIConfiguration() {
  const [settings, setSettings] = useState<AISettings[]>([]);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_negotiation_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      setSettings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching AI prompts:', error);
      setPrompts([]);
    }
  };

  const updateSettings = async (category: string, settingValue: any) => {
    try {
      const { data, error } = await supabase
        .from('ai_negotiation_settings')
        .upsert({
          setting_key: `${category}_config`,
          setting_value: settingValue,
          category: category,
          active: true,
          description: `Configurações ${category} da IA`
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      setSettings(prev => {
        const filtered = prev.filter(s => s.setting_key !== `${category}_config`);
        return [...filtered, data];
      });

      return data;
    } catch (error) {
      console.error('Error updating AI settings:', error);
      throw error;
    }
  };

  const createPrompt = async (promptData: Partial<AIPrompt>) => {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .insert({
          prompt_type: promptData.prompt_type || 'custom',
          prompt_name: promptData.prompt_name || 'Novo Prompt',
          prompt_content: promptData.prompt_content || '',
          variables: promptData.variables || [],
          is_default: false,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating AI prompt:', error);
      throw error;
    }
  };

  const updatePrompt = async (id: string, promptData: Partial<AIPrompt>) => {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .update(promptData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (error) {
      console.error('Error updating AI prompt:', error);
      throw error;
    }
  };

  const addTrainingData = async (trainingExample: any) => {
    try {
      // Esta funcionalidade será implementada quando a tabela de treinamento estiver pronta
      console.log('Training data will be added:', trainingExample);
      toast({
        title: 'Em desenvolvimento',
        description: 'Funcionalidade de treinamento será implementada em breve.',
      });
    } catch (error) {
      console.error('Error adding training data:', error);
      throw error;
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting AI prompt:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPrompts();
  }, []);

  return {
    settings,
    prompts,
    trainingData,
    isLoading,
    updateSettings,
    createPrompt,
    updatePrompt,
    deletePrompt,
    addTrainingData,
    refetch: () => {
      fetchSettings();
      fetchPrompts();
    }
  };
}