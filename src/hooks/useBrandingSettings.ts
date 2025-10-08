import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingSettings {
  id?: string;
  clientId?: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  faviconUrl?: string;
  customCss?: string;
}

interface UseBrandingSettingsReturn {
  branding: BrandingSettings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para buscar configurações de branding do cliente atual
 * Implementa herança: condomínios vinculados herdam branding da administradora
 */
export function useBrandingSettings(clientId?: string): UseBrandingSettingsReturn {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = async () => {
    try {
      console.log('🔍 useBrandingSettings: Iniciando busca de branding');
      setIsLoading(true);
      setError(null);

      // Se não tiver clientId, buscar do usuário atual
      let targetClientId = clientId;
      
      if (!targetClientId) {
        console.log('🔍 useBrandingSettings: Buscando client_id do usuário atual');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('⚠️ useBrandingSettings: Usuário não autenticado');
          setBranding(null);
          setIsLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.client_id) {
          console.log('⚠️ useBrandingSettings: Client_id não encontrado no perfil');
          setBranding(null);
          setIsLoading(false);
          return;
        }

        targetClientId = profile.client_id;
      }

      console.log('🔍 useBrandingSettings: Buscando branding para client_id:', targetClientId);

      // Buscar informações do cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, client_type, parent_client_id, branding_settings_id')
        .eq('id', targetClientId)
        .single();

      if (clientError) {
        console.error('❌ useBrandingSettings: Erro ao buscar cliente:', clientError);
        setError('Erro ao buscar informações do cliente');
        setBranding(null);
        setIsLoading(false);
        return;
      }

      console.log('✅ useBrandingSettings: Cliente encontrado:', {
        id: client.id,
        type: client.client_type,
        hasParent: !!client.parent_client_id,
        hasBranding: !!client.branding_settings_id
      });

      // Determinar qual branding_settings_id usar
      let brandingSettingsId = client.branding_settings_id;

      // Se for condomínio vinculado e não tiver branding próprio, herdar da administradora
      if (client.client_type === 'condominio_vinculado' && !brandingSettingsId && client.parent_client_id) {
        console.log('🔗 useBrandingSettings: Condomínio vinculado sem branding, buscando da administradora:', client.parent_client_id);
        
        const { data: parentClient, error: parentError } = await supabase
          .from('clients')
          .select('branding_settings_id, name')
          .eq('id', client.parent_client_id)
          .single();

        if (!parentError && parentClient?.branding_settings_id) {
          brandingSettingsId = parentClient.branding_settings_id;
          console.log('✅ useBrandingSettings: Herdando branding da administradora:', parentClient.name);
        }
      }

      // Se não há branding_settings_id, retornar branding padrão
      if (!brandingSettingsId) {
        console.log('⚠️ useBrandingSettings: Nenhum branding configurado, usando padrão');
        setBranding({
          companyName: client.name,
          logoUrl: undefined,
          primaryColor: '#003366',
          secondaryColor: '#F5F5F5',
          accentColor: '#0066CC',
          faviconUrl: undefined,
          customCss: undefined
        });
        setIsLoading(false);
        return;
      }

      // Buscar configurações de branding
      console.log('🔍 useBrandingSettings: Buscando branding_settings com ID:', brandingSettingsId);
      
      const { data: brandingData, error: brandingError } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('id', brandingSettingsId)
        .single();

      if (brandingError) {
        console.error('❌ useBrandingSettings: Erro ao buscar branding_settings:', brandingError);
        setError('Erro ao carregar configurações de branding');
        setBranding(null);
        setIsLoading(false);
        return;
      }

      const loadedBranding: BrandingSettings = {
        id: brandingData.id,
        clientId: brandingData.client_id,
        companyName: brandingData.company_name || client.name,
        logoUrl: brandingData.logo_url,
        primaryColor: brandingData.primary_color || '#003366',
        secondaryColor: brandingData.secondary_color || '#F5F5F5',
        accentColor: brandingData.accent_color || '#0066CC',
        faviconUrl: brandingData.favicon_url,
        customCss: brandingData.custom_css
      };

      console.log('✅ useBrandingSettings: Branding carregado com sucesso:', {
        hasLogo: !!loadedBranding.logoUrl,
        hasFavicon: !!loadedBranding.faviconUrl,
        hasCustomCss: !!loadedBranding.customCss,
        colors: {
          primary: loadedBranding.primaryColor,
          secondary: loadedBranding.secondaryColor,
          accent: loadedBranding.accentColor
        }
      });

      setBranding(loadedBranding);
      setIsLoading(false);

    } catch (err) {
      console.error('❌ useBrandingSettings: Erro inesperado:', err);
      setError('Erro ao carregar branding');
      setBranding(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, [clientId]);

  return {
    branding,
    isLoading,
    error,
    refetch: fetchBranding
  };
}
