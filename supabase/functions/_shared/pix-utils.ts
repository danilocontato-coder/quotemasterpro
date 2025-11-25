/**
 * Detecta o tipo de chave PIX baseado no formato
 */
export function detectPixKeyType(pixKey: string): 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP' {
  const cleanKey = pixKey.replace(/[^\w@.+-]/g, '');
  
  // CPF: 11 dígitos
  if (/^\d{11}$/.test(cleanKey)) {
    return 'CPF';
  }
  
  // CNPJ: 14 dígitos
  if (/^\d{14}$/.test(cleanKey)) {
    return 'CNPJ';
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey)) {
    return 'EMAIL';
  }
  
  // Telefone: +5511999999999 ou 11999999999
  if (/^(\+55)?\d{10,11}$/.test(cleanKey)) {
    return 'PHONE';
  }
  
  // EVP (chave aleatória): formato UUID
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cleanKey)) {
    return 'EVP';
  }
  
  // Default para EVP se não identificar
  return 'EVP';
}

/**
 * Valida se uma chave PIX tem formato válido
 */
export function isValidPixKey(pixKey: string): boolean {
  if (!pixKey || pixKey.trim().length === 0) {
    return false;
  }
  
  const type = detectPixKeyType(pixKey);
  return type !== null;
}

/**
 * Formata chave PIX para exibição
 */
export function formatPixKey(pixKey: string): string {
  const type = detectPixKeyType(pixKey);
  const cleanKey = pixKey.replace(/[^\w@.+-]/g, '');
  
  switch (type) {
    case 'CPF':
      return cleanKey.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    case 'CNPJ':
      return cleanKey.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    case 'PHONE':
      const phone = cleanKey.replace(/^\+55/, '');
      if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    default:
      return pixKey;
  }
}
