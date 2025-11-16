import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EligibilitySummary {
  total: number;
  eligible: number;
  pending: number;
  ineligible: number;
  notChecked: number;
  allEligible: boolean;
}

export function useLetterEligibilitySummary(letterId: string) {
  const [summary, setSummary] = useState<EligibilitySummary>({
    total: 0,
    eligible: 0,
    pending: 0,
    ineligible: 0,
    notChecked: 0,
    allEligible: false
  });
  const [isLoading, setIsLoading] = useState(true);

  const calculateSummary = async () => {
    try {
      setIsLoading(true);

      // Buscar carta e fornecedores
      const { data: letter, error: letterError } = await supabase
        .from('invitation_letters')
        .select('required_documents, client_id')
        .eq('id', letterId)
        .single();

      if (letterError) throw letterError;

      const { data: letterSuppliers, error: suppliersError } = await supabase
        .from('invitation_letter_suppliers')
        .select('supplier_id')
        .eq('invitation_letter_id', letterId);

      if (suppliersError) throw suppliersError;

      if (!letterSuppliers || letterSuppliers.length === 0) {
        setSummary({
          total: 0,
          eligible: 0,
          pending: 0,
          ineligible: 0,
          notChecked: 0,
          allEligible: true
        });
        return;
      }

      // Calcular elegibilidade de cada fornecedor em paralelo
      const eligibilityPromises = letterSuppliers.map(async (ls) => {
        const { data, error } = await supabase.rpc(
          'get_supplier_eligibility_for_letter',
          {
            p_supplier_id: ls.supplier_id,
            p_client_id: letter.client_id,
            p_required_docs: letter.required_documents || []
          }
        );

        if (error) {
          console.error('Error calculating eligibility:', error);
          return 'not_checked';
        }

        return data.status;
      });

      const statuses = await Promise.all(eligibilityPromises);

      const eligible = statuses.filter(s => s === 'eligible').length;
      const pending = statuses.filter(s => s === 'pending').length;
      const ineligible = statuses.filter(s => s === 'ineligible').length;
      const notChecked = statuses.filter(s => s === 'not_checked').length;

      setSummary({
        total: letterSuppliers.length,
        eligible,
        pending,
        ineligible,
        notChecked,
        allEligible: eligible === letterSuppliers.length
      });
    } catch (error) {
      console.error('Error calculating summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (letterId) {
      calculateSummary();
    }
  }, [letterId]);

  return {
    summary,
    isLoading,
    refresh: calculateSummary
  };
}
