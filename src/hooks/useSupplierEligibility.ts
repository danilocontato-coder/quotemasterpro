import { useState, useEffect } from "react";
import { useSupplierDocuments, DOCUMENT_TYPES } from "./useSupplierDocuments";
import { getRequiredDocumentsStatus, isSupplierEligible } from "@/utils/documentValidation";

interface RequiredDocument {
  type: string;
  label: string;
  mandatory: boolean;
}

export function useSupplierEligibility(
  supplierId: string,
  clientId: string,
  requiredDocuments: RequiredDocument[]
) {
  const { documents, isLoading } = useSupplierDocuments({ supplierId, clientId });
  const [eligibilityStatus, setEligibilityStatus] = useState<{
    eligible: boolean;
    reason?: string;
    missingDocs: string[];
    expiredDocs: string[];
    rejectedDocs: string[];
    pendingDocs: string[];
    score: number;
  }>({
    eligible: false,
    missingDocs: [],
    expiredDocs: [],
    rejectedDocs: [],
    pendingDocs: [],
    score: 0,
  });

  useEffect(() => {
    if (isLoading || !documents) return;

    const { eligible, reason } = isSupplierEligible(documents, requiredDocuments);
    const statuses = getRequiredDocumentsStatus(documents, requiredDocuments);

    const missingDocs = statuses
      .filter(s => s.status === 'missing' && s.mandatory)
      .map(s => s.label);
    
    const expiredDocs = statuses
      .filter(s => s.status === 'expired' && s.mandatory)
      .map(s => s.label);
    
    const rejectedDocs = statuses
      .filter(s => s.status === 'rejected' && s.mandatory)
      .map(s => s.label);
    
    const pendingDocs = statuses
      .filter(s => s.status === 'pending' && s.mandatory)
      .map(s => s.label);

    // Calcular score baseado na porcentagem de documentos validados
    const totalRequired = statuses.filter(s => s.mandatory).length;
    const validatedCount = statuses.filter(s => s.status === 'validated' && s.mandatory).length;
    const score = totalRequired > 0 ? Math.round((validatedCount / totalRequired) * 100) : 0;

    setEligibilityStatus({
      eligible,
      reason,
      missingDocs,
      expiredDocs,
      rejectedDocs,
      pendingDocs,
      score,
    });
  }, [documents, isLoading, requiredDocuments]);

  return {
    ...eligibilityStatus,
    isLoading,
  };
}
