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
      // Armazenar no localStorage que é modo admin
      localStorage.setItem('adminAccessMode', JSON.stringify({
        originalRole: 'admin',
        targetClientId: clientId,
        targetRole: 'manager',
        isAdminMode: true
      }));

      toast({
        title: "Redirecionando",
        description: `Acessando como cliente: ${clientName}`,
        variant: "default"
      });

      // Redirecionar para dashboard do cliente
      navigate('/dashboard');
      
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
      // Armazenar no localStorage que é modo admin
      localStorage.setItem('adminAccessMode', JSON.stringify({
        originalRole: 'admin',
        targetSupplierId: supplierId,
        targetRole: 'supplier',
        isAdminMode: true
      }));

      toast({
        title: "Redirecionando",
        description: `Acessando como fornecedor: ${supplierName}`,
        variant: "default"
      });

      // Redirecionar para dashboard do fornecedor
      navigate('/supplier');
      
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
      const adminMode = localStorage.getItem('adminAccessMode');
      return adminMode ? JSON.parse(adminMode).isAdminMode : false;
    } catch {
      return false;
    }
  };

  return {
    accessAsClient,
    accessAsSupplier,
    returnToAdmin,
    isAccessingAs,
    isInAdminMode: isInAdminMode()
  };
};