import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdministradoraSupplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: any;
  specialties?: string[];
  region?: string;
  state?: string;
  city?: string;
  status: string;
  type: 'local' | 'certified';
  source: 'administradora' | 'condominio' | 'certified';
  rating?: number;
  completed_orders?: number;
  client_id?: string;
  condominio_name?: string;
  is_certified?: boolean;
  is_linked?: boolean;
  created_at?: string;
}

export interface SupplierFormData {
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  specialties?: string[];
  region?: string;
  state?: string;
  city?: string;
  status?: string;
}

export const useAdministradoraSuppliersManagement = () => {
  const [suppliers, setSuppliers] = useState<AdministradoraSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      // Buscar usuário atual e seu client_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) {
        toast.error('Cliente não encontrado');
        return;
      }

      // 1. Buscar fornecedores locais da administradora
      const { data: localSuppliers, error: localError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('client_id', profile.client_id)
        .eq('type', 'local')
        .order('name');

      if (localError) throw localError;

      // 2. Buscar condomínios filhos primeiro
      const { data: childClients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('parent_client_id', profile.client_id);

      const childClientIds = childClients?.map(c => c.id) || [];

      // Buscar fornecedores dos condomínios
      let condominioSuppliers: any[] = [];
      let condominioError = null;
      
      if (childClientIds.length > 0) {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .in('client_id', childClientIds)
          .eq('type', 'local')
          .order('name');
        
        condominioSuppliers = data || [];
        condominioError = error;
        
        // Buscar nomes dos condomínios separadamente
        if (childClients && childClients.length > 0) {
          condominioSuppliers = condominioSuppliers.map(supplier => {
            const client = childClients.find(c => c.id === supplier.client_id);
            return {
              ...supplier,
              condominio_name: client?.name || 'Condomínio'
            };
          });
        }
      }

      if (condominioError) throw condominioError;

      // 3. Buscar fornecedores certificados (globais)
      const { data: certifiedSuppliers, error: certifiedError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('type', 'certified')
        .eq('status', 'active')
        .is('client_id', null)
        .order('name');

      if (certifiedError) throw certifiedError;

      // 4. Verificar quais fornecedores certificados já estão vinculados
      const { data: linkedSuppliers } = await supabase
        .from('client_suppliers')
        .select('supplier_id')
        .eq('client_id', profile.client_id)
        .eq('status', 'active');

      const linkedIds = new Set(linkedSuppliers?.map(ls => ls.supplier_id) || []);

      // Formatar dados
      const formattedLocal: AdministradoraSupplier[] = (localSuppliers || []).map(s => ({
        id: s.id,
        name: s.name,
        cnpj: s.cnpj,
        email: s.email,
        phone: s.phone || undefined,
        whatsapp: s.whatsapp || undefined,
        website: s.website || undefined,
        address: s.address,
        specialties: s.specialties || undefined,
        region: s.region || undefined,
        state: s.state || undefined,
        city: s.city || undefined,
        status: s.status,
        type: s.type as 'local' | 'certified',
        source: 'administradora' as const,
        rating: s.rating || undefined,
        completed_orders: s.completed_orders || undefined,
        client_id: s.client_id || undefined,
        is_certified: s.is_certified || false,
        created_at: s.created_at || undefined,
      }));

      const formattedCondominio: AdministradoraSupplier[] = (condominioSuppliers || []).map(s => ({
        id: s.id,
        name: s.name,
        cnpj: s.cnpj,
        email: s.email,
        phone: s.phone || undefined,
        whatsapp: s.whatsapp || undefined,
        website: s.website || undefined,
        address: s.address,
        specialties: s.specialties || undefined,
        region: s.region || undefined,
        state: s.state || undefined,
        city: s.city || undefined,
        status: s.status,
        type: s.type as 'local' | 'certified',
        source: 'condominio' as const,
        rating: s.rating || undefined,
        completed_orders: s.completed_orders || undefined,
        client_id: s.client_id || undefined,
        condominio_name: s.condominio_name || 'Condomínio',
        is_certified: s.is_certified || false,
        created_at: s.created_at || undefined,
      }));

      const formattedCertified: AdministradoraSupplier[] = (certifiedSuppliers || []).map(s => ({
        id: s.id,
        name: s.name,
        cnpj: s.cnpj,
        email: s.email,
        phone: s.phone || undefined,
        whatsapp: s.whatsapp || undefined,
        website: s.website || undefined,
        address: s.address,
        specialties: s.specialties || undefined,
        region: s.region || undefined,
        state: s.state || undefined,
        city: s.city || undefined,
        status: s.status,
        type: s.type as 'local' | 'certified',
        source: 'certified' as const,
        rating: s.rating || undefined,
        completed_orders: s.completed_orders || undefined,
        is_certified: s.is_certified || false,
        is_linked: linkedIds.has(s.id),
        created_at: s.created_at || undefined,
      }));

      setSuppliers([...formattedLocal, ...formattedCondominio, ...formattedCertified]);
    } catch (error: any) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setIsLoading(false);
    }
  };

  const createLocalSupplier = async (data: SupplierFormData, password: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', authUser.id)
        .single();

      // Determinar targetClientId: priorizar contexto de simulação admin ou perfil
      let targetClientId = profile?.client_id || null;
      
      // Se não houver client_id no perfil, verificar se é modo admin simulado via useAuth
      // (useAuth já injeta user.clientId do adminAccessData)
      if (!targetClientId) {
        // Tentar obter do contexto via adminAccess
        const urlParams = new URLSearchParams(window.location.search);
        const adminToken = urlParams.get('adminToken');
        if (adminToken) {
          const adminData = localStorage.getItem(`adminAccess_${adminToken}`);
          if (adminData) {
            const parsed = JSON.parse(adminData);
            targetClientId = parsed.targetClientId || null;
          }
        }
      }

      if (!targetClientId) {
        toast.error('Contexto de cliente não encontrado. Selecione um cliente antes de criar fornecedores.');
        return { success: false };
      }

      console.log('✅ [CREATE-LOCAL-SUPPLIER] Target client_id:', {
        authUserId: authUser.id,
        profileClientId: profile?.client_id,
        targetClientId
      });

      // Guard: verificar acesso ao módulo 'suppliers'
      const { data: hasSuppliersAccess, error: accessErr } = await supabase.rpc('user_has_module_access', { _module_key: 'suppliers' });
      if (accessErr) throw accessErr;
      if (!hasSuppliersAccess) {
        toast.error('Seu plano não habilita o módulo de Fornecedores.');
        return { success: false };
      }

      // Verificar CNPJ duplicado via RPC (bypassa RLS)
      console.log('🔍 [CREATE-LOCAL-SUPPLIER] Buscando fornecedor via RPC:', {
        cnpj: data.cnpj,
        name: data.name
      });

      const { data: searchResult, error: searchError } = await supabase.rpc(
        'find_or_create_supplier_by_cnpj',
        {
          p_cnpj: data.cnpj.replace(/\D/g, ''),
          p_name: data.name,
          p_email: data.email,
          p_phone: data.phone || ''
        }
      );

      if (searchError) {
        console.error('❌ Erro ao buscar/criar fornecedor via RPC:', searchError);
        throw searchError;
      }

      console.log('✅ [RPC-RESULT]:', searchResult);

      // Se fornecedor já existe (is_new = false)
      if (searchResult && searchResult.length > 0 && !searchResult[0].is_new) {
        const existingSupplier = searchResult[0];
        
        console.log('⚠️ [DUPLICATE-FOUND] Fornecedor já existe:', existingSupplier);
        
        // Buscar nome do fornecedor
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', existingSupplier.supplier_id)
          .single();
        
        const supplierName = supplierData?.name || 'Fornecedor';
        
        // Verificar se já está associado ao cliente atual
        const { data: existingAssoc } = await supabase
          .from('client_suppliers')
          .select('id, status')
          .eq('supplier_id', existingSupplier.supplier_id)
          .eq('client_id', targetClientId)
          .maybeSingle();
        
        console.log('🔗 [ASSOCIATION-CHECK]:', {
          supplierId: existingSupplier.supplier_id,
          clientId: targetClientId,
          existingAssoc
        });
        
        if (existingAssoc && existingAssoc.status === 'active') {
          toast.error(`CNPJ já cadastrado. Fornecedor: ${supplierName}`);
          return { 
            success: false, 
            reason: 'duplicate_active', 
            existingSupplier 
          };
        }
        
        // Fornecedor existe mas não está associado: associar automaticamente
        toast.info(`Fornecedor "${supplierName}" encontrado. Associando ao seu cliente...`);
        
        console.log('🔗 [ASSOCIATING] Associando fornecedor existente ao cliente...');
        
        await supabase.rpc('associate_supplier_to_client', {
          p_supplier_id: existingSupplier.supplier_id,
          p_client_id: targetClientId
        });
        
        // Atualizar dados do fornecedor com informações completas
        const { error: updateError } = await supabase
          .from('suppliers')
          .update({
            whatsapp: data.whatsapp,
            website: data.website,
            address: data.address,
            specialties: data.specialties,
            region: data.region,
            state: data.state,
            city: data.city,
          })
          .eq('id', existingSupplier.supplier_id);

        if (updateError) {
          console.warn('⚠️ Erro ao atualizar dados do fornecedor:', updateError);
        }
        
        // Criar usuário de autenticação (se não existir)
        const { data: authResult, error: authError } = await supabase.functions.invoke('create-supplier-user', {
          body: {
            email: data.email,
            password: password,
            supplier_id: existingSupplier.supplier_id,
            name: data.name,
          },
        });
        
        if (authError || !authResult?.success) {
          console.warn('❌ Erro ao criar usuário de autenticação:', authError || authResult?.error);
        } else {
          console.log('✅ Usuário de autenticação criado/atualizado com sucesso');
        }
        
        toast.success(`Fornecedor "${supplierName}" associado com sucesso!`);
        await fetchSuppliers();
        
        return { 
          success: true, 
          supplierId: existingSupplier.supplier_id,
          existingSupplier,
          credentials: authResult?.success 
            ? { email: data.email, password, user_id: authResult.user_id }
            : { email: data.email, password }
        };
      }

      // Se fornecedor NÃO existe, foi criado pela RPC (is_new = true)
      const newSupplier = searchResult[0];
      const supplierId = newSupplier.supplier_id;
      
      // Buscar nome do fornecedor
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', supplierId)
        .single();
        
      console.log('✨ [NEW-SUPPLIER] Fornecedor criado via RPC:', {
        supplierId,
        name: supplierData?.name || data.name
      });

      // Atualizar fornecedor recém-criado com dados completos
      const { error: updateError } = await supabase
        .from('suppliers')
        .update({
          whatsapp: data.whatsapp,
          website: data.website,
          address: data.address,
          specialties: data.specialties,
          region: data.region,
          state: data.state,
          city: data.city,
          status: data.status || 'active',
          type: 'local',
          client_id: targetClientId,
        })
        .eq('id', supplierId);

      if (updateError) throw updateError;

      // Associar ao cliente via RPC
      console.log('🔗 [ASSOCIATING] Associando fornecedor novo ao cliente...');
      await supabase.rpc('associate_supplier_to_client', {
        p_supplier_id: supplierId,
        p_client_id: targetClientId
      });

      // Criar usuário de autenticação via Edge Function
      const { data: authResult, error: authError } = await supabase.functions.invoke('create-supplier-user', {
        body: {
          email: data.email,
          password: password,
          supplier_id: supplierId,
          name: data.name,
        },
      });

      if (authError || !authResult?.success) {
        console.warn('❌ Erro ao criar usuário de autenticação:', authError || authResult?.error);
        // Não mostrar toast aqui, o modal vai avisar
      } else {
        console.log('✅ Usuário de autenticação criado com sucesso');
      }

      toast.success('Fornecedor cadastrado com sucesso!');
      await fetchSuppliers();
      
      // Sempre retornar credenciais para exibição, mesmo se Edge Function falhar
      return { 
        success: true, 
        supplierId: supplierId,
        credentials: (authResult?.success) 
          ? { email: data.email, password, user_id: authResult.user_id } 
          : { email: data.email, password } // Credenciais sem user_id se falhou
      };
    } catch (error: any) {
      console.error('Erro ao criar fornecedor:', error);
      toast.error(error.message || 'Erro ao criar fornecedor');
      return { success: false };
    }
  };

  const updateLocalSupplier = async (id: string, data: Partial<SupplierFormData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) throw new Error('Cliente não encontrado');

      const updateData: any = { ...data };
      if (data.cnpj) {
        updateData.cnpj = data.cnpj.replace(/\D/g, '');
      }

      const { error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', id)
        .eq('client_id', profile.client_id)
        .eq('type', 'local');

      if (error) throw error;

      toast.success('Fornecedor atualizado com sucesso!');
      await fetchSuppliers();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao atualizar fornecedor:', error);
      toast.error('Erro ao atualizar fornecedor');
      return { success: false };
    }
  };

  const deleteLocalSupplier = async (id: string, name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) throw new Error('Cliente não encontrado');

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('client_id', profile.client_id)
        .eq('type', 'local');

      if (error) throw error;

      toast.success(`Fornecedor "${name}" removido com sucesso!`);
      await fetchSuppliers();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao deletar fornecedor:', error);
      toast.error('Erro ao remover fornecedor');
      return { success: false };
    }
  };

  const toggleSupplierStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('suppliers')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Fornecedor ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
      await fetchSuppliers();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do fornecedor');
      return { success: false };
    }
  };

  const linkCertifiedSupplier = async (supplierId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) throw new Error('Cliente não encontrado');

      const { error } = await supabase
        .from('client_suppliers')
        .insert({
          client_id: profile.client_id,
          supplier_id: supplierId,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Fornecedor certificado vinculado com sucesso!');
      await fetchSuppliers();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao vincular fornecedor:', error);
      toast.error('Erro ao vincular fornecedor certificado');
      return { success: false };
    }
  };

  const unlinkCertifiedSupplier = async (supplierId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) throw new Error('Cliente não encontrado');

      const { error } = await supabase
        .from('client_suppliers')
        .delete()
        .eq('client_id', profile.client_id)
        .eq('supplier_id', supplierId);

      if (error) throw error;

      toast.success('Fornecedor certificado desvinculado com sucesso!');
      await fetchSuppliers();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao desvincular fornecedor:', error);
      toast.error('Erro ao desvincular fornecedor certificado');
      return { success: false };
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return {
    suppliers,
    isLoading,
    refetch: fetchSuppliers,
    createLocalSupplier,
    updateLocalSupplier,
    deleteLocalSupplier,
    toggleSupplierStatus,
    linkCertifiedSupplier,
    unlinkCertifiedSupplier,
  };
};
