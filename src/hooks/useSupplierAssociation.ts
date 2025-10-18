import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupplierSearchResult {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: any;
  specialties: string[];
  certification_status: string;
  status: string;
  association_status: string;
}

export interface FindSupplierResult {
  supplier_id: string;
  is_new: boolean;
  certification_status: string;
  existing_name: string;
}

export interface SupplierValidationResult {
  valid: boolean;
  error_code?: string;
  message?: string;
  supplier_name?: string;
  supplier_cnpj?: string;
  supplier_email?: string;
  supplier_status?: string;
}

export function useSupplierAssociation() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const searchSupplierByCNPJ = async (cnpj: string): Promise<SupplierSearchResult[]> => {
    try {
      const { data, error } = await supabase.rpc('search_supplier_by_cnpj', {
        search_cnpj: cnpj
      });

      if (error) throw error;
      
      // Transformar is_associated em association_status
      const transformedData = (data || []).map(supplier => ({
        ...supplier,
        association_status: supplier.is_associated ? 'associated' : 'not_associated'
      }));
      
      return transformedData;
    } catch (error) {
      console.error('Erro ao buscar fornecedor por CNPJ:', error);
      throw error;
    }
  };

  const findSupplierByCNPJ = async (cnpj: string): Promise<SupplierSearchResult | null> => {
    setIsLoading(true);
    try {
      const results = await searchSupplierByCNPJ(cnpj);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSupplier = async (
    supplierData: { name: string; cnpj: string; email?: string; phone?: string },
    clientId?: string
  ): Promise<FindSupplierResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_or_create_supplier_by_cnpj', {
        p_cnpj: supplierData.cnpj,
        p_name: supplierData.name,
        p_email: supplierData.email || '',
        p_phone: supplierData.phone || ''
      });

      if (error) throw error;

      return data[0];
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const validateSupplierStatus = async (supplierId: string): Promise<SupplierValidationResult> => {
    try {
      const { data, error } = await supabase.rpc('validate_supplier_status_for_association', {
        p_supplier_id: supplierId
      });

      if (error) throw error;
      return data as unknown as SupplierValidationResult;
    } catch (error) {
      console.error('Erro ao validar status do fornecedor:', error);
      throw error;
    }
  };

  const associateSupplierToClient = async (supplierId: string, clientId?: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Validar status do fornecedor antes da associação
      const validation = await validateSupplierStatus(supplierId);
      
      if (!validation.valid) {
        if (validation.error_code === 'SUPPLIER_INACTIVE') {
          // Retornar informações específicas do fornecedor inativo
          const error = new Error(validation.message);
          (error as any).code = 'SUPPLIER_INACTIVE';
          (error as any).supplierData = {
            supplier_name: validation.supplier_name,
            supplier_cnpj: validation.supplier_cnpj,
            supplier_email: validation.supplier_email,
            supplier_status: validation.supplier_status
          };
          throw error;
        } else {
          throw new Error(validation.message);
        }
      }

      const { error } = await supabase.rpc('associate_supplier_to_client', {
        p_supplier_id: supplierId,
        p_client_id: clientId || null
      });

      if (error) throw error;

      toast({
        title: "Fornecedor associado",
        description: "O fornecedor foi associado com sucesso à sua base.",
      });
    } catch (error: any) {
      console.error('Erro ao associar fornecedor:', error);
      
      if (error.code === 'SUPPLIER_INACTIVE') {
        // Re-throw com dados específicos para tratamento na UI
        throw error;
      } else {
        toast({
          title: "Erro na associação",
          description: error.message || "Não foi possível associar o fornecedor. Tente novamente.",
          variant: "destructive",
        });
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };


  const getClientSuppliers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_client_suppliers');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar fornecedores associados:', error);
      throw error;
    }
  };

  return {
    isLoading,
    searchSupplierByCNPJ,
    findSupplierByCNPJ,
    createNewSupplier,
    associateSupplierToClient,
    validateSupplierStatus,
    getClientSuppliers
  };
}