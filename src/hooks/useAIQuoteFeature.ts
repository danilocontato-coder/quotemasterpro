import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAIQuoteFeature = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkFeatureStatus();
  }, []);

  const checkFeatureStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_quote_generation_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking AI quote feature status:', error);
        return;
      }

      if (data?.setting_value) {
        const settingValue = data.setting_value;
        let enabled = false;
        
        if (typeof settingValue === 'boolean') {
          enabled = settingValue;
        } else if (typeof settingValue === 'string') {
          enabled = settingValue === 'true';
        } else if (settingValue && typeof settingValue === 'object' && 'value' in settingValue) {
          enabled = settingValue.value === true || settingValue.value === 'true';
        }
        
        setIsEnabled(enabled);
      }
    } catch (error) {
      console.error('Error checking AI quote feature:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEnabled,
    isLoading,
    refetch: checkFeatureStatus
  };
};