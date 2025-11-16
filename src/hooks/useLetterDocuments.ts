import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequiredDocument {
  type: string;
  label: string;
  mandatory: boolean;
}

interface DocumentDetail {
  type: string;
  label: string;
  mandatory: boolean;
  status: 'validated' | 'pending' | 'missing' | 'rejected' | 'expired';
  file_url?: string;
  validated_at?: string;
  expiry_date?: string;
  reason?: string;
  rejection_reason?: string;
  uploaded_at?: string;
}

interface SupplierEligibility {
  supplierId: string;
  supplierName: string;
  eligible: boolean;
  status: 'eligible' | 'pending' | 'ineligible' | 'not_checked';
  documents: DocumentDetail[];
  summary: {
    total: number;
    validated: number;
    pending: number;
    missing: number;
    rejected: number;
    expired: number;
  };
}

export function useLetterDocuments(letterId: string) {
  const [suppliers, setSuppliers] = useState<SupplierEligibility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const { toast } = useToast();

  const fetchLetterDocuments = async () => {
    try {
      setIsLoading(true);

      // 1. Buscar required_documents da carta
      const { data: letter, error: letterError } = await supabase
        .from('invitation_letters')
        .select('required_documents, client_id')
        .eq('id', letterId)
        .single();

      if (letterError) throw letterError;

      const required = Array.isArray(letter.required_documents) 
        ? (letter.required_documents as unknown as RequiredDocument[])
        : [];
      setRequiredDocuments(required);

      // 2. Buscar fornecedores vinculados
      const { data: letterSuppliers, error: suppliersError } = await supabase
        .from('invitation_letter_suppliers')
        .select(`
          supplier_id,
          document_status,
          document_validation_notes,
          validated_at,
          suppliers (
            id,
            name
          )
        `)
        .eq('invitation_letter_id', letterId);

      if (suppliersError) throw suppliersError;

      // 3. Para cada fornecedor, calcular elegibilidade via RPC
      const eligibilityPromises = (letterSuppliers || []).map(async (ls: any) => {
        const { data: eligibility, error: rpcError } = await supabase.rpc(
          'get_supplier_eligibility_for_letter' as any,
          {
            p_supplier_id: ls.supplier_id,
            p_client_id: letter.client_id,
            p_required_docs: required
          }
        );

        if (rpcError) {
          console.error('Error calculating eligibility:', rpcError);
          return null;
        }

        const eligibilityData = eligibility as any;

        return {
          supplierId: ls.supplier_id,
          supplierName: ls.suppliers?.name || 'Desconhecido',
          eligible: eligibilityData.eligible,
          status: eligibilityData.status,
          documents: eligibilityData.details,
          summary: eligibilityData.summary
        } as SupplierEligibility;
      });

      const results = await Promise.all(eligibilityPromises);
      setSuppliers(results.filter(Boolean) as SupplierEligibility[]);
    } catch (error: any) {
      console.error('Error fetching letter documents:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recalculateEligibility = async () => {
    await fetchLetterDocuments();
  };

  useEffect(() => {
    if (letterId) {
      fetchLetterDocuments();

      // Realtime subscription em supplier_documents
      const channel = supabase
        .channel(`letter-documents-${letterId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'supplier_documents'
          },
          () => {
            fetchLetterDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [letterId]);

  return {
    suppliers,
    requiredDocuments,
    isLoading,
    recalculateEligibility
  };
}
