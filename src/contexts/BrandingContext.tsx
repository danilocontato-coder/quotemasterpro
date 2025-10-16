import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  isReady: boolean; // Indica que o branding foi carregado e está pronto
  updateSettings: (newSettings: Partial<BrandingSettings>) => Promise<void>;
  applyBranding: () => void;
  resetToDefaults: () => Promise<void>;
  reloadSettings: () => void;
}

const defaultSettings: BrandingSettings = {
  companyName: '',
  logo: '',
  primaryColor: '#003366',
  secondaryColor: '#F5F5F5',
  accentColor: '#0066CC',
  favicon: '',
  footerText: '',
  loginPageTitle: '',
  loginPageSubtitle: '',
  dashboardWelcomeMessage: '',
  customCss: '',
};

// ⚡ OTIMIZAÇÃO: Cache de branding no localStorage
const BRANDING_CACHE_KEY = 'quoteMaster_branding_cache';

const saveBrandingCache = (settings: BrandingSettings) => {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('⚠️ [BRANDING] Não foi possível salvar cache de branding');
  }
};

const loadBrandingCache = (): BrandingSettings | null => {
  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    return null;
  }
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
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();
  const isLoadingRef = useRef(false);

  // ⚡ CARREGAR CONFIGURAÇÕES DO BANCO (sem forçar padrão)
  useEffect(() => {
    // ✅ PREVENIR carregamento duplicado
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    const startTime = performance.now();
    
    // 🧹 LIMPEZA: Remover cache antigo/corrompido
    localStorage.removeItem('quoteMaster_branding_cache');
    
    console.log('🎨 [BRANDING] Iniciando carregamento...');
    
    // Carregar configurações reais (SEM aplicar padrão antes)
    loadSettings().then(() => {
      const loadTime = performance.now() - startTime;
      console.log(`⚡ [BRANDING] Branding carregado em ${loadTime.toFixed(2)}ms`);
      isLoadingRef.current = false;
    }).catch((error) => {
      console.error('❌ [BRANDING] Erro ao carregar:', error);
      applyBrandingToDOM(defaultSettings);
      isLoadingRef.current = false;
    });
  }, []);

  // Carregar configurações baseado no usuário atual
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🎨 [BRANDING] Carregando configurações de branding...');

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Função auxiliar para carregar configurações globais
      const loadGlobalSettings = async () => {
        console.log('🎨 [BRANDING] Tentando carregar via Edge Function pública (public-branding)');
        try {
          // ⚡ OTIMIZAÇÃO: Adicionar timeout de 2s para não travar
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 2000)
          );
          
          const fnPromise = supabase.functions.invoke('public-branding');
          const { data: fnData, error: fnError } = await Promise.race([fnPromise, timeoutPromise]) as any;
          
          if (!fnError && fnData?.success && fnData?.data) {
            const d = fnData.data as any;
            const globalSettings = {
              companyName: d.companyName || defaultSettings.companyName,
              logo: d.logo || defaultSettings.logo,
              primaryColor: d.primaryColor || defaultSettings.primaryColor,
              secondaryColor: d.secondaryColor || defaultSettings.secondaryColor,
              accentColor: d.accentColor || defaultSettings.accentColor,
              favicon: d.favicon || defaultSettings.favicon,
              footerText: d.footerText || defaultSettings.footerText,
              loginPageTitle: d.loginPageTitle || defaultSettings.loginPageTitle,
              loginPageSubtitle: d.loginPageSubtitle || defaultSettings.loginPageSubtitle,
              dashboardWelcomeMessage: d.dashboardWelcomeMessage || defaultSettings.dashboardWelcomeMessage,
              customCss: d.customCss || undefined,
            } as BrandingSettings;
            console.log('🎨 [BRANDING] Global settings via function:', globalSettings);
            console.log('🎨 [BRANDING] Favicon carregado:', globalSettings.favicon);
            return globalSettings;
          }
          console.warn('🎨 [BRANDING] Edge function falhou ou retornou vazio, caindo para consulta direta...', fnError);
        } catch (err) {
          console.warn('🎨 [BRANDING] Erro ao chamar edge function, caindo para consulta direta...', err);
        }

        console.log('🎨 [BRANDING] Carregando configurações globais do system_settings...');
        const { data: systemData, error } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'company_name', 'company_logo', 'primary_color', 'secondary_color', 
            'accent_color', 'favicon', 'footer_text', 'login_page_title',
            'login_page_subtitle', 'dashboard_welcome_message', 'custom_css'
          ]);

        if (error) {
          console.error('🎨 [BRANDING] Erro ao carregar system_settings:', error);
          return null;
        }

        if (systemData && systemData.length > 0) {
          console.log('🎨 [BRANDING] Dados encontrados no system_settings:', systemData);
          const globalSettings = { ...defaultSettings };
          
          systemData.forEach(item => {
            const settingValue = item.setting_value as any;
            const value = settingValue?.value || 
                         settingValue?.url || 
                         settingValue?.color || 
                         settingValue?.text || 
                         settingValue;

            console.log('🎨 [BRANDING] Processando:', item.setting_key, '- Raw:', settingValue, '- Extracted:', value);

            switch (item.setting_key) {
              case 'company_name':
                if (value && value.trim()) {
                  globalSettings.companyName = value.trim();
                  console.log('🎨 [BRANDING] ✅ Company name definido como:', value.trim());
                } else {
                  console.log('🎨 [BRANDING] ⚠️ Company name vazio, usando padrão');
                }
                break;
              case 'company_logo':
                // Garantir que o logo seja uma string válida
                if (typeof value === 'string' && value.trim() && value !== '/placeholder.svg') {
                  globalSettings.logo = value.trim();
                  console.log('🖼️ [BRANDING] ✅ Logo carregado:', value.trim());
                } else if (typeof settingValue === 'object' && settingValue.url) {
                  globalSettings.logo = settingValue.url;
                  console.log('🖼️ [BRANDING] ✅ Logo extraído do objeto:', settingValue.url);
                } else {
                  globalSettings.logo = defaultSettings.logo;
                  console.log('🖼️ [BRANDING] ⚠️ Logo inválido, usando padrão');
                }
                break;
              case 'primary_color':
                globalSettings.primaryColor = value || defaultSettings.primaryColor;
                break;
              case 'secondary_color':
                globalSettings.secondaryColor = value || defaultSettings.secondaryColor;
                break;
              case 'accent_color':
                globalSettings.accentColor = value || defaultSettings.accentColor;
                break;
              case 'favicon':
                globalSettings.favicon = value || defaultSettings.favicon;
                break;
              case 'footer_text':
                globalSettings.footerText = value || defaultSettings.footerText;
                break;
              case 'login_page_title':
                globalSettings.loginPageTitle = value || defaultSettings.loginPageTitle;
                break;
              case 'login_page_subtitle':
                globalSettings.loginPageSubtitle = value || defaultSettings.loginPageSubtitle;
                break;
              case 'dashboard_welcome_message':
                globalSettings.dashboardWelcomeMessage = value || defaultSettings.dashboardWelcomeMessage;
                break;
              case 'custom_css':
                globalSettings.customCss = value;
                break;
            }
          });
          
          console.log('🎨 [BRANDING] Configurações globais processadas:', globalSettings);
          return globalSettings as BrandingSettings;
        }
        return null;
      };

      // Sempre tentar carregar configurações globais primeiro
      const globalSettings = await loadGlobalSettings();
      
      if (globalSettings) {
        console.log('✅ [BRANDING] Configurações globais encontradas:', globalSettings);
      } else {
        console.warn('⚠️ [BRANDING] Nenhuma configuração global encontrada no banco!');
      }
      
      if (!user) {
        console.log('🎨 [BRANDING] Usuário não autenticado, aplicando configurações globais');
        if (globalSettings) {
          const finalGlobal = { ...globalSettings, logo: globalSettings.logo || settings.logo || defaultSettings.logo };
          console.log('🎨 [BRANDING] Aplicando configurações globais para usuário não autenticado:', finalGlobal);
          setSettings(finalGlobal);
          applyBrandingToDOM(finalGlobal);
        } else {
          console.log('🎨 [BRANDING] Nenhuma configuração global encontrada, usando padrão');
          setSettings(defaultSettings);
          applyBrandingToDOM(defaultSettings);
        }
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

      console.log('🎨 [BRANDING] Perfil do usuário:', profile);

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

      // Se não encontrou configurações específicas, usar configurações globais
      if (!brandingSettings) {
        brandingSettings = globalSettings;
        console.log('🎨 [BRANDING] Usando configurações globais para usuário logado:', brandingSettings);
      }

      // Aplicar configurações encontradas ou usar padrão
      if (brandingSettings) {
        const newSettings = {
          companyName: brandingSettings.company_name || brandingSettings.companyName || defaultSettings.companyName,
          logo: (brandingSettings.logo_url && brandingSettings.logo_url.trim() !== '' && brandingSettings.logo_url !== '/placeholder.svg'
            ? brandingSettings.logo_url
            : (brandingSettings.logo && brandingSettings.logo.trim() !== '' && brandingSettings.logo !== '/placeholder.svg'
              ? brandingSettings.logo
              : (settings.logo || defaultSettings.logo))),
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
        console.log('🎨 [BRANDING] ✅ Configurações finais aplicadas:', newSettings);
        setSettings(newSettings);
        applyBrandingToDOM(newSettings);
        // saveBrandingCache(newSettings); // ⚠️ DESABILITADO: Cache temporariamente desativado
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
      setIsReady(true); // Marca como pronto mesmo em caso de erro (usa padrão)
    }
  }, []);

  // Função pública para recarregar configurações
  const reloadSettings = useCallback(() => {
    console.log('🎨 [BRANDING] Recarregamento manual solicitado');
    loadSettings();
  }, [loadSettings]);

  // Aplicar branding no DOM
  const applyBrandingToDOM = useCallback((brandingSettings: BrandingSettings) => {
    console.log('🎨 [BRANDING] Aplicando branding no DOM:', brandingSettings);
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
    console.log('🎨 [BRANDING] Título da página atualizado para:', brandingSettings.companyName);

    // Atualizar favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon && brandingSettings.favicon) {
      console.log('🎨 [BRANDING] Atualizando favicon para:', brandingSettings.favicon);
      favicon.href = brandingSettings.favicon;
      // Forçar recarga do favicon adicionando timestamp
      const newFavicon = favicon.cloneNode(true) as HTMLLinkElement;
      newFavicon.href = `${brandingSettings.favicon}?t=${Date.now()}`;
      document.head.removeChild(favicon);
      document.head.appendChild(newFavicon);
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
      // saveBrandingCache(updatedSettings); // ⚠️ DESABILITADO: Cache temporariamente desativado
      
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
    console.log('🎨 [BRANDING] Provider montado, carregando configurações...');
    
    // Carregar settings rapidamente sem delay
    const loadQuickly = async () => {
      try {
        await loadSettings();
      } catch (error) {
        console.warn('🎨 [BRANDING] Falha no carregamento rápido, usando padrões');
      }
    };
    
    loadQuickly();
  }, []); // Remove dependency on loadSettings to prevent infinite reloads

  // Escutar eventos de atualização de branding
  useEffect(() => {
    const handleBrandingUpdate = () => {
      console.log('🎨 [BRANDING] Evento de atualização de branding recebido');
      loadSettings(); // Recarregar configurações quando há atualizações
    };

    window.addEventListener('branding-updated', handleBrandingUpdate);

    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate);
    };
  }, []); // Sem dependências para evitar recriação

  return (
    <BrandingContext.Provider value={{
      settings,
      isLoading,
      isReady,
      updateSettings,
      applyBranding,
      resetToDefaults,
      reloadSettings
    }}>
      {children}
    </BrandingContext.Provider>
  );
};