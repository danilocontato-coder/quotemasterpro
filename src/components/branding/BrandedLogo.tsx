import React, { useRef, useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { useSystemBranding } from '@/hooks/useSystemBranding';
import { Building2 } from 'lucide-react';

interface BrandedLogoProps {
  variant?: 'header' | 'sidebar' | 'footer';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  showCompanyName?: boolean;
  className?: string;
}

export function BrandedLogo({ 
  variant = 'header', 
  size = 'md', 
  showCompanyName = false,
  className = ''
}: BrandedLogoProps) {
  const { settings } = useBranding();
  const { settings: systemSettings } = useSystemBranding();
  const lastLoggedLogo = useRef<string | null>(null);

  // ⚡ OTIMIZAÇÃO: Só logar quando o logo realmente mudar
  useEffect(() => {
    if (settings.logo && settings.logo !== lastLoggedLogo.current) {
      console.log('🖼️ BrandedLogo: Logo atualizado para:', settings.logo);
      lastLoggedLogo.current = settings.logo;
    }
  }, [settings.logo]);

  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-32',
    xxl: 'h-48'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
    xxl: 'text-5xl'
  };

  // Se tem logo personalizado
  if (settings?.logo && settings.logo !== '/placeholder.svg') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img 
          src={settings.logo} 
          alt={settings.companyName || 'Logo'} 
          className={`${sizeClasses[size]} object-contain`}
          loading="lazy"
          onError={(e) => {
            console.error('❌ BrandedLogo: Erro ao carregar logo, usando placeholder');
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        {showCompanyName && settings.companyName && (
          <span className={`font-semibold ${textSizeClasses[size]}`}>
            {settings.companyName}
          </span>
        )}
      </div>
    );
  }

  // Fallback: Logo padrão
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className={`${sizeClasses[size]} text-primary`} />
      <span className={`font-bold ${textSizeClasses[size]}`}>
        {settings?.companyName || systemSettings.platformName}
      </span>
    </div>
  );
}
