export interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  config: {
    api_key_configured: boolean;
    platform_commission_percentage: number;
    auto_release_days: number;
    split_enabled: boolean;
    environment: 'sandbox' | 'production';
  };
}

export async function getAsaasConfig(supabaseClient: any): Promise<AsaasConfig> {
  // Buscar configuração do ambiente
  const { data: configData } = await supabaseClient
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'asaas_config')
    .single();

  // Buscar chave da API
  const { data: keyData } = await supabaseClient
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'asaas_api_key')
    .single();

  const environment = (configData?.setting_value?.environment as 'sandbox' | 'production') || 'sandbox';
  const apiKey = keyData?.setting_value?.encrypted_key;

  if (!apiKey) {
    throw new Error('ASAAS_API_KEY não configurada');
  }

  // Definir URL base de acordo com o ambiente
  const baseUrl = environment === 'production' 
    ? 'https://api.asaas.com/v3' 
    : 'https://sandbox.asaas.com/api/v3';

  return {
    apiKey,
    environment,
    baseUrl,
    config: configData?.setting_value || {
      api_key_configured: false,
      platform_commission_percentage: 5.0,
      auto_release_days: 7,
      split_enabled: true,
      environment: 'sandbox'
    }
  };
}
