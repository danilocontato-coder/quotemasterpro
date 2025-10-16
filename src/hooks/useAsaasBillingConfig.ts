import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BillingConfig {
  auto_issue_nfse: boolean;
  issue_nfse_with_invoice: boolean;
  nfse_municipal_service_code: string;
  nfse_municipal_service_id: string;
  nfse_service_description: string;
  nfse_default_observations: string;
  asaas_billing_type: string;
  billing_day: number;
  auto_billing_enabled: boolean;
  auto_suspend_enabled: boolean;
  days_before_suspension: number;
}

export function useAsaasBillingConfig() {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          auto_issue_nfse: data.auto_issue_nfse ?? false,
          issue_nfse_with_invoice: data.issue_nfse_with_invoice ?? true,
          nfse_municipal_service_code: data.nfse_municipal_service_code ?? '',
          nfse_municipal_service_id: data.nfse_municipal_service_id ?? '01.01',
          nfse_service_description: data.nfse_service_description ?? 'Serviços de gestão de cotações e fornecedores',
          nfse_default_observations: data.nfse_default_observations ?? '',
          asaas_billing_type: data.asaas_billing_type ?? 'BOLETO',
          billing_day: data.billing_day ?? 10,
          auto_billing_enabled: data.auto_billing_enabled ?? true,
          auto_suspend_enabled: data.auto_suspend_enabled ?? true,
          days_before_suspension: data.days_before_suspension ?? 7
        });
      } else {
        // Valores padrão
        setConfig({
          auto_issue_nfse: false,
          issue_nfse_with_invoice: true,
          nfse_municipal_service_code: '',
          nfse_municipal_service_id: '01.01',
          nfse_service_description: 'Serviços de gestão de cotações e fornecedores',
          nfse_default_observations: '',
          asaas_billing_type: 'BOLETO',
          billing_day: 10,
          auto_billing_enabled: true,
          auto_suspend_enabled: true,
          days_before_suspension: 7
        });
      }
    } catch (error) {
      console.error('Error fetching billing config:', error);
      toast.error('Erro ao carregar configurações de faturamento');
    }
  };

  const updateConfig = async (newConfig: BillingConfig) => {
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('financial_settings')
        .select('id')
        .single();

      if (existing?.id) {
        const { error } = await supabase
          .from('financial_settings')
          .update({
            auto_issue_nfse: newConfig.auto_issue_nfse,
            issue_nfse_with_invoice: newConfig.issue_nfse_with_invoice,
            nfse_municipal_service_code: newConfig.nfse_municipal_service_code,
            nfse_municipal_service_id: newConfig.nfse_municipal_service_id,
            nfse_service_description: newConfig.nfse_service_description,
            nfse_default_observations: newConfig.nfse_default_observations,
            asaas_billing_type: newConfig.asaas_billing_type,
            billing_day: newConfig.billing_day,
            auto_billing_enabled: newConfig.auto_billing_enabled,
            auto_suspend_enabled: newConfig.auto_suspend_enabled,
            days_before_suspension: newConfig.days_before_suspension,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('financial_settings')
          .insert([{
            auto_issue_nfse: newConfig.auto_issue_nfse,
            issue_nfse_with_invoice: newConfig.issue_nfse_with_invoice,
            nfse_municipal_service_code: newConfig.nfse_municipal_service_code,
            nfse_municipal_service_id: newConfig.nfse_municipal_service_id,
            nfse_service_description: newConfig.nfse_service_description,
            nfse_default_observations: newConfig.nfse_default_observations,
            asaas_billing_type: newConfig.asaas_billing_type,
            billing_day: newConfig.billing_day,
            auto_billing_enabled: newConfig.auto_billing_enabled,
            auto_suspend_enabled: newConfig.auto_suspend_enabled,
            days_before_suspension: newConfig.days_before_suspension
          }]);

        if (error) throw error;
      }

      setConfig(newConfig);
      await fetchConfig();
    } catch (error) {
      console.error('Error updating billing config:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    config,
    updateConfig,
    isLoading,
    refetch: fetchConfig
  };
}
