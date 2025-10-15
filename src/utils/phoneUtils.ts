/**
 * Formata número de telefone brasileiro enquanto o usuário digita
 * @param value - Valor bruto do input
 * @returns Número formatado no padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhoneNumber(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11);
  
  // Formata progressivamente
  if (limited.length <= 2) {
    return limited;
  }
  if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }
  if (limited.length <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

/**
 * Normaliza telefone para formato internacional (+5511999990000)
 * @param phone - Telefone em qualquer formato
 * @returns Telefone normalizado com +55
 */
export function normalizePhoneForDB(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  
  // Se já tem código do país, retorna
  if (numbers.startsWith('55') && numbers.length >= 12) {
    return `+${numbers}`;
  }
  
  // Adiciona +55 (Brasil)
  return `+55${numbers}`;
}
