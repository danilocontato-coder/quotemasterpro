import React from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { Building2 } from 'lucide-react';

interface BrandedHeaderProps {
  className?: string;
  showTitle?: boolean;
  titleClassName?: string;
}

export const BrandedHeader: React.FC<BrandedHeaderProps> = ({ 
  className = '', 
  showTitle = true,
  titleClassName = 'text-lg font-bold'
}) => {
  const { settings } = useBranding();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {settings.logo && settings.logo.trim() !== '' && settings.logo !== '/placeholder.svg' ? (
        <img 
          src={`${settings.logo}?t=${Date.now()}`}
          alt={settings.companyName || 'Logo'} 
          className="h-8 w-auto object-contain"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Building2 className="h-8 w-8 text-primary" />
      )}
      
      {showTitle && settings.companyName && (
        <span className={titleClassName}>
          {settings.companyName}
        </span>
      )}
    </div>
  );
};