import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AsaasConfig {
  api_key_configured: boolean;
  platform_commission_percentage: number;
  auto_release_days: number;
  split_enabled: boolean;
  environment?: 'sandbox' | 'production';
}

interface AsaasSettings {
  asaas_config: AsaasConfig;
}

export function useAsaasIntegration() {
  const [settings, setSettings] = useState<AsaasSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'asaas_config')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const value = data.setting_value as any;
        setSettings({ asaas_config: {
          api_key_configured: value?.api_key_configured ?? false,
          platform_commission_percentage: value?.platform_commission_percentage ?? 5.0,
          auto_release_days: value?.auto_release_days ?? 7,
          split_enabled: value?.split_enabled ?? true,
          environment: value?.environment ?? 'sandbox'
        }});
      } else {
        // Valores padrão
        setSettings({
          asaas_config: {
            api_key_configured: false,
            platform_commission_percentage: 5.0,
            auto_release_days: 7,
            split_enabled: true,
            environment: 'sandbox'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching Asaas settings:', error);
      toast.error('Erro ao carregar configurações do Asaas');
    }
  };

  const updateSettings = async ({ asaas_api_key, asaas_config }: { asaas_api_key?: string; asaas_config?: AsaasConfig }) => {
    setIsLoading(true);
    try {
      // Se tiver chave da API, salvar como secret via Edge Function
      if (asaas_api_key) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Não autenticado');
        }

        // Chamar Edge Function para salvar a chave de forma segura
        const { error: secretError } = await supabase.functions.invoke('save-asaas-key', {
          body: { apiKey: asaas_api_key }
        });

        if (secretError) {
          throw secretError;
        }
      }

      // Atualizar ou criar configuração no system_settings
      if (asaas_config) {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('setting_key', 'asaas_config')
          .single();

        if (existing?.id) {
          await supabase
            .from('system_settings')
            .update({ 
              setting_value: asaas_config as any,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('system_settings')
            .insert([{ 
              setting_key: 'asaas_config', 
              setting_value: asaas_config as any,
              description: 'Configurações de integração com Asaas (pagamentos, escrow e split)'
            }]);
        }

        setSettings({ asaas_config });
      }
    } catch (error) {
      console.error('Error updating Asaas settings:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (): Promise<{ success: boolean }> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-asaas-connection');
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(
          `Conexão bem-sucedida! Ambiente: ${data.environment || 'desconhecido'}. Saldo: R$ ${data.balance?.toFixed(2) || '0.00'}`
        );
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to test connection');
      }
    } catch (error: any) {
      console.error('Error testing Asaas connection:', error);
      const errorMsg = error.message || "Não foi possível conectar com o Asaas.";
      toast.error(
        errorMsg.includes('Ambiente:') 
          ? errorMsg 
          : `${errorMsg} Verifique se a chave de API corresponde ao ambiente selecionado.`
      );
      return { success: false };
    }
  };

  return {
    settings,
    updateSettings,
    testConnection,
    isLoading
  };
}
