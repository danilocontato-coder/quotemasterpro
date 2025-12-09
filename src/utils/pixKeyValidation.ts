// Tipos de chave PIX suportados
export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';

// Lista de bancos brasileiros mais comuns
export const BRAZILIAN_BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '422', name: 'Safra' },
  { code: '745', name: 'Citibank' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '077', name: 'Banco Inter' },
  { code: '260', name: 'Nubank' },
  { code: '290', name: 'PagSeguro' },
  { code: '380', name: 'PicPay' },
  { code: '323', name: 'Mercado Pago' },
  { code: '212', name: 'Banco Original' },
  { code: '336', name: 'C6 Bank' },
  { code: '246', name: 'ABC Brasil' },
  { code: '652', name: 'Itaú BBA' },
  { code: '041', name: 'Banrisul' },
  { code: '070', name: 'BRB' },
  { code: '208', name: 'BTG Pactual' },
  { code: '136', name: 'Unicred' },
  { code: '389', name: 'Mercantil do Brasil' },
  { code: '634', name: 'Triângulo' },
  { code: '655', name: 'Votorantim' },
  { code: '707', name: 'Daycoval' },
  { code: '739', name: 'Cetelem' },
  { code: '743', name: 'Semear' },
  { code: '399', name: 'HSBC' },
  { code: '084', name: 'Uniprime' },
];

/**
 * Detecta o tipo de uma chave PIX baseado no formato
 */
export function detectPixKeyType(pixKey: string): PixKeyType | null {
  if (!pixKey || typeof pixKey !== 'string') return null;
  
  const cleanKey = pixKey.trim();
  
  // CPF: 11 dígitos ou formatado 000.000.000-00
  const cpfClean = cleanKey.replace(/\D/g, '');
  if (cpfClean.length === 11 && /^\d{11}$/.test(cpfClean)) {
    return 'cpf';
  }
  
  // CNPJ: 14 dígitos ou formatado 00.000.000/0001-00
  if (cpfClean.length === 14 && /^\d{14}$/.test(cpfClean)) {
    return 'cnpj';
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey)) {
    return 'email';
  }
  
  // Telefone: +55 seguido de 10-11 dígitos ou formato nacional
  const phoneClean = cleanKey.replace(/\D/g, '');
  if (phoneClean.length >= 10 && phoneClean.length <= 13) {
    // Aceita formatos: 11999999999, 5511999999999, +5511999999999
    if (/^(?:55)?[1-9]{2}9?\d{8}$/.test(phoneClean)) {
      return 'phone';
    }
  }
  
  // EVP (Chave aleatória): UUID v4 com 32 caracteres hex + hífens
  // Formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey)) {
    return 'evp';
  }
  
  return null;
}

/**
 * Valida se uma chave PIX é válida
 */
export function validatePixKey(pixKey: string): { valid: boolean; type: PixKeyType | null; message?: string } {
  if (!pixKey || pixKey.trim() === '') {
    return { valid: false, type: null, message: 'Chave PIX é obrigatória' };
  }
  
  const type = detectPixKeyType(pixKey);
  
  if (!type) {
    return { 
      valid: false, 
      type: null, 
      message: 'Formato de chave PIX inválido. Use CPF, CNPJ, e-mail, celular ou chave aleatória.' 
    };
  }
  
  return { valid: true, type };
}

/**
 * Formata a chave PIX para exibição baseado no tipo
 */
export function formatPixKeyDisplay(pixKey: string, type: PixKeyType | null): string {
  if (!pixKey || !type) return pixKey;
  
  const clean = pixKey.replace(/\D/g, '');
  
  switch (type) {
    case 'cpf':
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    case 'cnpj':
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    case 'phone':
      // Normaliza para formato +55
      const normalized = clean.startsWith('55') ? clean : `55${clean}`;
      return `+${normalized.slice(0, 2)} (${normalized.slice(2, 4)}) ${normalized.slice(4, 9)}-${normalized.slice(9)}`;
    default:
      return pixKey;
  }
}

/**
 * Retorna o label amigável do tipo de chave PIX
 */
export function getPixKeyTypeLabel(type: PixKeyType | null): string {
  switch (type) {
    case 'cpf': return 'CPF';
    case 'cnpj': return 'CNPJ';
    case 'email': return 'E-mail';
    case 'phone': return 'Celular';
    case 'evp': return 'Chave Aleatória';
    default: return 'Desconhecido';
  }
}

/**
 * Formata e mascara parcialmente a chave PIX para exibição segura
 */
export function maskPixKeyDisplay(pixKey: string, type: PixKeyType | null): string {
  if (!pixKey || !type) return pixKey;
  
  switch (type) {
    case 'cpf': {
      const clean = pixKey.replace(/\D/g, '');
      if (clean.length !== 11) return pixKey;
      return `${clean.slice(0, 3)}.***.***-${clean.slice(9, 11)}`;
    }
    case 'cnpj': {
      const clean = pixKey.replace(/\D/g, '');
      if (clean.length !== 14) return pixKey;
      return `${clean.slice(0, 2)}.***.***/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
    }
    case 'email': {
      const [local, domain] = pixKey.split('@');
      if (!domain) return pixKey;
      const visibleChars = Math.min(2, local.length);
      const masked = local.slice(0, visibleChars) + '***';
      return `${masked}@${domain}`;
    }
    case 'phone': {
      const clean = pixKey.replace(/\D/g, '');
      const normalized = clean.startsWith('55') ? clean : `55${clean}`;
      if (normalized.length < 12) return pixKey;
      return `+${normalized.slice(0, 2)} (${normalized.slice(2, 4)}) *****-${normalized.slice(-4)}`;
    }
    case 'evp': {
      if (pixKey.length < 36) return pixKey;
      return `${pixKey.slice(0, 4)}****-****-****-****-********${pixKey.slice(-4)}`;
    }
    default:
      return pixKey;
  }
}
