import { useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

/**
 * Hook para aplicar automaticamente o branding em componentes
 * Útil para componentes que precisam reagir a mudanças de branding
 */
export const useBrandingApplier = () => {
  const { settings, applyBranding } = useBranding();

  useEffect(() => {
    // Aplicar branding quando o componente monta ou settings mudam
    applyBranding();
  }, [settings, applyBranding]);

  // Helper para aplicar cores personalizadas inline quando necessário
  const getInlineStyles = () => ({
    '--custom-primary': settings.primaryColor,
    '--custom-secondary': settings.secondaryColor,
    '--custom-accent': settings.accentColor,
  } as React.CSSProperties);

  return {
    settings,
    getInlineStyles,
    applyBranding
  };
};