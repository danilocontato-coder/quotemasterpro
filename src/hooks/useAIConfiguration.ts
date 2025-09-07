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
      // Simular dados das configurações da IA
      const mockSettings: AISettings[] = [
        {
          id: '1',
          setting_key: 'general_config',
          setting_value: {
            enabled: true,
            autoAnalysis: true,
            autoNegotiation: false,
            maxDiscountPercent: 15,
            minNegotiationAmount: 1000,
            aggressiveness: 'moderate'
          },
          category: 'general',
          description: 'Configurações gerais da IA',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setSettings(mockSettings);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      setSettings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      // Simular dados dos prompts da IA
      const mockPrompts: AIPrompt[] = [
        {
          id: '1',
          prompt_type: 'analysis',
          prompt_name: 'Análise de Cotações',
          prompt_content: 'Você é um especialista em negociações comerciais. Analise as propostas considerando preço, qualidade, prazo e histórico do fornecedor...',
          variables: ['propostas', 'fornecedores', 'historico'],
          is_default: true,
          active: true,
          created_by: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          prompt_type: 'negotiation',
          prompt_name: 'Negociação Comercial',
          prompt_content: 'Crie uma mensagem de negociação profissional, respeitosa e persuasiva. Use tom colaborativo e enfatize benefícios mútuos...',
          variables: ['valor_original', 'valor_proposto', 'fornecedor'],
          is_default: true,
          active: true,
          created_by: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setPrompts(mockPrompts);
    } catch (error) {
      console.error('Error fetching AI prompts:', error);
      setPrompts([]);
    }
  };

  const updateSettings = async (category: string, settingValue: any) => {
    try {
      // Simular update das configurações
      const updatedSetting: AISettings = {
        id: '1',
        setting_key: `${category}_config`,
        setting_value: settingValue,
        category: category,
        active: true,
        description: `Configurações ${category} da IA`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Atualizar estado local
      setSettings(prev => {
        const filtered = prev.filter(s => s.setting_key !== `${category}_config`);
        return [...filtered, updatedSetting];
      });

      return updatedSetting;
    } catch (error) {
      console.error('Error updating AI settings:', error);
      throw error;
    }
  };

  const createPrompt = async (promptData: Partial<AIPrompt>) => {
    try {
      const newPrompt: AIPrompt = {
        id: Math.random().toString(36).substr(2, 9),
        prompt_type: promptData.prompt_type || 'custom',
        prompt_name: promptData.prompt_name || 'Novo Prompt',
        prompt_content: promptData.prompt_content || '',
        variables: promptData.variables || [],
        is_default: false,
        active: true,
        created_by: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setPrompts(prev => [newPrompt, ...prev]);
      return newPrompt;
    } catch (error) {
      console.error('Error creating AI prompt:', error);
      throw error;
    }
  };

  const updatePrompt = async (id: string, promptData: Partial<AIPrompt>) => {
    try {
      setPrompts(prev => prev.map(p => p.id === id ? {
        ...p,
        ...promptData,
        updated_at: new Date().toISOString()
      } : p));
      
      return promptData;
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