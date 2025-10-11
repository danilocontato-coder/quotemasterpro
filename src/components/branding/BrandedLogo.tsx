import React from 'react';
import { useBranding } from '@/contexts/BrandingContext';
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
    console.log('🖼️ BrandedLogo: Renderizando logo personalizado:', settings.logo);
    console.log('🖼️ BrandedLogo: Settings completo:', settings);
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img 
          src={settings.logo} 
          alt={settings.companyName || 'Logo'} 
          className={`${sizeClasses[size]} object-contain brightness-0 invert`}
          onError={(e) => {
            console.error('❌ BrandedLogo: Erro ao carregar logo, usando fallback');
            e.currentTarget.style.display = 'none';
          }}
        />
        {showCompanyName && settings.companyName && (
          <span className={`font-semibold text-white ${textSizeClasses[size]}`}>
            {settings.companyName}
          </span>
        )}
      </div>
    );
  }

  // Fallback: Logo padrão
  console.log('⚠️ BrandedLogo: Usando logo padrão (sem branding)');
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className={`${sizeClasses[size]} text-primary`} />
      <span className={`font-bold ${textSizeClasses[size]}`}>
        {settings?.companyName || 'QuoteMaster Pro'}
      </span>
    </div>
  );
}
