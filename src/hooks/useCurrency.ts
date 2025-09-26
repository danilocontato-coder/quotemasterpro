import { useSupabaseSettings } from './useSupabaseSettings';

interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

const currencyMap: Record<string, CurrencyInfo> = {
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real',
    locale: 'pt-BR'
  },
  USD: {
    code: 'USD', 
    symbol: '$',
    name: 'Dólar',
    locale: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'pt-BR' // Keep Portuguese locale for formatting
  }
};

export const useCurrency = () => {
  const { settings } = useSupabaseSettings();
  
  const currency = settings?.preferences?.currency || 'BRL';
  const currencyInfo = currencyMap[currency] || currencyMap.BRL;
  
  const formatCurrency = (value: number | null | undefined): string => {
    // Handle null, undefined, or NaN values
    if (value === null || value === undefined || isNaN(value)) {
      return currencyInfo.symbol + ' 0,00';
    }
    
    return value.toLocaleString(currencyInfo.locale, {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatCurrencyInput = (value: string): string => {
    // Remove all non-numeric characters except comma and dot
    const cleanValue = value.replace(/[^\d,.-]/g, '');
    
    // Convert comma to dot for proper number parsing
    const normalizedValue = cleanValue.replace(',', '.');
    
    const numericValue = parseFloat(normalizedValue);
    
    if (isNaN(numericValue)) return '';
    
    return formatCurrency(numericValue);
  };

  const parseCurrencyInput = (value: string): number => {
    // Remove currency symbols and normalize
    const cleanValue = value
      .replace(/[^\d,.-]/g, '') // Remove currency symbols
      .replace(',', '.'); // Convert comma to dot
    
    const numericValue = parseFloat(cleanValue);
    return isNaN(numericValue) ? 0 : numericValue;
  };

  return {
    currency: currencyInfo.code,
    symbol: currencyInfo.symbol,
    name: currencyInfo.name,
    locale: currencyInfo.locale,
    formatCurrency,
    formatCurrencyInput,
    parseCurrencyInput
  };
};