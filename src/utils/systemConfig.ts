import { supabase } from '@/integrations/supabase/client';

/**
 * Busca a URL base configurada no sistema
 * Fallback para o domínio atual se não encontrar configuração
 */
export const getBaseUrl = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'base_url')
      .single();

    if (!error && data?.setting_value) {
      // Remover aspas do JSON se necessário
      const value = typeof data.setting_value === 'string' 
        ? data.setting_value.replace(/"/g, '') 
        : String(data.setting_value || '').replace(/"/g, '');
      
      if (value) {
        return value;
      }
    }
  } catch (error) {
    console.warn('Erro ao buscar URL base das configurações:', error);
  }
  
  // Fallback para URL atual
  return window.location.origin;
};

/**
 * Cache para evitar múltiplas consultas desnecessárias
 */
let cachedBaseUrl: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Versão com cache da função getBaseUrl
 */
export const getCachedBaseUrl = async (): Promise<string> => {
  const now = Date.now();
  
  // Se há cache válido, retorna
  if (cachedBaseUrl && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedBaseUrl;
  }
  
  // Busca nova URL e atualiza cache
  const baseUrl = await getBaseUrl();
  cachedBaseUrl = baseUrl;
  cacheTimestamp = now;
  
  return baseUrl;
};

/**
 * Limpa o cache da URL base
 */
export const clearBaseUrlCache = () => {
  cachedBaseUrl = null;
  cacheTimestamp = 0;
};