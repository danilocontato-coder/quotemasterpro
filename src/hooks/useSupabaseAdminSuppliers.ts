import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Supplier } from '@/hooks/useSupabaseSuppliers';

interface SupplierWithUserData {
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: any;
  business_info?: any;
  specialties?: string[];
  type: 'local' | 'certified';
  region?: string;
  state?: string;
  city?: string;
  visibility_scope?: 'region' | 'global';
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  subscription_plan_id?: string;
  client_id?: string;
  is_certified?: boolean;
  certification_date?: string | null;
  certification_expires_at?: string | null;
}

interface CredentialsData {
  username: string;
  password: string;
  generateCredentials: boolean;
  forcePasswordChange: boolean;
}

export const useSupabaseAdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Função de fetch mais simples possível
  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching suppliers...');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Suppliers loaded:', data?.length || 0);
      setSuppliers((data as any[])?.map(supplier => ({
        ...supplier,
        type: supplier.type as 'local' | 'certified'
      })) || []);
    } catch (error) {
      console.error('❌ Error fetching suppliers:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load inicial simples - SEM real-time
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      console.log('🔄 Updating supplier:', id);
      
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Supplier updated successfully');
      
      // Update local state immediately
      setSuppliers(prev => 
        prev.map(supplier => 
          supplier.id === id ? { 
            ...supplier, 
            ...(data as any),
            type: (data as any).type as 'local' | 'certified'
          } : supplier
        )
      );
      
      toast({
        title: "Fornecedor atualizado",
        description: "As alterações foram salvas com sucesso."
      });

      return true;
    } catch (error) {
      console.error('❌ Error updating supplier:', error);
      toast({
        title: "Erro ao atualizar fornecedor",
        description: "Não foi possível atualizar o fornecedor.",
        variant: "destructive"
      });
      return false;
    }
  };

  const createSupplierWithUser = async (
    supplierData: SupplierWithUserData,
    credentials: CredentialsData
  ) => {
    try {
      console.log('🔄 Creating supplier...');
      
      // Determine context (admin vs client) and enforce RLS-required fields
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      const { data: isAdmin } = await supabase.rpc('has_role_text', { _user_id: userId, _role: 'admin' });
      const { data: currentClientId } = await supabase.rpc('get_current_user_client_id');

      const normalizedCnpj = (supplierData.cnpj || '').replace(/\D/g, '');
      const effectiveType = (supplierData.type as 'local' | 'certified') || 'local';

      const insertData: any = {
        ...supplierData,
        cnpj: normalizedCnpj,
        type: effectiveType,
        // For local suppliers, client_id MUST match current user's client for RLS
        client_id: effectiveType === 'local' 
          ? (supplierData.client_id || currentClientId || null) 
          : null,
        // Certified suppliers are global and flagged as certified
        visibility_scope: effectiveType === 'certified' ? 'global' : (supplierData.visibility_scope || 'region'),
        is_certified: effectiveType === 'certified' ? true : (supplierData as any).is_certified || false,
      };

      console.log('📝 insertData (admin flow):', { insertData, isAdmin, currentClientId });

      // Create supplier with enforced payload
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Supplier created successfully');

      // Generate password if needed
      const genPassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let pwd = '';
        for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        return pwd;
      };
      const password = credentials.generateCredentials ? genPassword() : (credentials.password || genPassword());

      // Create auth user linked to supplier
      console.log('🔐 Creating auth user for supplier...');
      const { data: authResp, error: fnErr } = await supabase.functions.invoke('create-auth-user', {
        body: {
          email: supplierData.email.trim(),
          password,
          name: supplierData.name,
          role: 'supplier',
          supplierId: (supplier as any).id,
          temporaryPassword: credentials.forcePasswordChange,
        },
      });

      if (fnErr || !authResp?.success) {
        console.error('❌ Error creating auth user for supplier:', fnErr || authResp?.error);
        toast({
          title: 'Fornecedor criado, mas usuário de acesso falhou',
          description: authResp?.error || 'Não foi possível criar o acesso do fornecedor.',
          variant: 'destructive',
        });
      } else {
        console.log('✅ Auth user created for supplier:', authResp);
        
        // Fornecedor receberá convite para completar cadastro ao receber a primeira cotação
        toast({
          title: '✅ Fornecedor criado!',
          description: 'Ele receberá o convite para registro ao receber a primeira cotação.',
        });
      }

      // Update local state
      setSuppliers(prev => [...prev, {
        ...supplier,
        type: (supplier as any).type as 'local' | 'certified'
      } as Supplier]);

      return supplier;
    } catch (error) {
      console.error('❌ Error creating supplier:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteSupplier = async (id: string, name: string) => {
    try {
      console.log('🔄 Deleting supplier:', id);
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Supplier deleted successfully');
      
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      
      toast({
        title: "Fornecedor removido",
        description: `${name} foi removido do sistema.`
      });

      return true;
    } catch (error) {
      console.error('❌ Error deleting supplier:', error);
      toast({
        title: "Erro ao remover fornecedor",
        description: "Não foi possível remover o fornecedor.",
        variant: "destructive"
      });
      return false;
    }
  };

  const checkSupplierHasUser = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      return !!data && !error;
    } catch {
      return false;
    }
  };

  const createSupplierCredentials = async (supplierId: string, email: string, name: string) => {
    try {
      console.log('🔑 Creating credentials for supplier:', { supplierId, email, name });
      
      // Generate temporary password
      const genPassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let pwd = '';
        for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        return pwd;
      };
      const newPassword = genPassword();

      // Create auth user
      const { data: authResp, error: fnErr } = await supabase.functions.invoke('create-auth-user', {
        body: {
          email: email.trim(),
          password: newPassword,
          name: name,
          role: 'supplier',
          supplierId,
          temporaryPassword: true,
          action: 'create', // Important: not a reset!
        },
      });

      if (fnErr || !authResp?.success) {
        console.error('❌ Error creating credentials:', fnErr || authResp?.error);
        toast({
          title: 'Falha ao criar credenciais',
          description: authResp?.error || 'Não foi possível criar as credenciais de acesso.',
          variant: 'destructive',
        });
        return null;
      }

      // Copy credentials to clipboard
      const credentials = `Email: ${email}\nSenha inicial: ${newPassword}`;
      try {
        await navigator.clipboard.writeText(credentials);
        toast({ 
          title: 'Credenciais criadas', 
          description: 'Credenciais copiadas para a área de transferência.' 
        });
      } catch {
        toast({ 
          title: 'Credenciais criadas', 
          description: `Anote a senha: ${newPassword}` 
        });
      }

      // Refresh suppliers list to update hasUser status
      await fetchSuppliers();
      return newPassword;
    } catch (error) {
      console.error('❌ Error creating supplier credentials:', error);
      toast({ 
        title: 'Erro', 
        description: 'Erro inesperado ao criar credenciais.', 
        variant: 'destructive' 
      });
      return null;
    }
  };

  const resetSupplierPassword = async (supplierId: string, email: string) => {
    try {
      console.log('🔐 Resetting supplier password:', { supplierId, email });
      const genPassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let pwd = '';
        for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        return pwd;
      };
      const newPassword = genPassword();

      const { data: authResp, error: fnErr } = await supabase.functions.invoke('create-auth-user', {
        body: {
          email: (email || '').trim(),
          password: newPassword,
          name: 'Reset Supplier Password',
          role: 'supplier',
          supplierId,
          temporaryPassword: true,
          action: 'reset_password',
        },
      });

      if (fnErr || !authResp?.success) {
        console.error('❌ Error resetting supplier password:', fnErr || authResp?.error);
        toast({
          title: 'Falha ao resetar senha',
          description: authResp?.error || 'Não foi possível resetar a senha do fornecedor.',
          variant: 'destructive',
        });
        return null;
      }

      const credentials = `Email: ${email}\nNova senha: ${newPassword}`;
      try {
        await navigator.clipboard.writeText(credentials);
        toast({ title: 'Senha resetada', description: 'Credenciais copiadas para a área de transferência.' });
      } catch {
        toast({ title: 'Senha resetada', description: `Anote a nova senha: ${newPassword}` });
      }

      return newPassword;
    } catch (error) {
      console.error('❌ Unexpected error resetting supplier password:', error);
      toast({ title: 'Erro', description: 'Erro inesperado ao resetar senha.', variant: 'destructive' });
      return null;
    }
  };

  return {
    suppliers,
    isLoading,
    refetch: fetchSuppliers,
    createSupplierWithUser,
    updateSupplier,
    deleteSupplier,
    resetSupplierPassword,
    createSupplierCredentials,
    checkSupplierHasUser,
  };
};