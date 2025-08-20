import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, Database } from 'lucide-react';

interface SupabaseIntegrationNoticeProps {
  feature?: string;
  className?: string;
}

export function SupabaseIntegrationNotice({ 
  feature = "esta funcionalidade", 
  className = "" 
}: SupabaseIntegrationNoticeProps) {
  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <Database className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium mb-2">Integração com Supabase Necessária</p>
            <p className="text-sm">
              Para usar {feature} com total funcionalidade, conecte seu projeto ao Supabase. 
              Esta integração permitirá armazenamento seguro de chaves API, autenticação e 
              recursos backend avançados.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-4 shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => {
              // This would typically open the Supabase integration modal
              // For now, just show a message
              console.log('Supabase integration clicked');
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Conectar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}