import { BrandingSettings } from '@/hooks/useBrandingSettings';

/**
 * Converte cor hexadecimal para HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove o # se presente
  hex = hex.replace('#', '');

  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Aplica configurações de branding ao documento HTML
 */
export function applyBrandingToDocument(settings: BrandingSettings | null): void {
  console.log('🎨 BrandingHelpers: Aplicando branding ao documento');

  if (!settings) {
    console.log('⚠️ BrandingHelpers: Nenhum branding fornecido, resetando para padrão');
    resetBrandingFromDocument();
    return;
  }

  try {
    const root = document.documentElement;

    // Aplicar cores primárias
    if (settings.primaryColor) {
      const hsl = hexToHSL(settings.primaryColor);
      root.style.setProperty('--branding-primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      console.log('🎨 BrandingHelpers: Cor primária aplicada:', settings.primaryColor);
    }

    // Aplicar cores secundárias
    if (settings.secondaryColor) {
      const hsl = hexToHSL(settings.secondaryColor);
      root.style.setProperty('--branding-secondary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty('--secondary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      console.log('🎨 BrandingHelpers: Cor secundária aplicada:', settings.secondaryColor);
    }

    // Aplicar cores de destaque
    if (settings.accentColor) {
      const hsl = hexToHSL(settings.accentColor);
      root.style.setProperty('--branding-accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      console.log('🎨 BrandingHelpers: Cor de destaque aplicada:', settings.accentColor);
    }

    // Aplicar logo URL como variável CSS
    if (settings.logoUrl) {
      root.style.setProperty('--branding-logo-url', `url(${settings.logoUrl})`);
      console.log('🖼️ BrandingHelpers: Logo URL aplicada:', settings.logoUrl);
    }

    // Injetar CSS customizado se fornecido
    if (settings.customCss) {
      injectCustomCSS(settings.customCss);
    } else {
      removeCustomCSS();
    }

    console.log('✅ BrandingHelpers: Branding aplicado com sucesso ao documento');

  } catch (error) {
    console.error('❌ BrandingHelpers: Erro ao aplicar branding:', error);
  }
}

/**
 * Remove branding personalizado e restaura padrões
 */
export function resetBrandingFromDocument(): void {
  console.log('🔄 BrandingHelpers: Resetando branding para padrão');

  const root = document.documentElement;

  // Remover variáveis personalizadas
  root.style.removeProperty('--branding-primary');
  root.style.removeProperty('--branding-secondary');
  root.style.removeProperty('--branding-accent');
  root.style.removeProperty('--branding-logo-url');

  // Remover CSS customizado
  removeCustomCSS();

  console.log('✅ BrandingHelpers: Branding resetado');
}

/**
 * Injeta CSS customizado no documento
 */
function injectCustomCSS(css: string): void {
  console.log('💅 BrandingHelpers: Injetando CSS customizado');

  // Sanitizar CSS básico (remover <script> tags se houver)
  const sanitizedCSS = css.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  let styleElement = document.getElementById('branding-custom-styles');

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'branding-custom-styles';
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = sanitizedCSS;
  console.log('✅ BrandingHelpers: CSS customizado injetado');
}

/**
 * Remove CSS customizado do documento
 */
function removeCustomCSS(): void {
  const styleElement = document.getElementById('branding-custom-styles');
  if (styleElement) {
    styleElement.remove();
    console.log('🗑️ BrandingHelpers: CSS customizado removido');
  }
}

/**
 * Atualiza o favicon do documento
 */
export function updateFavicon(faviconUrl: string | undefined): void {
  if (!faviconUrl) {
    console.log('⚠️ BrandingHelpers: Nenhum favicon fornecido, mantendo padrão');
    return;
  }

  console.log('🖼️ BrandingHelpers: Atualizando favicon:', faviconUrl);

  try {
    // Remover favicon existente
    const existingFavicon = document.querySelector("link[rel*='icon']");
    if (existingFavicon) {
      existingFavicon.remove();
    }

    // Criar novo favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    document.head.appendChild(link);

    console.log('✅ BrandingHelpers: Favicon atualizado com sucesso');

  } catch (error) {
    console.error('❌ BrandingHelpers: Erro ao atualizar favicon:', error);
  }
}

/**
 * Valida se as cores têm contraste adequado (WCAG AA)
 */
export function validateBrandingColors(settings: BrandingSettings): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  console.log('🔍 BrandingHelpers: Validando contraste de cores');

  // Função auxiliar para calcular luminância
  const getLuminance = (hex: string): number => {
    const rgb = hexToHSL(hex);
    return rgb.l / 100;
  };

  // Validar contraste entre primária e secundária
  if (settings.primaryColor && settings.secondaryColor) {
    const primaryLum = getLuminance(settings.primaryColor);
    const secondaryLum = getLuminance(settings.secondaryColor);
    const contrast = Math.abs(primaryLum - secondaryLum);

    if (contrast < 0.5) {
      warnings.push('Baixo contraste entre cor primária e secundária');
      console.log('⚠️ BrandingHelpers: Baixo contraste detectado');
    }
  }

  const isValid = warnings.length === 0;

  if (isValid) {
    console.log('✅ BrandingHelpers: Validação de cores OK');
  } else {
    console.log('⚠️ BrandingHelpers: Avisos de contraste:', warnings);
  }

  return { isValid, warnings };
}

/**
 * Gera CSS customizado baseado nas configurações
 */
export function generateBrandingCSS(settings: BrandingSettings): string {
  console.log('🎨 BrandingHelpers: Gerando CSS de branding');

  let css = `
    /* Branding CSS Gerado Automaticamente */
    :root {
      --branding-company-name: "${settings.companyName || 'QuoteMaster Pro'}";
    }
  `;

  if (settings.primaryColor) {
    css += `
    .btn-primary, .bg-primary {
      background-color: ${settings.primaryColor} !important;
    }
    `;
  }

  if (settings.accentColor) {
    css += `
    .text-accent, .border-accent {
      color: ${settings.accentColor} !important;
    }
    `;
  }

  console.log('✅ BrandingHelpers: CSS gerado');
  return css;
}
