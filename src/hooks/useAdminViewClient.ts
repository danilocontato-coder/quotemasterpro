import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from './usePermissions';

/**
 * Hook seguro para admins visualizarem dados de clientes
 * SEM impersonation - sempre mantém identidade de admin
 * 
 * SEGURANÇA:
 * - Não usa localStorage para tokens
 * - Não troca identidade do usuário
 * - Admin sempre permanece admin
 * - Apenas adiciona parâmetro na URL para filtrar dados
 */
export const useAdminViewClient = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const viewClientData = (clientId: string, clientName: string) => {
    // Verificar permissão via hook seguro
    if (!hasPermission('admin.access')) {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores podem visualizar dados de clientes",
        variant: "destructive"
      });
      return;
    }

    // Admin vê dados via query parameter
    // Nunca muda sua identidade
    const url = new URL(window.location.origin + '/dashboard');
    url.searchParams.set('viewAsClient', clientId);
    url.searchParams.set('adminView', 'true');
    url.searchParams.set('clientName', clientName);

    toast({
      title: "Abrindo visualização",
      description: `Visualizando dados de: ${clientName}`,
    });

    window.open(url.toString(), '_blank');
  };

  const viewSupplierData = (supplierId: string, supplierName: string) => {
    // Verificar permissão via hook seguro
    if (!hasPermission('admin.access')) {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores podem visualizar dados de fornecedores",
        variant: "destructive"
      });
      return;
    }

    // Admin vê dados via query parameter
    const url = new URL(window.location.origin + '/supplier');
    url.searchParams.set('viewAsSupplier', supplierId);
    url.searchParams.set('adminView', 'true');
    url.searchParams.set('supplierName', supplierName);

    toast({
      title: "Abrindo visualização",
      description: `Visualizando dados de: ${supplierName}`,
    });

    window.open(url.toString(), '_blank');
  };

  return { 
    viewClientData,
    viewSupplierData,
  };
};
