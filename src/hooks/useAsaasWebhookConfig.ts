import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AsaasWebhookConfig {
  enabled: boolean;
  webhook_url: string;
  auth_token?: string;
  notification_email?: string;
  max_auto_approve_amount: number;
  validate_pix_key: boolean;
}

export function useAsaasWebhookConfig() {
  const [config, setConfig] = useState<AsaasWebhookConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'asaas_webhook_config')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data.setting_value as any as AsaasWebhookConfig);
      } else {
        // Valores padrão
        setConfig({
          enabled: false,
          webhook_url: `https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/approve-transfer-webhook`,
          max_auto_approve_amount: 50000.0,
          validate_pix_key: true,
        });
      }
    } catch (error) {
      console.error('Error fetching webhook config:', error);
      toast.error('Erro ao carregar configurações do webhook');
    }
  };

  const updateConfig = async (newConfig: AsaasWebhookConfig) => {
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'asaas_webhook_config')
        .single();

      if (existing?.id) {
        await supabase
          .from('system_settings')
          .update({ 
            setting_value: newConfig as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('system_settings')
          .insert([{ 
            setting_key: 'asaas_webhook_config', 
            setting_value: newConfig as any,
            description: 'Configurações do webhook de autorização de transferências do Asaas'
          }]);
      }

      setConfig(newConfig);
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Error updating webhook config:', error);
      toast.error('Erro ao salvar configurações');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-transfer-webhook', {
        body: { action: 'test' }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Webhook testado com sucesso!');
        return { success: true };
      } else {
        throw new Error(data.error || 'Falha no teste do webhook');
      }
    } catch (error: any) {
      console.error('Error testing webhook:', error);
      const errorMsg = error.message || "Não foi possível testar o webhook.";
      toast.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const generateToken = () => {
    return crypto.randomUUID();
  };

  return {
    config,
    updateConfig,
    testWebhook,
    generateToken,
    isLoading
  };
}
