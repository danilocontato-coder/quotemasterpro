import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BrandingSettings {
  companyName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  favicon: string;
  footerText: string;
  loginPageTitle: string;
  loginPageSubtitle: string;
  dashboardWelcomeMessage: string;
  customCss?: string;
}

interface BrandingContextType {
  settings: BrandingSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<BrandingSettings>) => Promise<void>;
  applyBranding: () => void;
  resetToDefaults: () => Promise<void>;
}

const defaultSettings: BrandingSettings = {
  companyName: 'QuoteMaster Pro',
  logo: '/placeholder.svg',
  primaryColor: '#003366',
  secondaryColor: '#F5F5F5',
  accentColor: '#0066CC',
  favicon: '/favicon.ico',
  footerText: '© 2025 QuoteMaster Pro. Todos os direitos reservados.',
  loginPageTitle: 'Bem-vindo ao QuoteMaster Pro',
  loginPageSubtitle: 'Plataforma completa de gestão de cotações',
  dashboardWelcomeMessage: 'Bem-vindo de volta!',
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar configurações do banco
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      console.log('🎨 [BRANDING] Carregando configurações do banco...');
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'company_name', 'company_logo', 'primary_color', 'secondary_color', 
          'accent_color', 'favicon', 'footer_text', 'login_page_title',
          'login_page_subtitle', 'dashboard_welcome_message', 'custom_css'
        ]);

      if (error) {
        console.error('🎨 [BRANDING] Erro ao carregar configurações:', error);
        // Em caso de erro, usar configurações padrão
        console.log('🎨 [BRANDING] Usando configurações padrão devido ao erro');
        setSettings(defaultSettings);
        applyBrandingToDOM(defaultSettings);
        return;
      }

      console.log('🎨 [BRANDING] Dados carregados do banco:', data);

      if (data && data.length > 0) {
        const newSettings = { ...defaultSettings };
        
        data.forEach(item => {
          const value = (item.setting_value as any)?.value || 
                       (item.setting_value as any)?.url || 
                       (item.setting_value as any)?.color || 
                       (item.setting_value as any)?.text || 
                       item.setting_value;

          switch (item.setting_key) {
            case 'company_name':
              newSettings.companyName = value || defaultSettings.companyName;
              break;
            case 'company_logo':
              newSettings.logo = value || defaultSettings.logo;
              break;
            case 'primary_color':
              newSettings.primaryColor = value || defaultSettings.primaryColor;
              break;
            case 'secondary_color':
              newSettings.secondaryColor = value || defaultSettings.secondaryColor;
              break;
            case 'accent_color':
              newSettings.accentColor = value || defaultSettings.accentColor;
              break;
            case 'favicon':
              newSettings.favicon = value || defaultSettings.favicon;
              break;
            case 'footer_text':
              newSettings.footerText = value || defaultSettings.footerText;
              break;
            case 'login_page_title':
              newSettings.loginPageTitle = value || defaultSettings.loginPageTitle;
              break;
            case 'login_page_subtitle':
              newSettings.loginPageSubtitle = value || defaultSettings.loginPageSubtitle;
              break;
            case 'dashboard_welcome_message':
              newSettings.dashboardWelcomeMessage = value || defaultSettings.dashboardWelcomeMessage;
              break;
            case 'custom_css':
              newSettings.customCss = value;
              break;
          }
        });
        
        console.log('🎨 [BRANDING] Configurações processadas:', newSettings);
        setSettings(newSettings);
        applyBrandingToDOM(newSettings);
      } else {
        console.log('🎨 [BRANDING] Nenhuma configuração encontrada, usando padrões');
        setSettings(defaultSettings);
        applyBrandingToDOM(defaultSettings);
      }
    } catch (error) {
      console.error('🎨 [BRANDING] Erro ao carregar configurações:', error);
      // Em caso de erro crítico, usar configurações padrão
      setSettings(defaultSettings);
      applyBrandingToDOM(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Aplicar branding no DOM
  const applyBrandingToDOM = useCallback((brandingSettings: BrandingSettings) => {
    const root = document.documentElement;
    
    // Converter hex para HSL
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Aplicar cores personalizadas
    const primaryHsl = hexToHsl(brandingSettings.primaryColor);
    const secondaryHsl = hexToHsl(brandingSettings.secondaryColor);
    const accentHsl = hexToHsl(brandingSettings.accentColor);

    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--secondary', secondaryHsl);
    root.style.setProperty('--accent', accentHsl);

    // Atualizar título da página
    document.title = brandingSettings.companyName;

    // Atualizar favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon && brandingSettings.favicon !== '/favicon.ico') {
      favicon.href = brandingSettings.favicon;
    }

    // Aplicar CSS customizado
    let customStyleEl = document.getElementById('custom-branding-styles') as HTMLStyleElement;
    if (!customStyleEl) {
      customStyleEl = document.createElement('style');
      customStyleEl.id = 'custom-branding-styles';
      document.head.appendChild(customStyleEl);
    }
    
    if (brandingSettings.customCss) {
      customStyleEl.textContent = brandingSettings.customCss;
    }
  }, []);

  // Atualizar configurações
  const updateSettings = async (newSettings: Partial<BrandingSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      console.log('🎨 [BRANDING] Iniciando atualização das configurações:', newSettings);

      // Salvar no banco
      const updates = Object.entries(newSettings).map(([key, value]) => {
        let settingKey = '';
        let settingValue: any = {};

        switch (key) {
          case 'companyName':
            settingKey = 'company_name';
            settingValue = { value };
            break;
          case 'logo':
            settingKey = 'company_logo';
            settingValue = { url: value };
            break;
          case 'primaryColor':
            settingKey = 'primary_color';
            settingValue = { color: value };
            break;
          case 'secondaryColor':
            settingKey = 'secondary_color';
            settingValue = { color: value };
            break;
          case 'accentColor':
            settingKey = 'accent_color';
            settingValue = { color: value };
            break;
          case 'favicon':
            settingKey = 'favicon';
            settingValue = { url: value };
            break;
          case 'footerText':
            settingKey = 'footer_text';
            settingValue = { text: value };
            break;
          case 'loginPageTitle':
            settingKey = 'login_page_title';
            settingValue = { text: value };
            break;
          case 'loginPageSubtitle':
            settingKey = 'login_page_subtitle';
            settingValue = { text: value };
            break;
          case 'dashboardWelcomeMessage':
            settingKey = 'dashboard_welcome_message';
            settingValue = { text: value };
            break;
          case 'customCss':
            settingKey = 'custom_css';
            settingValue = { text: value };
            break;
        }

        return {
          setting_key: settingKey,
          setting_value: settingValue,
          description: `Configuração de branding: ${key}`
        };
      });

      console.log('🎨 [BRANDING] Enviando updates para o banco:', updates);

      for (const update of updates) {
        console.log(`🎨 [BRANDING] Salvando ${update.setting_key}...`);
        
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) {
          console.error(`🎨 [BRANDING] Erro ao salvar ${update.setting_key}:`, error);
          throw error;
        } else {
          console.log(`🎨 [BRANDING] ✅ ${update.setting_key} salvo com sucesso`);
        }
      }

      // Aplicar imediatamente
      applyBrandingToDOM(updatedSettings);

      console.log('🎨 [BRANDING] ✅ Todas as configurações foram salvas com sucesso!');

      toast({
        title: "Branding atualizado!",
        description: "As configurações foram salvas e aplicadas com sucesso."
      });

    } catch (error: any) {
      console.error('🎨 [BRANDING] ❌ Erro ao atualizar branding:', error);
      
      // Reverter estado local em caso de erro
      setSettings(settings);
      
      let errorMessage = "Não foi possível atualizar as configurações.";
      
      if (error.message?.includes('permission')) {
        errorMessage = "Você não tem permissão para alterar as configurações de branding.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  const applyBranding = () => {
    applyBrandingToDOM(settings);
  };

  const resetToDefaults = async () => {
    try {
      // Deletar todas as configurações de branding
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .in('setting_key', [
          'company_name', 'company_logo', 'primary_color', 'secondary_color',
          'accent_color', 'favicon', 'footer_text', 'login_page_title',
          'login_page_subtitle', 'dashboard_welcome_message', 'custom_css'
        ]);

      if (error) throw error;

      setSettings(defaultSettings);
      applyBrandingToDOM(defaultSettings);

      toast({
        title: "Branding restaurado!",
        description: "Todas as configurações foram restauradas aos valores padrão."
      });

    } catch (error: any) {
      console.error('Erro ao resetar branding:', error);
      toast({
        title: "Erro",
        description: "Não foi possível restaurar as configurações padrão.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <BrandingContext.Provider value={{
      settings,
      isLoading,
      updateSettings,
      applyBranding,
      resetToDefaults
    }}>
      {children}
    </BrandingContext.Provider>
  );
};