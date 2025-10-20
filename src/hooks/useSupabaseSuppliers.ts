import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checkSupplierDuplicate, normalizeDocument } from '@/lib/supplierDeduplication';
import { logger } from '@/utils/systemLogger';

export interface Supplier {
  id: string;
  name: string;
  document_type: 'cpf' | 'cnpj';
  document_number: string;
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
  certification_date?: string;
  created_at: string;
  updated_at: string;
  association_status?: 'active' | 'available';
  associated_at?: string;
}

export const useSupabaseSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      logger.tenant('FETCH_SUPPLIERS_START', {
        userId: user?.id,
        role: user?.role,
        clientId: user?.clientId
      });
      
      // Get current user to determine filtering - use context user first
      const authUser = user?.id ? { id: user.id } : (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        console.log('No authenticated user, skipping suppliers fetch');
        setSuppliers([]);
        return;
      }

      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', authUser.id)
        .single();

      console.log('Fetching suppliers for user profile:', profile);

      if (profile?.role === 'admin') {
        // Admin users see all suppliers (including inactive for prospecting)
        console.log('Admin user: showing all suppliers including inactive');
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Suppliers fetch error:', error);
          throw error;
        }
        
        console.log('Suppliers fetched (admin):', data?.length, 'records');
        setSuppliers((data as Supplier[]) || []);
      } else {
        // Non-admin users: use RPC to get suppliers with association_status
        if (!profile?.client_id) {
          console.log('No client context, showing no suppliers');
          setSuppliers([]);
          return;
        }

        console.log('Using get_client_suppliers() RPC for non-admin user');
        const { data, error } = await supabase.rpc('get_client_suppliers');

        if (error) {
          console.error('Suppliers RPC error:', error);
          throw error;
        }

        console.log('Suppliers fetched (RPC):', data?.length, 'records');
        // Cast explícito pois os tipos do Supabase ainda não foram regenerados
        const suppliersData = (data as any as Supplier[]) || [];
        setSuppliers(suppliersData);
        
        // Log distribuição de especialidades
        const specialtyDistribution: Record<string, number> = {};
        suppliersData.forEach(s => {
          s.specialties?.forEach(sp => {
            specialtyDistribution[sp] = (specialtyDistribution[sp] || 0) + 1;
          });
        });
        
        const topSpecialties = Object.entries(specialtyDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([sp, count]) => ({ specialty: sp, count }));
        
        logger.tenant('FETCH_SUPPLIERS_SUCCESS', {
          clientId: profile?.client_id,
          count: suppliersData.length,
          suppliersWithSpecialties: suppliersData.filter(s => s.specialties?.length).length,
          uniqueSpecialties: Object.keys(specialtyDistribution).length,
          topSpecialties
        });
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      logger.tenant('FETCH_SUPPLIERS_ERROR', {
        error: error instanceof Error ? error.message : String(error)
      });
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

      // Use current user from context
      console.log('👤 [CREATE-SUPPLIER] Verificando usuário autenticado...');
      if (!user?.id) {
        console.error('❌ [CREATE-SUPPLIER] Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      console.log('✅ [CREATE-SUPPLIER] Usuário autenticado:', { id: user.id, email: user.email });

      console.log('🔍 [CREATE-SUPPLIER] Buscando perfil do usuário...');
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, role, name')
        .eq('id', user.id)
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
        authUserId: user.id,
        profileClientId: profile?.client_id,
        contextClientId: user?.clientId,
        targetClientId
      });

      // Create supplier - MUST include client_id and type for RLS policy
      const insertData = {
        ...supplierData,
        client_id: targetClientId, // ✅ Required by RLS policy (respeitando simulação)
        type: 'local', // ✅ Required by RLS policy: suppliers_client_create_local
        document_number: normalizeDocument(supplierData.document_number || ''), // Normalize document
        cnpj: normalizeDocument(supplierData.document_number || ''), // Backwards compatibility with current schema
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
      
      toast({
        title: "Fornecedor criado",
        description: `O fornecedor "${supplierData.name}" foi criado com sucesso.`,
      });
      
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
      console.log('🔄 [UPDATE-SUPPLIER] Iniciando atualização:', { id, updates });
      
      // Buscar fornecedor atual para comparar documento
      const { data: currentSupplier } = await supabase
        .from('suppliers')
        .select('document_number, document_type, whatsapp, phone, website')
        .eq('id', id)
        .single();

      console.log('📦 [UPDATE-SUPPLIER] Fornecedor atual:', currentSupplier);

      // Normalizar ambos os documentos para comparação
      const currentDocNormalized = normalizeDocument(currentSupplier?.document_number || '');
      const newDocNormalized = updates.document_number ? normalizeDocument(updates.document_number) : '';

      // Se o documento não mudou (mesmo normalizado), remover do update para evitar conflito de constraint
      const updateData = { ...updates };
      if (newDocNormalized && currentDocNormalized === newDocNormalized) {
        delete updateData.document_number;
        console.log('🔄 [UPDATE-SUPPLIER] Documento não mudou, removido do update');
      } else if (updateData.document_number) {
        // Normalizar novo documento antes de salvar
        updateData.document_number = normalizeDocument(updateData.document_number);
      }

      console.log('📝 [UPDATE-SUPPLIER] Dados que serão enviados:', updateData);
      console.log('📱 [UPDATE-SUPPLIER] Campos de contato:', {
        whatsapp: updateData.whatsapp,
        phone: updateData.phone,
        website: updateData.website
      });

      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ [UPDATE-SUPPLIER] Erro no UPDATE:', error);
        throw error;
      }

      console.log('✅ [UPDATE-SUPPLIER] Fornecedor atualizado com sucesso:', data);
      console.log('📱 [UPDATE-SUPPLIER] Contatos salvos:', {
        whatsapp: data.whatsapp,
        phone: data.phone,
        website: data.website
      });

      setSuppliers(prev => 
        prev.map(supplier => supplier.id === id ? { ...supplier, ...data as Supplier } : supplier)
      );
      
      toast({
        title: "Fornecedor atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('💥 [UPDATE-SUPPLIER] Erro inesperado:', error);
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