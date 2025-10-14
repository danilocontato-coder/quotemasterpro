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
      {settings.logo && settings.logo.trim() !== '' ? (
        <>
          <img 
            src={settings.logo} 
            alt={settings.companyName || 'Logo'} 
            className="h-8 w-auto object-contain"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.src = '/placeholder.svg';
            }}
          />
        </>
      ) : (
        <div className="h-8 w-16 bg-primary/20 rounded flex items-center justify-center">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
      )}
      
      {showTitle && (
        <span className={titleClassName}>
          {settings.companyName}
        </span>
      )}
    </div>
  );
};