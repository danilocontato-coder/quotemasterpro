import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook que sincroniza o tema do next-themes com as preferências do usuário no banco
 * Aplica automaticamente o tema quando o usuário faz login ou quando as preferências mudam
 */
export function useThemeSync() {
  const { user } = useAuth();
  const { settings, isLoading } = useSupabaseSettings();
  const { setTheme } = useTheme();

  useEffect(() => {
    // Só aplicar tema se houver usuário autenticado
    if (!user) return;
    
    // Só aplicar tema se as configurações estiverem carregadas e houver um tema definido
    if (!isLoading && settings?.preferences?.theme) {
      const savedTheme = settings.preferences.theme;
      console.log('🎨 Sincronizando tema:', savedTheme);
      setTheme(savedTheme);
    }
  }, [settings?.preferences?.theme, isLoading, setTheme, user]);
}
