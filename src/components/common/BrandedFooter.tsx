import React from 'react';
import { useBranding } from '@/contexts/BrandingContext';

export const BrandedFooter: React.FC = () => {
  const { settings } = useBranding();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {settings.logo !== '/placeholder.svg' && (
              <img 
                src={settings.logo} 
                alt={settings.companyName} 
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
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