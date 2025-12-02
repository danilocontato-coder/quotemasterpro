import { z } from 'zod';
import { validateCPF, validateCNPJ, normalizeDocument } from '@/utils/documentValidation';
import { detectPixKeyType } from '@/utils/pixKeyValidation';

// Validação de CEP (com ou sem formatação)
const cepRegex = /^\d{5}-?\d{3}$/;

export const supplierRegistrationSchema = z.object({
  // Tipo de documento
  document_type: z.union([z.literal('cpf'), z.literal('cnpj')]).default('cnpj'),
  
  // Documento (validação condicional será feita no refine final)
  document_number: z.string()
    .min(1, 'Documento é obrigatório'),
  
  // WhatsApp obrigatório (apenas celular brasileiro)
  whatsapp: z.string()
    .min(1, 'WhatsApp é obrigatório')
    .transform(val => val.replace(/\D/g, '')) // Remove formatação
    .refine(val => val.length === 11, 
      'WhatsApp deve ter 11 dígitos (celular)')
    .refine(val => /^[1-9]{2}9[0-9]{8}$/.test(val), 
      'WhatsApp inválido. Deve ser um celular brasileiro no formato (XX) 9XXXX-XXXX'),
  
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
  
  // Website opcional com normalização automática
  website: z.string()
    .optional()
    .transform(val => {
      // Tratar string vazia como undefined
      if (!val || val.trim() === '') return undefined;
      
      const trimmed = val.trim();
      
      // Se não tem protocolo, adicionar https://
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`;
      }
      
      return trimmed;
    })
    .refine(
      (val) => {
        if (!val) return true; // undefined é válido (campo opcional)
        
        // Validar se é uma URL real
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      'URL inválida. Use um formato válido como empresa.com.br'
    ),
  
  // Descrição opcional
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),

  // === DADOS BANCÁRIOS (obrigatório: PIX ou conta bancária) ===
  
  // Tipo de recebimento escolhido
  payment_method: z.enum(['pix', 'bank_account']).default('pix'),
  
  // Chave PIX (obrigatória se payment_method = 'pix')
  pix_key: z.string().max(100, 'Chave PIX muito longa').optional(),
  
  // Dados bancários (obrigatórios se payment_method = 'bank_account')
  bank_code: z.string().regex(/^\d{3}$/, 'Código do banco deve ter 3 dígitos').optional(),
  bank_name: z.string().max(100).optional(),
  agency: z.string().max(10, 'Agência muito longa').optional(),
  agency_digit: z.string().max(2).optional(),
  account_number: z.string().max(20, 'Número da conta muito longo').optional(),
  account_digit: z.string().max(2).optional(),
  account_type: z.enum(['corrente', 'poupanca']).optional(),
  account_holder_name: z.string().max(150).optional(),
  account_holder_document: z.string().optional(),

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
}).refine((data) => {
  // Validação: pelo menos PIX ou dados bancários completos
  if (data.payment_method === 'pix') {
    // Se escolheu PIX, deve ter chave PIX válida
    if (!data.pix_key || data.pix_key.trim() === '') {
      return false;
    }
    // Validar formato da chave PIX
    const pixType = detectPixKeyType(data.pix_key);
    return pixType !== null;
  } else {
    // Se escolheu conta bancária, deve ter todos os campos obrigatórios
    return !!(
      data.bank_code &&
      data.agency &&
      data.account_number &&
      data.account_holder_name &&
      data.account_holder_document
    );
  }
}, {
  message: 'Informe uma chave PIX válida ou dados bancários completos',
  path: ['pix_key'],
});

export type SupplierRegistrationData = z.infer<typeof supplierRegistrationSchema>;
