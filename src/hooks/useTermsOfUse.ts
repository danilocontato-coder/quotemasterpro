import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/systemLogger';

interface TermsOfUse {
  title: string;
  content: string;
  version: string;
  last_updated: string;
}

const fetchTermsFromDB = async (): Promise<TermsOfUse> => {
  logger.info('terms', 'Buscando termos de uso');
  
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'terms_of_use')
    .maybeSingle();

  if (error) {
    logger.error('terms', 'Erro ao buscar termos de uso', error);
    throw error;
  }

  if (!data?.setting_value) {
    throw new Error('Termos de uso não encontrados');
  }

  const termsData = data.setting_value as any;
  const terms: TermsOfUse = {
    title: termsData.title || 'Termos de Uso',
    content: termsData.content || '',
    version: termsData.version || '1.0',
    last_updated: termsData.last_updated || new Date().toISOString()
  };
  
  logger.info('terms', 'Termos de uso carregados', { version: terms.version });
  return terms;
};

export const useTermsOfUse = (enabled: boolean = true) => {
  const { data: terms, isLoading, error } = useQuery({
    queryKey: ['terms-of-use'],
    queryFn: fetchTermsFromDB,
    enabled,
    staleTime: 1000 * 60 * 60, // Cache por 1 hora
    gcTime: 1000 * 60 * 60 * 24, // Manter no cache por 24h
    retry: 2,
  });

  return { 
    terms: terms || null, 
    isLoading, 
    error: error?.message || null 
  };
};
