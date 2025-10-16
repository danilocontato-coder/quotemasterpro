import React from 'react';
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
  const { settings, isReady } = useBranding();
  const { settings: systemSettings } = useSystemBranding();

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

  // ✅ Aguardar branding estar pronto
  if (!isReady) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} w-16 bg-muted animate-pulse rounded`}></div>
        {showCompanyName && (
          <div className={`${sizeClasses[size]} w-32 bg-muted animate-pulse rounded`}></div>
        )}
      </div>
    );
  }

  // Se tem logo personalizado
  if (settings?.logo && settings.logo !== '/placeholder.svg') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img 
          src={settings.logo} 
          alt={settings.companyName || 'Logo'} 
          className={`${sizeClasses[size]} object-contain`}
          loading="eager"
          onError={(e) => {
            console.error('❌ BrandedLogo: Erro ao carregar logo');
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
