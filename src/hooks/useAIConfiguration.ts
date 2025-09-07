import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';

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
  const { client: currentClient } = useSupabaseCurrentClient();
  const sb: any = supabase;

  const fetchSettings = async () => {
    if (!currentClient?.id) return;
    
    setIsLoading(true);
    try {
      // Buscar configurações específicas do cliente
      const { data, error } = await sb
        .from('ai_negotiation_settings')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setSettings(data as AISettings[]);
      } else {
        // Criar configurações padrão para o cliente
        const defaultConfig = {
          enabled: true,
          autoAnalysis: true,
          autoNegotiation: false,
          maxDiscountPercent: 15,
          minNegotiationAmount: 1000,
          aggressiveness: 'moderate'
        };
        
        await updateSettings('general', defaultConfig);
      }
    } catch (error) {
      console.warn('Supabase settings fallback to local/mock:', error);
      // Fallback: localStorage ou mock
      const generalConfig = localStorage.getItem(`ai_config_general_${currentClient?.id}`);
      const mockSettings: AISettings[] = [
        {
          id: '1',
          setting_key: 'general_config',
          setting_value: generalConfig ? JSON.parse(generalConfig) : {
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
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrompts = async () => {
    if (!currentClient?.id) return;
    
    try {
      const { data, error } = await sb
        .from('ai_prompts')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPrompts(data as AIPrompt[]);
    } catch (error) {
      console.warn('Supabase prompts fallback to mock:', error);
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
    }
  };

  const updateSettings = async (category: string, settingValue: any) => {
    if (!currentClient?.id) return;
    
    try {
      const payload = {
        setting_key: `${category}_config`,
        setting_value: settingValue,
        category,
        client_id: currentClient.id,
        active: true,
        description: `Configurações ${category} da IA`
      };

      const { data, error } = await sb
        .from('ai_negotiation_settings')
        .upsert(payload, { onConflict: 'setting_key,client_id' })
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(prev => {
          const filtered = prev.filter(s => s.setting_key !== `${category}_config`);
          return [...filtered, data as AISettings];
        });
        return data as AISettings;
      }

      // fallback local
      localStorage.setItem(`ai_config_${category}_${currentClient.id}`, JSON.stringify(settingValue));
      return {
        id: 'local',
        setting_key: `${category}_config`,
        setting_value: settingValue,
        category,
        active: true,
        description: `Configurações ${category} da IA`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as AISettings;
    } catch (error) {
      console.warn('Supabase updateSettings falhou, usando localStorage:', error);
      localStorage.setItem(`ai_config_${category}_${currentClient?.id}`, JSON.stringify(settingValue));
      const updatedSetting: AISettings = {
        id: 'local',
        setting_key: `${category}_config`,
        setting_value: settingValue,
        category,
        active: true,
        description: `Configurações ${category} da IA`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSettings(prev => {
        const filtered = prev.filter(s => s.setting_key !== `${category}_config`);
        return [...filtered, updatedSetting];
      });
      return updatedSetting;
    }
  };

  const createPrompt = async (promptData: Partial<AIPrompt>) => {
    if (!currentClient?.id) return;
    
    try {
      const { data, error } = await sb
        .from('ai_prompts')
        .insert({
          prompt_type: promptData.prompt_type || 'custom',
          prompt_name: promptData.prompt_name || 'Novo Prompt',
          prompt_content: promptData.prompt_content || '',
          variables: promptData.variables || [],
          client_id: currentClient.id,
          is_default: false,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => [data as AIPrompt, ...prev]);
      return data as AIPrompt;
    } catch (error) {
      console.warn('Supabase createPrompt falhou, usando estado local:', error);
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
    }
  };

  const updatePrompt = async (id: string, promptData: Partial<AIPrompt>) => {
    try {
      const { data, error } = await sb
        .from('ai_prompts')
        .update({
          ...promptData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => prev.map(p => p.id === id ? (data as AIPrompt) : p));
      return data as AIPrompt;
    } catch (error) {
      console.warn('Supabase updatePrompt falhou, atualizando apenas localmente:', error);
      setPrompts(prev => prev.map(p => p.id === id ? {
        ...p,
        ...promptData,
        updated_at: new Date().toISOString()
      } : p));
      return { id, ...promptData } as AIPrompt;
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
      const { error } = await sb
        .from('ai_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.warn('Supabase deletePrompt falhou, removendo localmente:', error);
      setPrompts(prev => prev.filter(p => p.id !== id));
    }
  };

  // Carregar configurações quando o cliente mudar
  useEffect(() => {
    if (currentClient?.id) {
      fetchSettings();
      fetchPrompts();
    }
  }, [currentClient?.id]);

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