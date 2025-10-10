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
