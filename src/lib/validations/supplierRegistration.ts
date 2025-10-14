import { z } from 'zod';
import { validateCPF, validateCNPJ, normalizeDocument } from '@/utils/documentValidation';

// Validação de telefone brasileiro (com ou sem formatação)
const phoneRegex = /^(\(\d{2}\)\s?)?\d{4,5}-?\d{4}$/;

// Validação de CEP (com ou sem formatação)
const cepRegex = /^\d{5}-?\d{3}$/;

export const supplierRegistrationSchema = z.object({
  // Tipo de documento
  document_type: z.union([z.literal('cpf'), z.literal('cnpj')]).default('cnpj'),
  
  // Documento validado condicionalmente
  document_number: z.string()
    .min(1, 'Documento é obrigatório')
    .refine((val) => {
      const normalized = normalizeDocument(val);
      return normalized.length >= 11;
    }, 'Documento inválido'),
  
  // WhatsApp obrigatório
  whatsapp: z.string()
    .min(1, 'WhatsApp é obrigatório')
    .refine((val) => phoneRegex.test(val), 'WhatsApp deve estar no formato (XX) XXXXX-XXXX'),
  
  // Endereço completo
  cep: z.string()
    .min(1, 'CEP é obrigatório')
    .refine((val) => cepRegex.test(val), 'CEP deve estar no formato 00000-000'),
  
  street: z.string().min(3, 'Logradouro é obrigatório'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string()
    .length(2, 'UF deve ter 2 caracteres')
    .toUpperCase(),
  
  // Especialidades (pelo menos uma)
  specialties: z.array(z.string())
    .min(1, 'Selecione ao menos uma especialidade')
    .max(10, 'Máximo de 10 especialidades'),
  
  // Website opcional
  website: z.string()
    .optional()
    .refine((val) => !val || val.startsWith('http'), 'Website deve começar com http:// ou https://'),
  
  // Descrição opcional
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
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

export type SupplierRegistrationData = z.infer<typeof supplierRegistrationSchema>;
