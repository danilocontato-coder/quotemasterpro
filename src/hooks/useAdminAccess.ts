import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useAdminAccess = () => {
  const [isAccessingAs, setIsAccessingAs] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Acessar como cliente
  const accessAsClient = async (clientId: string, clientName: string) => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem usar esta funcionalidade",
        variant: "destructive"
      });
      return;
    }

    setIsAccessingAs(true);
    
    try {
      // Gerar token temporário para acesso admin
      const adminToken = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Armazenar dados no localStorage para a nova aba
      const adminAccessData = {
        originalRole: 'admin',
        targetClientId: clientId,
        targetClientName: clientName,
        targetRole: 'manager',
        isAdminMode: true,
        adminToken,
        timestamp: Date.now()
      };

      // Usar localStorage para compartilhar com a nova aba
      localStorage.setItem(`adminAccess_${adminToken}`, JSON.stringify(adminAccessData));

      toast({
        title: "Abrindo nova aba",
        description: `Acessando como cliente: ${clientName}`,
        variant: "default"
      });

      // Abrir em nova aba com parâmetro do token
      const newTabUrl = `${window.location.origin}/dashboard?adminToken=${adminToken}`;
      window.open(newTabUrl, '_blank');
      
    } catch (error) {
      console.error('Erro ao acessar como cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar como cliente",
        variant: "destructive"
      });
    } finally {
      setIsAccessingAs(false);
    }
  };

  // Acessar como fornecedor
  const accessAsSupplier = async (supplierId: string, supplierName: string) => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem usar esta funcionalidade",
        variant: "destructive"
      });
      return;
    }

    setIsAccessingAs(true);
    
    try {
      // Gerar token temporário para acesso admin
      const adminToken = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Armazenar dados no localStorage para a nova aba
      const adminAccessData = {
        originalRole: 'admin',
        targetSupplierId: supplierId,
        targetSupplierName: supplierName,
        targetRole: 'supplier',
        isAdminMode: true,
        adminToken,
        timestamp: Date.now()
      };

      // Usar localStorage para compartilhar com a nova aba
      localStorage.setItem(`adminAccess_${adminToken}`, JSON.stringify(adminAccessData));

      toast({
        title: "Abrindo nova aba",
        description: `Acessando como fornecedor: ${supplierName}`,
        variant: "default"
      });

      // Abrir em nova aba com parâmetro do token
      const newTabUrl = `${window.location.origin}/supplier?adminToken=${adminToken}`;
      window.open(newTabUrl, '_blank');
      
    } catch (error) {
      console.error('Erro ao acessar como fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar como fornecedor",
        variant: "destructive"
      });
    } finally {
      setIsAccessingAs(false);
    }
  };

  // Voltar ao modo admin (não usado mais, pois fechamos a aba)
  const returnToAdmin = async () => {
    setIsAccessingAs(true);
    
    try {
      // Limpar dados de acesso admin
      const urlParams = new URLSearchParams(window.location.search);
      const adminToken = urlParams.get('adminToken');
      
      if (adminToken) {
        localStorage.removeItem(`adminAccess_${adminToken}`);
        sessionStorage.removeItem(`adminAccess_${adminToken}`);
      }

      toast({
        title: "Sessão encerrada",
        description: "Fechando aba de simulação",
        variant: "default"
      });
      
      // Fechar aba
      window.close();
      
    } catch (error) {
      console.error('Erro ao encerrar sessão admin:', error);
      toast({
        title: "Erro",
        description: "Não foi possível encerrar a sessão",
        variant: "destructive"
      });
    } finally {
      setIsAccessingAs(false);
    }
  };

  // Verificar se estamos em modo admin (apenas para simulação de super admin)
  const isInAdminMode = () => {
    try {
      // APENAS verificar se há token admin na URL (removendo localStorage para evitar mostrar para clientes reais)
      const urlParams = new URLSearchParams(window.location.search);
      const adminToken = urlParams.get('adminToken');
      
      if (adminToken && adminToken.startsWith('admin_')) {
        let adminData = sessionStorage.getItem(`adminAccess_${adminToken}`);
        if (!adminData) {
          adminData = localStorage.getItem(`adminAccess_${adminToken}`);
        }
        
        if (adminData) {
          const parsedData = JSON.parse(adminData);
          // Verificar se é realmente uma simulação de admin (tem originalRole admin)
          return parsedData.isAdminMode && parsedData.originalRole === 'admin';
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  // Obter dados do acesso admin
  const getAdminAccessData = () => {
    try {
      // APENAS verificar URL (removendo localStorage para evitar dados de clientes reais)
      const urlParams = new URLSearchParams(window.location.search);
      const adminToken = urlParams.get('adminToken');
      
      if (adminToken && adminToken.startsWith('admin_')) {
        let adminData = sessionStorage.getItem(`adminAccess_${adminToken}`);
        if (!adminData) {
          adminData = localStorage.getItem(`adminAccess_${adminToken}`);
        }
        
        if (adminData) {
          const parsedData = JSON.parse(adminData);
          // Só retornar se for realmente uma simulação de admin
          if (parsedData.isAdminMode && parsedData.originalRole === 'admin') {
            return parsedData;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  return {
    accessAsClient,
    accessAsSupplier,
    returnToAdmin,
    isAccessingAs,
    isInAdminMode: isInAdminMode(),
    getAdminAccessData
  };
};