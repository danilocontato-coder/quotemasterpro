import React from 'react';
import { useBranding } from '@/contexts/BrandingContext';

export const BrandedFooter: React.FC = () => {
  const { settings } = useBranding();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {settings.logo && settings.logo.trim() !== '' && (
              <img 
                src={settings.logo} 
                alt={settings.companyName || 'Logo'} 
                className="h-6 w-auto object-contain"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {settings.companyName}
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground text-center md:text-right">
            {settings.footerText}
          </div>
        </div>
      </div>
    </footer>
  );
};