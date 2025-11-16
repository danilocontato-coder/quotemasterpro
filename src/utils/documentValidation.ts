/**
 * Utilitários para validação e formatação de CPF e CNPJ
 */

export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function normalizeDocument(doc: string): string {
  return doc.replace(/\D/g, '');
}

export function formatCPF(cpf: string): string {
  const digits = normalizeCPF(cpf);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCNPJ(cnpj: string): string {
  const digits = normalizeCNPJ(cnpj);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function formatDocument(value: string, type: 'cpf' | 'cnpj'): string {
  return type === 'cpf' ? formatCPF(value) : formatCNPJ(value);
}

export function validateCPF(cpf: string): boolean {
  const digits = normalizeCPF(cpf);
  
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // Todos os dígitos iguais
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = remainder >= 10 ? 0 : remainder;
  
  if (digit1 !== parseInt(digits.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = remainder >= 10 ? 0 : remainder;
  
  return digit2 === parseInt(digits.charAt(10));
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = normalizeCNPJ(cnpj);
  
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false; // Todos os dígitos iguais
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(digits.charAt(12))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return digit2 === parseInt(digits.charAt(13));
}

export function validateDocument(value: string, type: 'cpf' | 'cnpj'): boolean {
  return type === 'cpf' ? validateCPF(value) : validateCNPJ(value);
}

export function getDocumentMask(type: 'cpf' | 'cnpj'): string {
  return type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00';
}

export function getDocumentPlaceholder(type: 'cpf' | 'cnpj'): string {
  return type === 'cpf' ? 'Digite o CPF' : 'Digite o CNPJ';
}

// ============== NOVAS FUNÇÕES PARA DOCUMENTOS DE FORNECEDORES ==============

import { SupplierDocument } from "@/hooks/useSupplierDocuments";
import { differenceInDays } from "date-fns";

/**
 * Verifica se um documento está expirado
 */
export function isDocumentExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

/**
 * Verifica se um documento está vencendo em breve
 */
export function isDocumentExpiringSoon(expiryDate: string | null, days: number = 30): boolean {
  if (!expiryDate) return false;
  const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
  return daysUntilExpiry > 0 && daysUntilExpiry <= days;
}

/**
 * Calcula o score de documentação de um fornecedor (0-100)
 */
export function calculateDocumentScore(documents: SupplierDocument[]): number {
  if (documents.length === 0) return 0;

  const weights = {
    validated: 100,
    pending: 50,
    rejected: 0,
    expired: 0,
  };

  const totalScore = documents.reduce((sum, doc) => {
    const status = isDocumentExpired(doc.expiry_date) ? 'expired' : doc.status;
    return sum + weights[status as keyof typeof weights];
  }, 0);

  return Math.round(totalScore / documents.length);
}

/**
 * Verifica o status de documentos obrigatórios de um fornecedor
 */
export interface RequiredDocumentStatus {
  type: string;
  label: string;
  mandatory: boolean;
  status: 'missing' | 'pending' | 'validated' | 'rejected' | 'expired';
  document?: SupplierDocument;
}

export function getRequiredDocumentsStatus(
  supplierDocuments: SupplierDocument[],
  requiredDocs: { type: string; label: string; mandatory: boolean }[]
): RequiredDocumentStatus[] {
  return requiredDocs.map(required => {
    const document = supplierDocuments.find(doc => doc.document_type === required.type);
    
    let status: RequiredDocumentStatus['status'] = 'missing';
    
    if (document) {
      if (isDocumentExpired(document.expiry_date)) {
        status = 'expired';
      } else {
        status = document.status as 'pending' | 'validated' | 'rejected';
      }
    }

    return {
      ...required,
      status,
      document,
    };
  });
}

/**
 * Verifica se um fornecedor é elegível baseado nos documentos obrigatórios
 */
export function isSupplierEligible(
  supplierDocuments: SupplierDocument[],
  requiredDocs: { type: string; label: string; mandatory: boolean }[]
): { eligible: boolean; reason?: string } {
  const mandatoryDocs = requiredDocs.filter(doc => doc.mandatory);
  
  if (mandatoryDocs.length === 0) {
    return { eligible: true };
  }

  const statuses = getRequiredDocumentsStatus(supplierDocuments, mandatoryDocs);
  
  const missingMandatory = statuses.filter(doc => doc.mandatory && doc.status === 'missing');
  if (missingMandatory.length > 0) {
    return {
      eligible: false,
      reason: `Documentos obrigatórios faltando: ${missingMandatory.map(d => d.label).join(', ')}`,
    };
  }

  const expiredMandatory = statuses.filter(doc => doc.mandatory && doc.status === 'expired');
  if (expiredMandatory.length > 0) {
    return {
      eligible: false,
      reason: `Documentos obrigatórios expirados: ${expiredMandatory.map(d => d.label).join(', ')}`,
    };
  }

  const rejectedMandatory = statuses.filter(doc => doc.mandatory && doc.status === 'rejected');
  if (rejectedMandatory.length > 0) {
    return {
      eligible: false,
      reason: `Documentos obrigatórios rejeitados: ${rejectedMandatory.map(d => d.label).join(', ')}`,
    };
  }

  const pendingMandatory = statuses.filter(doc => doc.mandatory && doc.status === 'pending');
  if (pendingMandatory.length > 0) {
    return {
      eligible: false,
      reason: `Documentos obrigatórios pendentes de validação: ${pendingMandatory.map(d => d.label).join(', ')}`,
    };
  }

  return { eligible: true };
}
