import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/systemLogger';

interface TermsOfUse {
  title: string;
  content: string;
  version: string;
  last_updated: string;
}

export const useTermsOfUse = () => {
  const [terms, setTerms] = useState<TermsOfUse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        logger.info('terms', 'Buscando termos de uso');

        const { data, error: fetchError } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'terms_of_use')
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (data?.setting_value) {
          const termsData = data.setting_value as any;
          setTerms({
            title: termsData.title || 'Termos de Uso',
            content: termsData.content || '',
            version: termsData.version || '1.0',
            last_updated: termsData.last_updated || new Date().toISOString()
          });
          logger.info('terms', 'Termos de uso carregados', { version: termsData.version });
        } else {
          throw new Error('Termos de uso não encontrados');
        }
      } catch (err: any) {
        logger.error('terms', 'Erro ao buscar termos de uso', err);
        setError(err.message || 'Erro ao carregar termos de uso');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, []);

  return { terms, isLoading, error };
};
