import React, { ReactNode, useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

interface BrandedLayoutProps {
  children: ReactNode;
  showLogo?: boolean;
  className?: string;
}

export function BrandedLayout({ 
  children, 
  showLogo = false,
  className = '' 
}: BrandedLayoutProps) {
  const { settings, isLoading } = useBranding();

  useEffect(() => {
    if (settings && !isLoading) {
      console.log('🏢 BrandedLayout: Renderizando com branding personalizado');
      
      // Adicionar classe ao body se necessário
      if (settings.customCss) {
        document.body.classList.add('branded-custom');
      }
    } else {
      console.log('⚠️ BrandedLayout: Usando layout padrão (sem branding)');
      document.body.classList.remove('branded-custom');
    }

    return () => {
      document.body.classList.remove('branded-custom');
    };
  }, [settings, isLoading]);

  return (
    <div className={`branded-layout ${className}`} data-has-branding={!!settings}>
      {children}
    </div>
  );
}
