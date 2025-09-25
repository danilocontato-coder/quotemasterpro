import { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export const ClientStatusToast: React.FC = () => {
  useEffect(() => {
    const handleClientDeactivated = (event: CustomEvent) => {
      const { message } = event.detail;
      
      toast.error(message, {
        description: 'Você será redirecionado para a página de login.',
        duration: 5000,
        icon: <AlertTriangle className="h-4 w-4" />
      });
    };

    window.addEventListener('client-deactivated', handleClientDeactivated as EventListener);
    
    return () => {
      window.removeEventListener('client-deactivated', handleClientDeactivated as EventListener);
    };
  }, []);

  return null;
};