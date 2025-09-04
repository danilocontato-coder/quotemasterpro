import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Account {
  id: string;
  name: string;
  email: string;
  type: 'client' | 'supplier' | 'support' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  plan: string;
  createdAt: string;
  lastAccess?: string;
  revenue?: number;
  quotesCount?: number;
  rating?: number;
  companyName?: string;
  cnpj?: string;
  phone?: string;
}

export function useSupabaseAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const { toast } = useToast();

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      // Buscar clientes
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          status,
          subscription_plan_id,
          created_at,
          last_access,
          company_name,
          cnpj,
          phone
        `);

      if (clientsError) throw clientsError;

      // Buscar fornecedores
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          email,
          status,
          subscription_plan_id,
          created_at,
          rating,
          completed_orders,
          cnpj,
          phone
        `);

      if (suppliersError) throw suppliersError;

      // Buscar usuários (profiles para admins e suporte)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role,
          active,
          created_at,
          company_name
        `)
        .in('role', ['admin', 'support']);

      if (profilesError) throw profilesError;

      // Buscar planos de assinatura
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, display_name');

      if (plansError) throw plansError;

      // Criar mapa de planos
      const plansMap = plans?.reduce((acc, plan) => {
        acc[plan.id] = plan.display_name;
        return acc;
      }, {} as Record<string, string>) || {};

      // Transformar dados dos clientes
      const clientAccounts: Account[] = (clients || []).map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        type: 'client' as const,
        status: client.status === 'active' ? 'active' : 'inactive',
        plan: plansMap[client.subscription_plan_id] || 'Sem Plano',
        createdAt: new Date(client.created_at).toLocaleDateString('pt-BR'),
        lastAccess: client.last_access ? formatLastAccess(client.last_access) : undefined,
        companyName: client.company_name,
        cnpj: client.cnpj,
        phone: client.phone
      }));

      // Transformar dados dos fornecedores
      const supplierAccounts: Account[] = (suppliers || []).map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        type: 'supplier' as const,
        status: supplier.status === 'active' ? 'active' : supplier.status === 'pending' ? 'pending' : 'inactive',
        plan: plansMap[supplier.subscription_plan_id] || 'Sem Plano',
        createdAt: new Date(supplier.created_at).toLocaleDateString('pt-BR'),
        rating: supplier.rating || 0,
        quotesCount: supplier.completed_orders || 0,
        cnpj: supplier.cnpj,
        phone: supplier.phone
      }));

      // Transformar dados dos usuários (admin/suporte)
      const userAccounts: Account[] = (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        type: profile.role as 'admin' | 'support',
        status: profile.active ? 'active' : 'inactive',
        plan: profile.role === 'admin' ? 'SuperAdmin' : 'Standard',
        createdAt: new Date(profile.created_at).toLocaleDateString('pt-BR'),
        companyName: profile.company_name
      }));

      // Buscar estatísticas adicionais para clientes (cotações e receita)
      for (const clientAccount of clientAccounts) {
        const { count: quotesCount } = await supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientAccount.id);

        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('client_id', clientAccount.id)
          .eq('status', 'completed');

        clientAccount.quotesCount = quotesCount || 0;
        clientAccount.revenue = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      }

      // Combinar todos os accounts
      const allAccounts = [...clientAccounts, ...supplierAccounts, ...userAccounts];
      setAccounts(allAccounts);

    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contas. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatLastAccess = (lastAccess: string) => {
    const now = new Date();
    const accessDate = new Date(lastAccess);
    const diffInMinutes = Math.floor((now.getTime() - accessDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    
    const diffInDays = Math.floor(diffInMinutes / 1440);
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    
    return accessDate.toLocaleDateString('pt-BR');
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = !searchTerm || 
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || account.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || account.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: accounts.length,
    clients: accounts.filter(a => a.type === 'client').length,
    suppliers: accounts.filter(a => a.type === 'supplier').length,
    support: accounts.filter(a => a.type === 'support').length,
    admins: accounts.filter(a => a.type === 'admin').length,
    active: accounts.filter(a => a.status === 'active').length,
    pending: accounts.filter(a => a.status === 'pending').length
  };

  const toggleAccountStatus = async (accountId: string, currentStatus: string) => {
    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;

      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      let error = null;

      // Atualizar na tabela apropriada
      if (account.type === 'client') {
        const { error: clientError } = await supabase
          .from('clients')
          .update({ status: newStatus })
          .eq('id', accountId);
        error = clientError;
      } else if (account.type === 'supplier') {
        const { error: supplierError } = await supabase
          .from('suppliers')
          .update({ status: newStatus })
          .eq('id', accountId);
        error = supplierError;
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ active: newStatus === 'active' })
          .eq('id', accountId);
        error = profileError;
      }

      if (error) throw error;

      // Atualizar estado local
      setAccounts(prev => 
        prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, status: newStatus as 'active' | 'inactive' }
            : acc
        )
      );

      toast({
        title: 'Sucesso',
        description: `Conta ${newStatus === 'active' ? 'ativada' : 'desativada'} com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status da conta',
        variant: 'destructive',
      });
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;

      let error = null;

      // Deletar da tabela apropriada
      if (account.type === 'client') {
        const { error: clientError } = await supabase
          .from('clients')
          .delete()
          .eq('id', accountId);
        error = clientError;
      } else if (account.type === 'supplier') {
        const { error: supplierError } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', accountId);
        error = supplierError;
      } else {
        // Para admin/support, apenas desativar
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ active: false })
          .eq('id', accountId);
        error = profileError;
      }

      if (error) throw error;

      // Remover do estado local
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));

      toast({
        title: 'Sucesso',
        description: 'Conta removida com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover conta',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts: filteredAccounts,
    loading,
    searchTerm,
    setSearchTerm,
    selectedType,
    setSelectedType,
    selectedStatus,
    setSelectedStatus,
    stats,
    refetch: fetchAccounts,
    toggleAccountStatus,
    deleteAccount
  };
}