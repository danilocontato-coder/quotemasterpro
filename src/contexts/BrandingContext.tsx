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

  // Carregar configurações baseado no usuário atual
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🎨 [BRANDING] Carregando configurações de branding...');

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🎨 [BRANDING] Usuário não autenticado, usando configurações padrão');
        setSettings(defaultSettings);
        applyBrandingToDOM(defaultSettings);
        return;
      }

      // Buscar perfil do usuário para identificar client_id ou supplier_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        console.log('🎨 [BRANDING] Perfil não encontrado, usando configurações padrão');
        setSettings(defaultSettings);
        applyBrandingToDOM(defaultSettings);
        return;
      }

      let brandingSettings = null;

      // Se é um cliente, buscar branding do cliente
      if (profile.client_id) {
        const { data } = await supabase
          .from('branding_settings')
          .select('*')
          .eq('client_id', profile.client_id)
          .single();
        brandingSettings = data;
        console.log('🎨 [BRANDING] Configurações do cliente:', brandingSettings);
      }
      
      // Se é um fornecedor, buscar branding do fornecedor
      else if (profile.supplier_id) {
        const { data } = await supabase
          .from('branding_settings')
          .select('*')
          .eq('supplier_id', profile.supplier_id)
          .single();
        brandingSettings = data;
        console.log('🎨 [BRANDING] Configurações do fornecedor:', brandingSettings);
      }

      // Se não encontrou configurações específicas, buscar configurações globais (admin)
      if (!brandingSettings && profile.role === 'admin') {
        const { data: systemData } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'company_name', 'company_logo', 'primary_color', 'secondary_color', 
            'accent_color', 'favicon', 'footer_text', 'login_page_title',
            'login_page_subtitle', 'dashboard_welcome_message', 'custom_css'
          ]);

        if (systemData && systemData.length > 0) {
          brandingSettings = { ...defaultSettings };
          
          systemData.forEach(item => {
            const value = (item.setting_value as any)?.value || 
                         (item.setting_value as any)?.url || 
                         (item.setting_value as any)?.color || 
                         (item.setting_value as any)?.text || 
                         item.setting_value;

            switch (item.setting_key) {
              case 'company_name':
                brandingSettings.companyName = value || defaultSettings.companyName;
                break;
              case 'company_logo':
                brandingSettings.logo = value || defaultSettings.logo;
                break;
              case 'primary_color':
                brandingSettings.primaryColor = value || defaultSettings.primaryColor;
                break;
              case 'secondary_color':
                brandingSettings.secondaryColor = value || defaultSettings.secondaryColor;
                break;
              case 'accent_color':
                brandingSettings.accentColor = value || defaultSettings.accentColor;
                break;
              case 'favicon':
                brandingSettings.favicon = value || defaultSettings.favicon;
                break;
              case 'footer_text':
                brandingSettings.footerText = value || defaultSettings.footerText;
                break;
              case 'login_page_title':
                brandingSettings.loginPageTitle = value || defaultSettings.loginPageTitle;
                break;
              case 'login_page_subtitle':
                brandingSettings.loginPageSubtitle = value || defaultSettings.loginPageSubtitle;
                break;
              case 'dashboard_welcome_message':
                brandingSettings.dashboardWelcomeMessage = value || defaultSettings.dashboardWelcomeMessage;
                break;
              case 'custom_css':
                brandingSettings.customCss = value;
                break;
            }
          });
          console.log('🎨 [BRANDING] Configurações globais (admin):', brandingSettings);
        }
      }

      // Aplicar configurações encontradas ou usar padrão
      if (brandingSettings) {
        const newSettings = {
          companyName: brandingSettings.company_name || brandingSettings.companyName || defaultSettings.companyName,
          logo: brandingSettings.logo_url || brandingSettings.logo || defaultSettings.logo,
          primaryColor: brandingSettings.primary_color || brandingSettings.primaryColor || defaultSettings.primaryColor,
          secondaryColor: brandingSettings.secondary_color || brandingSettings.secondaryColor || defaultSettings.secondaryColor,
          accentColor: brandingSettings.accent_color || brandingSettings.accentColor || defaultSettings.accentColor,
          favicon: brandingSettings.favicon_url || brandingSettings.favicon || defaultSettings.favicon,
          footerText: brandingSettings.footer_text || brandingSettings.footerText || defaultSettings.footerText,
          loginPageTitle: brandingSettings.login_page_title || brandingSettings.loginPageTitle || defaultSettings.loginPageTitle,
          loginPageSubtitle: brandingSettings.loginPageSubtitle || defaultSettings.loginPageSubtitle,
          dashboardWelcomeMessage: brandingSettings.dashboardWelcomeMessage || defaultSettings.dashboardWelcomeMessage,
          customCss: brandingSettings.custom_css || brandingSettings.customCss || defaultSettings.customCss,
        };
        setSettings(newSettings);
        applyBrandingToDOM(newSettings);
        console.log('🎨 [BRANDING] Configurações aplicadas:', newSettings);
      } else {
        console.log('🎨 [BRANDING] Nenhuma configuração encontrada, usando padrão');
        setSettings(defaultSettings);
        applyBrandingToDOM(defaultSettings);
      }

    } catch (error) {
      console.error('🎨 [BRANDING] Erro ao carregar configurações:', error);
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
      console.log('🎨 [BRANDING] Atualizando configurações:', newSettings);

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar perfil do usuário para identificar client_id ou supplier_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('Perfil não encontrado');
      }

      const updatedSettings = { ...settings, ...newSettings };

      // Preparar dados para inserir/atualizar
      const brandingData = {
        company_name: updatedSettings.companyName,
        logo_url: updatedSettings.logo,
        primary_color: updatedSettings.primaryColor,
        secondary_color: updatedSettings.secondaryColor,
        accent_color: updatedSettings.accentColor,
        favicon_url: updatedSettings.favicon,
        footer_text: updatedSettings.footerText,
        login_page_title: updatedSettings.loginPageTitle,
        custom_css: updatedSettings.customCss,
      };

      let error = null;

      // Se é um cliente, atualizar branding do cliente
      if (profile.client_id) {
        const { error: upsertError } = await supabase
          .from('branding_settings')
          .upsert({
            ...brandingData,
            client_id: profile.client_id,
          });
        error = upsertError;
      }
      
      // Se é um fornecedor, atualizar branding do fornecedor
      else if (profile.supplier_id) {
        const { error: upsertError } = await supabase
          .from('branding_settings')
          .upsert({
            ...brandingData,
            supplier_id: profile.supplier_id,
          });
        error = upsertError;
      }
      
      // Se é admin, atualizar configurações globais (compatibilidade com sistema antigo)
      else if (profile.role === 'admin') {
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

        for (const update of updates) {
          const { error: systemError } = await supabase
            .from('system_settings')
            .upsert(update, { onConflict: 'setting_key' });

          if (systemError) {
            error = systemError;
            break;
          }
        }
      }

      if (error) {
        throw error;
      }

      // Atualizar estado local
      setSettings(updatedSettings);
      
      // Aplicar branding imediatamente
      applyBrandingToDOM(updatedSettings);
      
      toast({
        title: "Branding atualizado!",
        description: "As configurações foram salvas e aplicadas com sucesso."
      });

      console.log('🎨 [BRANDING] Configurações atualizadas com sucesso');

    } catch (error: any) {
      console.error('🎨 [BRANDING] Erro ao atualizar:', error);
      
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
      console.log('🎨 [BRANDING] Resetando configurações para padrão');

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar perfil do usuário para identificar client_id ou supplier_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, supplier_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('Perfil não encontrado');
      }

      let error = null;

      // Se é um cliente, deletar branding do cliente
      if (profile.client_id) {
        const { error: deleteError } = await supabase
          .from('branding_settings')
          .delete()
          .eq('client_id', profile.client_id);
        error = deleteError;
      }
      
      // Se é um fornecedor, deletar branding do fornecedor
      else if (profile.supplier_id) {
        const { error: deleteError } = await supabase
          .from('branding_settings')
          .delete()
          .eq('supplier_id', profile.supplier_id);
        error = deleteError;
      }
      
      // Se é admin, deletar configurações globais
      else if (profile.role === 'admin') {
        const { error: deleteError } = await supabase
          .from('system_settings')
          .delete()
          .in('setting_key', [
            'company_name', 'company_logo', 'primary_color', 'secondary_color',
            'accent_color', 'favicon', 'footer_text', 'login_page_title',
            'login_page_subtitle', 'dashboard_welcome_message', 'custom_css'
          ]);
        error = deleteError;
      }

      if (error) {
        throw error;
      }

      // Resetar para configurações padrão
      setSettings(defaultSettings);
      applyBrandingToDOM(defaultSettings);
      
      toast({
        title: "Branding restaurado!",
        description: "Todas as configurações foram restauradas aos valores padrão."
      });

      console.log('🎨 [BRANDING] Configurações resetadas com sucesso');

    } catch (error: any) {
      console.error('🎨 [BRANDING] Erro ao resetar:', error);
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