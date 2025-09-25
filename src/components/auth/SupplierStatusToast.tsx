import { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export const SupplierStatusToast: React.FC = () => {
  useEffect(() => {
    const handleSupplierDeactivated = (event: CustomEvent) => {
      const { message } = event.detail;
      
      toast.error(message, {
        description: 'Você será redirecionado para a página de login.',
        duration: 5000,
        icon: <AlertTriangle className="h-4 w-4" />
      });
    };

    // Escutar evento de fornecedor desativado
    window.addEventListener('supplierDeactivated', handleSupplierDeactivated as EventListener);

    return () => {
      window.removeEventListener('supplierDeactivated', handleSupplierDeactivated as EventListener);
    };
  }, []);

  return null;
};