/**
 * Formata o código de uma cotação para exibição consistente
 * Usa o local_code quando disponível (ex: RFQ01), caso contrário usa os primeiros 8 caracteres do UUID
 */
export function formatQuoteCode(quote: { id: string; local_code?: string | null }): string {
  if (quote.local_code) {
    return `#${quote.local_code}`;
  }
  
  // Fallback para UUID truncado
  return `#${quote.id.substring(0, 8)}`;
}

/**
 * Retorna apenas o código sem o prefixo #
 */
export function getQuoteCode(quote: { id: string; local_code?: string | null }): string {
  return quote.local_code || quote.id.substring(0, 8);
}
