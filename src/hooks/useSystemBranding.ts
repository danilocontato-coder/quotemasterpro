import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemBrandingSettings {
  platformName: string;
  baseUrl: string;
  companyName: string;
  supportEmail: string;
}

/**
 * Hook para obter configurações de branding do sistema
 * NUNCA usar valores hardcoded como "QuoteMaster Pro" - sempre usar este hook
 */
export const useSystemBranding = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['platform_name', 'base_url', 'company_name', 'support_email']);
      
      if (error) {
        console.error('❌ Error fetching system branding:', error);
        throw error;
      }

      const getValue = (key: string, fallback: string) => {
        const setting = data?.find(s => s.setting_key === key);
        if (setting?.setting_value) {
          // Handle both string and object formats
          if (typeof setting.setting_value === 'string') {
            return setting.setting_value.replace(/"/g, '');
          }
          // If it's an object with a value property
          if (typeof setting.setting_value === 'object' && setting.setting_value !== null && 'value' in setting.setting_value) {
            return String((setting.setting_value as any).value || fallback);
          }
        }
        return fallback;
      };

      const brandingSettings: SystemBrandingSettings = {
        platformName: getValue('platform_name', 'Cotiz'),
        baseUrl: getValue('base_url', window.location.origin),
        companyName: getValue('company_name', 'Cotiz'),
        supportEmail: getValue('support_email', 'suporte@cotiz.com.br')
      };

      return brandingSettings;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    refetchOnWindowFocus: false
  });

  return {
    settings: settings || {
      platformName: 'Cotiz',
      baseUrl: window.location.origin,
      companyName: 'Cotiz',
      supportEmail: 'suporte@cotiz.com.br'
    },
    isLoading
  };
};
