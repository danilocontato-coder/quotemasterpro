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
        console.log('✅ Auth user created, verificando profile...');
        
        // Verificação ativa do profile com até 3 tentativas
        let profileConfirmed = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          
          const { data: checkProfile } = await supabase
            .from('profiles')
            .select('id, supplier_id')
            .eq('email', supplierData.email.toLowerCase())
            .maybeSingle();
          
          if (checkProfile?.supplier_id === (supplier as any).id) {
            profileConfirmed = true;
            console.log(`✅ Profile confirmado (tentativa ${attempt})`);
            break;
          }
        }

        if (!profileConfirmed) {
          toast({
            title: 'Fornecedor criado, mas sincronização pendente',
            description: 'O acesso do fornecedor ainda está sendo configurado. Reenvie as credenciais em alguns instantes.',
          });
        } else {
          toast({
            title: '✅ Fornecedor criado com sucesso!',
            description: 'O fornecedor foi cadastrado e pode acessar o sistema.'
          });
        }
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
      console.log('🔑 Creating credentials via resetSupplierPassword:', { supplierId, email });
      
      // Usar a lógica robusta de reset (que cria se necessário)
      const newPassword = await resetSupplierPassword(supplierId, email);
      
      if (!newPassword) {
        throw new Error('Falha ao criar/resetar senha');
      }
      
      // Refresh suppliers list to update hasUser status
      await fetchSuppliers();
      return newPassword;
    } catch (error) {
      console.error('❌ Error creating supplier credentials:', error);
      toast({ 
        title: 'Erro ao criar credenciais', 
        description: 'Não foi possível preparar o acesso do fornecedor.', 
        variant: 'destructive' 
      });
      return null;
    }
  };

  const resetSupplierPassword = async (supplierId: string, email: string) => {
    try {
      console.log('🔐 Resetting supplier password:', { supplierId, email });
      
      // Verificar se profile existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, supplier_id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      const genPassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let pwd = '';
        for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        return pwd;
      };
      const newPassword = genPassword();

      // Se profile NÃO existe, criar o usuário primeiro
      if (!existingProfile) {
        console.log('⚠️ Profile não existe, criando Auth user primeiro...');
        
        // Buscar dados do fornecedor
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('id', supplierId)
          .single();

        if (!supplierData) {
          throw new Error('Fornecedor não encontrado');
        }

        // Criar usuário
        const { data: createResp, error: createErr } = await supabase.functions.invoke('create-auth-user', {
          body: {
            email: email.trim(),
            password: newPassword,
            name: supplierData.name,
            role: 'supplier',
            supplierId,
            temporaryPassword: true,
            action: 'create'
          }
        });

        if (createErr || !createResp?.success) {
          console.error('❌ Error creating supplier auth user:', createErr || createResp?.error);
          toast({
            title: 'Falha ao criar usuário',
            description: createResp?.error || 'Não foi possível preparar o acesso do fornecedor.',
            variant: 'destructive',
          });
          return null;
        }

        // Verificar criação do profile com até 3 tentativas
        let profileConfirmed = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          
          const { data: checkProfile } = await supabase
            .from('profiles')
            .select('id, supplier_id')
            .eq('email', email.toLowerCase())
            .maybeSingle();
          
          if (checkProfile?.supplier_id === supplierId) {
            profileConfirmed = true;
            console.log(`✅ Profile confirmado após criação (tentativa ${attempt})`);
            break;
          }
        }

        if (!profileConfirmed) {
          toast({
            title: 'Usuário criado, mas sincronização pendente',
            description: 'Aguarde alguns instantes e tente novamente.',
          });
          return null;
        }
      } else {
        // Profile existe, fazer reset normal
        console.log('✅ Profile existe, resetando senha...');
        const { data: authResp, error: fnErr } = await supabase.functions.invoke('create-auth-user', {
          body: {
            email: email.trim(),
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