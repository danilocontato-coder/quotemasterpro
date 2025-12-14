import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformCommission {
  percentage: number;
  isPromoMode: boolean;
  isLoading: boolean;
}

/**
 * Hook para buscar a comissão da plataforma configurada no system_settings
 */
export function usePlatformCommission(): PlatformCommission {
  const [percentage, setPercentage] = useState<number>(5.0); // Fallback 5%
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCommission() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'asaas_config')
          .single();

        if (error) {
          console.warn('Erro ao buscar configuração de comissão:', error);
          return;
        }

        const config = data?.setting_value as any;
        if (config?.platform_commission_percentage !== undefined) {
          setPercentage(config.platform_commission_percentage);
        }
      } catch (err) {
        console.error('Erro ao buscar comissão:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommission();
  }, []);

  return {
    percentage,
    isPromoMode: percentage === 0,
    isLoading
  };
}
