export interface SupplierDuplicateResult {
  exists: boolean;
  existing?: {
    id: string;
    name: string;
    cnpj: string;
    email: string;
    type: 'local' | 'certified';
    client_id?: string;
    is_certified?: boolean;
  };
  reason?: 'cnpj' | 'email';
}

/**
 * Normalizes CNPJ by removing all non-numeric characters
 */
export const normalizeCNPJ = (cnpj: string): string => {
  return cnpj.replace(/[^0-9]/g, '');
};

/**
 * Normalizes document (CPF or CNPJ) by removing all non-numeric characters
 */
export const normalizeDocument = (document: string): string => {
  return document.replace(/[^0-9]/g, '');
};

/**
 * Checks if a supplier already exists based on CNPJ (primary) or email (fallback)
 * Returns the existing supplier data for deduplication decisions
 */
export const checkSupplierDuplicate = async (
  cnpj: string,
  email: string,
  supabase: any
): Promise<SupplierDuplicateResult> => {
  try {
    const normalizedCNPJ = normalizeCNPJ(cnpj);
    
    // First check by CNPJ (primary key for suppliers)
    if (normalizedCNPJ) {
      const { data: cnpjMatch } = await supabase
        .from('suppliers')
        .select('id, name, cnpj, email, type, client_id, is_certified')
        .eq('cnpj', normalizedCNPJ)
        .maybeSingle();
      
      if (cnpjMatch) {
        return {
          exists: true,
          existing: cnpjMatch,
          reason: 'cnpj'
        };
      }
    }
    
    // Fallback to email if no CNPJ match
    if (email) {
      const { data: emailMatch } = await supabase
        .from('suppliers')
        .select('id, name, cnpj, email, type, client_id, is_certified')
        .ilike('email', email.trim())
        .maybeSingle();
      
      if (emailMatch) {
        return {
          exists: true,
          existing: emailMatch,
          reason: 'email'
        };
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking supplier duplicate:', error);
    return { exists: false };
  }
};

/**
 * Determines the best supplier to use when duplicates are found
 * Prioritizes certified suppliers over local ones
 */
export const selectBestSupplier = (suppliers: any[]): any => {
  if (suppliers.length === 0) return null;
  if (suppliers.length === 1) return suppliers[0];
  
  // Prioritize certified suppliers (client_id = null)
  const certified = suppliers.find(s => s.type === 'certified' && !s.client_id);
  if (certified) return certified;
  
  // Return the first one if no certified found
  return suppliers[0];
};

/**
 * Creates a unique token for supplier quote response
 */
export const generateQuoteToken = (): string => {
  return crypto.randomUUID();
};

/**
 * Creates a supplier response link for quotes
 * @deprecated Use createSupplierResponseLinkAsync instead for system configuration support
 */
export const createSupplierResponseLink = (quoteId: string, token: string): string => {
  return `${window.location.origin}/supplier/quick-response/${quoteId}/${token}`;
};

/**
 * Creates a supplier response link for quotes using system configuration
 */
export const createSupplierResponseLinkAsync = async (quoteId: string, token: string): Promise<string> => {
  try {
    const { getCachedBaseUrl } = await import('@/utils/systemConfig');
    const baseUrl = await getCachedBaseUrl();
    return `${baseUrl}/supplier/quick-response/${quoteId}/${token}`;
  } catch (error) {
    console.warn('Erro ao buscar URL base, usando fallback:', error);
    return `${window.location.origin}/supplier/quick-response/${quoteId}/${token}`;
  }
};