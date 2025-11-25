import { z } from 'zod';
import { validateCPF, validateCNPJ, normalizeDocument } from '@/utils/documentValidation';

// CPF validation - aceita formatado ou apenas dígitos
const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;

// CNPJ validation - aceita tanto formatado quanto sem formatação
const cnpjRegex = /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/;

// Phone validation (Brazilian format)
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

// Email validation
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const supplierFormSchema = z.object({
  // Dados Básicos
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .refine(val => val.length > 0, 'Nome é obrigatório'),
  
  document_type: z.enum(['cpf', 'cnpj']).default('cnpj'),
  
  document_number: z
    .string()
    .trim()
    .min(1, 'Documento é obrigatório'),
  
  type: z.enum(['local', 'certified']).default('local'),
  
  client_id: z.string().trim().optional(),
  
  // Contato
  email: z
    .string()
    .trim()
    .refine(val => emailRegex.test(val), 'Email deve ter um formato válido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  
  whatsapp: z
    .string()
    .trim()
    .transform(val => val.replace(/\D/g, '')) // Remove formatação
    .refine(val => !val || (val.length >= 10 && val.length <= 11), 'WhatsApp deve ter 10 ou 11 dígitos')
    .optional()
    .or(z.literal('')),
  
  phone: z
    .string()
    .trim()
    .optional()
    .transform(val => val ? val.replace(/\D/g, '') : undefined)
    .refine(val => !val || val.length === 10 || val.length === 11, 'Telefone deve ter 10 ou 11 dígitos')
    .refine(val => !val || /^[1-9]{2}9?[0-9]{8}$/.test(val), 'Telefone inválido'),
  
  website: z
    .string()
    .trim()
    .optional()
    .refine(val => !val || val.startsWith('http'), 'Website deve começar com http:// ou https://'),
  
  // Localização
  state: z
    .string()
    .trim()
    .min(2, 'Estado é obrigatório')
    .max(2, 'Código do estado deve ter 2 caracteres'),
  
  city: z
    .string()
    .trim()
    .min(2, 'Cidade é obrigatória')
    .max(100, 'Nome da cidade deve ter no máximo 100 caracteres'),
  
  address: z
    .string()
    .trim()
    .optional()
    .refine(val => !val || val.length <= 500, 'Endereço deve ter no máximo 500 caracteres'),
  
  // Especialidades
  specialties: z
    .array(z.string().trim().min(1))
    .min(1, 'Selecione pelo menos uma especialidade')
    .max(10, 'Máximo de 10 especialidades permitidas'),
  
  // Campos opcionais
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  
  // Dados Bancários (opcionais no cadastro inicial, mas necessários para split)
  bank_code: z
    .string()
    .trim()
    .regex(/^\d{3}$/, 'Código do banco deve ter 3 dígitos')
    .optional()
    .or(z.literal('')),
  
  bank_name: z
    .string()
    .trim()
    .max(100, 'Nome do banco muito longo')
    .optional()
    .or(z.literal('')),
  
  agency: z
    .string()
    .trim()
    .max(10, 'Agência deve ter no máximo 10 caracteres')
    .optional()
    .or(z.literal('')),
  
  agency_digit: z
    .string()
    .trim()
    .max(2, 'Dígito da agência inválido')
    .optional()
    .or(z.literal('')),
  
  account_number: z
    .string()
    .trim()
    .max(20, 'Número da conta deve ter no máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  
  account_digit: z
    .string()
    .trim()
    .max(2, 'Dígito da conta inválido')
    .optional()
    .or(z.literal('')),
  
  account_type: z
    .enum(['corrente', 'poupanca'])
    .optional(),
  
  account_holder_name: z
    .string()
    .trim()
    .max(150, 'Nome do titular muito longo')
    .optional()
    .or(z.literal('')),
  
  account_holder_document: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
  
  pix_key: z
    .string()
    .trim()
    .max(100, 'Chave PIX muito longa')
    .optional()
    .or(z.literal('')),
}).refine((data) => {
  // Validação condicional do documento baseado no tipo
  const normalized = normalizeDocument(data.document_number);
  
  if (data.document_type === 'cpf') {
    if (normalized.length !== 11) return false;
    return validateCPF(normalized);
  } else {
    if (normalized.length !== 14) return false;
    return validateCNPJ(normalized);
  }
}, {
  message: 'Documento inválido para o tipo selecionado',
  path: ['document_number'],
});

export type SupplierFormData = z.infer<typeof supplierFormSchema>;

// Schema para cada step individualmente
export const basicInfoSchema = supplierFormSchema.pick({
  name: true,
  document_type: true,
  document_number: true,
  type: true,
  client_id: true,
});

export const contactSchema = supplierFormSchema.pick({
  email: true,
  whatsapp: true,
  phone: true,
  website: true,
});

export const locationSchema = supplierFormSchema.pick({
  state: true,
  city: true,
  address: true,
});

export const specialtiesSchema = supplierFormSchema.pick({
  specialties: true,
});

export const bankDataSchema = supplierFormSchema.pick({
  bank_code: true,
  bank_name: true,
  agency: true,
  agency_digit: true,
  account_number: true,
  account_digit: true,
  account_type: true,
  account_holder_name: true,
  account_holder_document: true,
  pix_key: true,
});

export type BasicInfoData = z.infer<typeof basicInfoSchema>;
export type ContactData = z.infer<typeof contactSchema>;
export type LocationData = z.infer<typeof locationSchema>;
export type SpecialtiesData = z.infer<typeof specialtiesSchema>;
export type BankData = z.infer<typeof bankDataSchema>;