import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checkSupplierDuplicate, normalizeCNPJ } from '@/lib/supplierDeduplication';

export interface Supplier {
  id: string;
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
  rating: number;
  completed_orders: number;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  subscription_plan_id?: string;
  is_certified?: boolean;
  created_at: string;
  updated_at: string;
}

export const useSupabaseSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      // Get current user to determine filtering - use context user first
      const authUser = user?.id ? { id: user.id } : (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        console.log('No authenticated user, skipping suppliers fetch');
        setSuppliers([]);
        return;
      }

      // Get user profile to check client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', authUser.id)
        .single();

      console.log('Fetching suppliers for user profile:', profile);

      let supplierIds: string[] = [];

      // Apply filters based on user role and context
      if (profile?.role !== 'admin') {
        // Non-admin users should only see suppliers associated with their client
        if (profile?.client_id) {
          console.log('Filtering suppliers by client association');
          
          // Get suppliers associated with this client
          const { data: associations } = await supabase
            .from('client_suppliers')
            .select('supplier_id')
            .eq('client_id', profile.client_id)
            .eq('status', 'active');

          supplierIds = associations?.map(a => a.supplier_id) || [];
          console.log('Associated supplier IDs:', supplierIds);
        } else {
          // If user has no client_id context, show no suppliers
          console.log('No client context, showing no suppliers');
          supplierIds = [];
        }
      }

      // Build query for suppliers
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      // Apply filters based on user role
      if (profile?.role !== 'admin') {
        // Non-admin users: only see active suppliers they're associated with
        if (supplierIds.length > 0) {
          query = query.in('id', supplierIds).eq('status', 'active');
        } else {
          // No associated suppliers, return empty
          setSuppliers([]);
          return;
        }
      } else {
        // Admin users see all suppliers (including inactive for prospecting)
        console.log('Admin user: showing all suppliers including inactive');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Suppliers fetch error:', error);
        throw error;
      }
      
      console.log('Suppliers fetched:', data?.length, 'records');
      setSuppliers((data as Supplier[]) || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchSuppliers();
    
    const channel = supabase
      .channel('suppliers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchSuppliers(); // Refetch data when changes occur
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up suppliers subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating' | 'completed_orders'>) => {
    try {
      console.log('🔧 [CREATE-SUPPLIER] Iniciando criação de fornecedor', supplierData);

      // Get current user's profile to get client_id
      console.log('👤 [CREATE-SUPPLIER] Buscando usuário autenticado...');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('❌ [CREATE-SUPPLIER] Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      console.log('✅ [CREATE-SUPPLIER] Usuário autenticado:', { id: authUser.id, email: authUser.email });

      console.log('🔍 [CREATE-SUPPLIER] Buscando perfil do usuário...');
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, role, name')
        .eq('id', authUser.id)
        .single();

      // Determinar targetClientId: priorizar client_id do contexto (simulação admin) ou do perfil
      let targetClientId = profile?.client_id || null;
      
      // Se não houver client_id no perfil, verificar se é modo admin simulado
      if (!targetClientId && user?.clientId) {
        console.log('🎭 [CREATE-SUPPLIER] Modo admin simulado detectado, usando clientId do contexto');
        targetClientId = user.clientId;
      }

      if (!targetClientId) {
        console.error('❌ [CREATE-SUPPLIER] Nenhum client_id disponível (nem perfil, nem simulação)', {
          profileClientId: profile?.client_id,
          contextClientId: user?.clientId,
          profile
        });
        throw new Error('Contexto de cliente não encontrado. Selecione um cliente antes de criar fornecedores.');
      }

      console.log('✅ [CREATE-SUPPLIER] Target client_id definido:', {
        authUserId: authUser.id,
        profileClientId: profile?.client_id,
        contextClientId: user?.clientId,
        targetClientId
      });

      // Guard: module access for suppliers
      const { data: hasSuppliersAccess, error: accessErr } = await supabase.rpc('user_has_module_access', { _module_key: 'suppliers' });
      if (accessErr) {
        console.error('❌ [CREATE-SUPPLIER] Falha ao verificar acesso ao módulo suppliers:', accessErr);
        throw accessErr;
      }
      if (!hasSuppliersAccess) {
        console.error('⛔ [CREATE-SUPPLIER] Usuário sem acesso ao módulo Fornecedores (plano).');
        throw new Error('Você não tem acesso ao módulo de Fornecedores no seu plano. Fale com o administrador para habilitar.');
      }

      // Create supplier - MUST include client_id and type for RLS policy
      const insertData = {
        ...supplierData,
        client_id: targetClientId, // ✅ Required by RLS policy (respeitando simulação)
        type: 'local', // ✅ Required by RLS policy: suppliers_client_create_local
        cnpj: normalizeCNPJ(supplierData.cnpj || ''), // Normalize CNPJ
        rating: 0,
        completed_orders: 0
      };

      console.log('📝 [CREATE-SUPPLIER] Dados preparados para inserção:', insertData);
      
      console.log('🚀 [CREATE-SUPPLIER] Executando INSERT na tabela suppliers...');
      const { data, error } = await supabase
        .from('suppliers')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ [CREATE-SUPPLIER] Erro no INSERT:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ [CREATE-SUPPLIER] Fornecedor criado com sucesso:', data);

      // Associate supplier with current client
      console.log('🔗 [CREATE-SUPPLIER] Criando associação cliente-fornecedor...');
      const { data: associationData, error: associationError } = await supabase
        .from('client_suppliers')
        .upsert(
          {
            client_id: profile.client_id,
            supplier_id: data.id,
            status: 'active'
          },
          { onConflict: 'client_id,supplier_id', ignoreDuplicates: true }
        )
        .select()
        .maybeSingle();
      
      if (associationError) {
        console.error('❌ [CREATE-SUPPLIER] Erro ao criar associação:', associationError);
        // Don't throw here, supplier was created successfully
      } else if (!associationData) {
        console.log('ℹ️ [CREATE-SUPPLIER] Associação já existia (idempotente).');
      } else {
        console.log('✅ [CREATE-SUPPLIER] Associação criada com sucesso:', associationData);
      }

      setSuppliers(prev => [...prev, data as Supplier].sort((a, b) => a.name.localeCompare(b.name)));
      
      console.log('🎉 [CREATE-SUPPLIER] Processo concluído com sucesso!');
      
      // Enviar WhatsApp de boas-vindas se houver número cadastrado
      if (supplierData.whatsapp) {
        console.log('📤 [CREATE-SUPPLIER] Enviando WhatsApp de boas-vindas para:', supplierData.whatsapp);
        
        toast({
          title: "📤 Enviando boas-vindas",
          description: "Enviando mensagem via WhatsApp...",
        });

        try {
          // Buscar nome do cliente
          const { data: clientData } = await supabase
            .from('clients')
            .select('name')
            .eq('id', targetClientId)
            .single();

          const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('send-supplier-welcome', {
            body: {
              supplierId: data.id,
              supplierName: supplierData.name,
              supplierPhone: supplierData.whatsapp,
              clientId: targetClientId,
              clientName: clientData?.name || 'Cliente',
              customVariables: {
                supplier_email: supplierData.email,
                access_link: window.location.origin + '/login'
              }
            }
          });

          if (whatsappError) {
            console.error('❌ [CREATE-SUPPLIER] Erro ao chamar edge function:', whatsappError);
            throw whatsappError;
          }

          if (whatsappResult?.success) {
            console.log('✅ [CREATE-SUPPLIER] WhatsApp enviado com sucesso, messageId:', whatsappResult.messageId);
            toast({
              title: "✅ Fornecedor criado e notificado!",
              description: `${supplierData.name} foi criado e receberá mensagem no WhatsApp ${supplierData.whatsapp}`,
            });
          } else {
            console.error('❌ [CREATE-SUPPLIER] Falha no envio do WhatsApp:', whatsappResult?.error);
            toast({
              title: "⚠️ Fornecedor criado",
              description: `${supplierData.name} foi criado, mas houve erro ao enviar WhatsApp. Verifique as configurações da Evolution API.`,
              variant: "destructive",
            });
          }
        } catch (whatsappError: any) {
          console.error('⚠️ [CREATE-SUPPLIER] Erro no envio de WhatsApp:', whatsappError);
          toast({
            title: "⚠️ Fornecedor criado",
            description: `${supplierData.name} foi criado, mas houve erro ao enviar WhatsApp.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Fornecedor criado",
          description: `O fornecedor "${supplierData.name}" foi criado com sucesso.`,
        });
      }
      
      return data;
    } catch (error) {
      console.error('💥 [CREATE-SUPPLIER] Erro inesperado:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => 
        prev.map(supplier => supplier.id === id ? { ...supplier, ...data as Supplier } : supplier)
      );
      
      toast({
        title: "Fornecedor atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Erro ao atualizar fornecedor",
        description: "Não foi possível atualizar o fornecedor.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteSupplier = async (id: string, name: string) => {
    try {
      // Get current user profile to check role
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, client_id')
        .eq('id', authUser.id)
        .single();

      // Implement soft delete logic based on user role
      if (profile?.role === 'admin') {
        // Admin can do hard delete OR global soft delete (affects all clients)
        const { error } = await supabase
          .from('suppliers')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Fornecedor desativado globalmente",
          description: `O fornecedor "${name}" foi desativado para todos os clientes.`,
        });
      } else {
        // Non-admin users: only soft delete their client-supplier association
        if (!profile?.client_id) {
          throw new Error('Cliente não identificado');
        }

        const { error: associationError } = await supabase
          .from('client_suppliers')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('supplier_id', id)
          .eq('client_id', profile.client_id);

        if (associationError) throw associationError;

        toast({
          title: "Fornecedor removido da sua lista",
          description: `O fornecedor "${name}" foi removido da sua lista. Outros clientes não foram afetados.`,
        });
      }

      // Update local state - remove from list since user shouldn't see it anymore
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      
      // Ensure UI is in sync with DB (handles replication delays)
      setTimeout(() => {
        fetchSuppliers();
      }, 150);
      
      return true;
    } catch (error: any) {
      console.error('Error deleting/deactivating supplier:', error);
      const message = (error?.message?.includes('permission') || error?.code === '42501')
        ? 'Permissão negada pelas políticas de acesso (RLS). Você só pode remover fornecedores da sua lista. Fornecedores certificados só podem ser gerenciados pelo Superadmin.'
        : 'Não foi possível remover o fornecedor.';
      toast({
        title: "Erro ao remover fornecedor",
        description: message,
        variant: "destructive"
      });
      // Re-sync state just in case local removal happened elsewhere
      setTimeout(() => {
        fetchSuppliers();
      }, 150);
      return false;
    }
  };

  const refetch = async () => {
    await fetchSuppliers();
  };

  return {
    suppliers,
    isLoading,
    refetch,
    createSupplier,
    updateSupplier,
    deleteSupplier
  };
};