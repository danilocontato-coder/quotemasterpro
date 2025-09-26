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
  is_associated: boolean;
}

export interface FindSupplierResult {
  supplier_id: string;
  is_new: boolean;
  certification_status: string;
  existing_name: string;
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
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar fornecedor por CNPJ:', error);
      throw error;
    }
  };

  const findOrCreateSupplier = async (
    cnpj: string,
    name?: string,
    email?: string,
    phone?: string
  ): Promise<FindSupplierResult> => {
    try {
      const { data, error } = await supabase.rpc('find_or_create_supplier_by_cnpj', {
        p_cnpj: cnpj,
        p_name: name,
        p_email: email,
        p_phone: phone
      });

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Erro ao buscar/criar fornecedor:', error);
      throw error;
    }
  };

  const associateSupplierToClient = async (supplierId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('associate_supplier_to_client', {
        p_supplier_id: supplierId
      });

      if (error) throw error;

      toast({
        title: "Fornecedor associado",
        description: "O fornecedor foi associado com sucesso à sua base.",
      });
    } catch (error: any) {
      console.error('Erro ao associar fornecedor:', error);
      toast({
        title: "Erro na associação",
        description: "Não foi possível associar o fornecedor. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const inviteSupplierCertification = async (supplierId: string, message?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('invite_supplier_certification', {
        p_supplier_id: supplierId,
        p_message: message
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast({
          title: "Convite enviado",
          description: result.message || "O fornecedor foi convidado a se certificar.",
        });
        return true;
      } else {
        toast({
          title: "Erro no convite",
          description: result.error || "Não foi possível enviar o convite.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      toast({
        title: "Erro no convite",
        description: "Não foi possível enviar o convite. Tente novamente.",
        variant: "destructive",
      });
      return false;
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
    findOrCreateSupplier,
    associateSupplierToClient,
    inviteSupplierCertification,
    getClientSuppliers
  };
}