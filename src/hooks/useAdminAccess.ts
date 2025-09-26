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

  // Voltar ao modo admin
  const returnToAdmin = async () => {
    setIsAccessingAs(true);
    
    try {
      // Remover modo admin do localStorage
      localStorage.removeItem('adminAccessMode');

      toast({
        title: "Modo admin restaurado",
        description: "Você voltou ao painel de administração",
        variant: "default"
      });
      
      // Redirecionar para admin dashboard
      navigate('/admin/superadmin');
      
    } catch (error) {
      console.error('Erro ao voltar ao modo admin:', error);
      toast({
        title: "Erro",
        description: "Não foi possível retornar ao modo admin",
        variant: "destructive"
      });
    } finally {
      setIsAccessingAs(false);
    }
  };

  // Verificar se estamos em modo admin
  const isInAdminMode = () => {
    try {
      // Verificar localStorage (método antigo)
      const adminMode = localStorage.getItem('adminAccessMode');
      if (adminMode && JSON.parse(adminMode).isAdminMode) {
        return true;
      }

      // Verificar se há token admin na URL
      const urlParams = new URLSearchParams(window.location.search);
      const adminToken = urlParams.get('adminToken');
      if (adminToken) {
        let adminData = sessionStorage.getItem(`adminAccess_${adminToken}`);
        if (!adminData) {
          adminData = localStorage.getItem(`adminAccess_${adminToken}`);
        }
        return adminData ? JSON.parse(adminData).isAdminMode : false;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Obter dados do acesso admin
  const getAdminAccessData = () => {
    try {
      // Verificar URL primeiro
      const urlParams = new URLSearchParams(window.location.search);
      const adminToken = urlParams.get('adminToken');
      if (adminToken) {
        let adminData = sessionStorage.getItem(`adminAccess_${adminToken}`);
        if (!adminData) {
          adminData = localStorage.getItem(`adminAccess_${adminToken}`);
        }
        if (adminData) {
          return JSON.parse(adminData);
        }
      }

      // Fallback para localStorage (método antigo)
      const adminMode = localStorage.getItem('adminAccessMode');
      return adminMode ? JSON.parse(adminMode) : null;
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