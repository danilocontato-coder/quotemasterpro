import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Supplier } from '@/hooks/useSupabaseSuppliers';
import { checkSupplierDuplicate, normalizeCNPJ } from '@/lib/supplierDeduplication';

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
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();
  
  // Usar useRef para evitar re-criação de funções
  const isLoadingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const fetchSuppliers = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('fetchSuppliers já está em execução, ignorando...');
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      console.log('Carregando fornecedores...');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }
      
      console.log('Fornecedores carregados:', data?.length || 0);
      setSuppliers((data as Supplier[]) || []);
      setInitialized(true);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [toast]);

  // Fetch inicial controlado
  useEffect(() => {
    if (!initialized && !isLoadingRef.current) {
      fetchSuppliers();
    }
  }, [initialized, fetchSuppliers]);

  // Real-time subscription otimizada
  useEffect(() => {
    if (!initialized) return;

    const channel = supabase
      .channel('admin-suppliers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('Supplier change detected:', payload.eventType);
          
          // Debounce com ref
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          timeoutRef.current = setTimeout(() => {
            if (!isLoadingRef.current) {
              console.log('Executando refresh após mudança...');
              fetchSuppliers();
            }
          }, 1500);
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [initialized, fetchSuppliers]);

  const createSupplierWithUser = async (
    supplierData: SupplierWithUserData,
    credentials: CredentialsData
  ) => {
    try {
      // Check for duplicates before creating
      const duplicateCheck = await checkSupplierDuplicate(
        supplierData.cnpj || '',
        supplierData.email || '',
        supabase
      );

      if (duplicateCheck.exists && duplicateCheck.existing) {
        const existing = duplicateCheck.existing;
        const reason = duplicateCheck.reason === 'cnpj' ? 'CNPJ' : 'E-mail';
        
        toast({
          title: "Fornecedor já existe",
          description: `Já existe um fornecedor ${existing.type === 'certified' ? 'certificado' : 'local'} com este ${reason}: ${existing.name}. Deseja vincular ao existente ou criar como novo?`,
          variant: "destructive"
        });
        
        // For admin, return the existing supplier instead of creating duplicate
        return existing;
      }

      // 1. Create auth user if credentials are provided
      let authUserId = null;
      if (credentials.generateCredentials) {
        const { data: authData, error: authError } = await supabase.functions.invoke('create-auth-user', {
          body: {
            email: supplierData.email,
            password: credentials.password,
            role: 'supplier',
            user_metadata: {
              name: supplierData.name,
              role: 'supplier',
              force_password_change: credentials.forcePasswordChange
            }
          }
        });

        if (authError) throw authError;
        authUserId = authData?.user?.id;
      }

      // 2. Create supplier record
      const supplierPayload = {
        ...supplierData,
        cnpj: normalizeCNPJ(supplierData.cnpj || ''), // Normalize CNPJ
        // For certified suppliers, set client_id to null (global)
        client_id: supplierData.type === 'certified' ? null : supplierData.client_id
      };
      
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert([supplierPayload])
        .select()
        .single();

      if (supplierError) throw supplierError;

      // 3. Create user record if auth user was created
      if (authUserId) {
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            name: supplierData.name,
            email: supplierData.email,
            role: 'supplier',
            supplier_id: supplier.id,
            auth_user_id: authUserId,
            force_password_change: credentials.forcePasswordChange,
            status: 'active'
          }]);

        if (userError) {
          console.error('Error creating user record:', userError);
        }

        // 4. Send credentials via WhatsApp if supplier has WhatsApp
        if (supplierData.whatsapp) {
          try {
            console.log('[SUPPLIER CREATION] Sending credentials via WhatsApp...');
            await supabase.functions.invoke('notify', {
              body: {
                type: 'whatsapp_user_credentials',
                to: supplierData.whatsapp,
                user_email: supplierData.email,
                user_name: supplierData.name,
                temp_password: credentials.password,
                app_url: window.location.origin
              }
            });
            console.log('[SUPPLIER CREATION] Credentials sent via WhatsApp');
          } catch (whatsappError) {
            console.warn('[SUPPLIER CREATION] Failed to send WhatsApp credentials:', whatsappError);
            // Continue with supplier creation even if WhatsApp fails
            toast({
              title: "Fornecedor criado com aviso",
              description: "Fornecedor criado com sucesso, mas não foi possível enviar as credenciais via WhatsApp.",
              variant: "default"
            });
          }
        }
      }

      // 5. Create audit log
      await supabase
        .from('audit_logs')
        .insert([{
          user_id: authUserId,
          action: 'SUPPLIER_CREATE',
          entity_type: 'suppliers',
          entity_id: supplier.id,
          details: {
            supplier_name: supplierData.name,
            cnpj: supplierData.cnpj,
            with_user: !!authUserId,
            credentials_sent: !!authUserId && !!supplierData.whatsapp
          }
        }]);

      setSuppliers(prev => [...prev, supplier as Supplier].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: "Fornecedor criado com sucesso",
        description: `${supplierData.name} foi adicionado${authUserId ? ' com acesso ao sistema' : ''}${authUserId && supplierData.whatsapp ? ' e credenciais enviadas via WhatsApp' : ''}.`
      });

      return supplier;
    } catch (error) {
      console.error('Error creating supplier with user:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    if (isLoadingRef.current) {
      console.log('Update já em andamento, ignorando...');
      return false;
    }
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      console.log('Atualizando fornecedor:', id, updates);
      
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Fornecedor atualizado com sucesso');
      
      // Atualizar estado local de forma otimizada
      setSuppliers(prev => 
        prev.map(supplier => supplier.id === id ? { ...supplier, ...data as Supplier } : supplier)
      );
      
      toast({
        title: "Fornecedor atualizado",
        description: "As alterações foram salvas com sucesso."
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
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [toast]);

  const deleteSupplier = async (id: string, name: string) => {
    if (isLoading) return false;
    
    try {
      setIsLoading(true);
      console.log('Removendo fornecedor:', id, name);
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Fornecedor removido com sucesso');
      
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      
      toast({
        title: "Fornecedor removido",
        description: `${name} foi removido do sistema.`
      });

      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Erro ao remover fornecedor",
        description: "Não foi possível remover o fornecedor.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    suppliers,
    isLoading,
    refetch: fetchSuppliers,
    createSupplierWithUser,
    updateSupplier,
    deleteSupplier
  };
};