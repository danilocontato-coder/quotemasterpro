import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { useCurrency } from '@/hooks/useCurrency';

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "0,00",
  required = false,
  id,
  disabled = false
}) => {
  const { symbol } = useCurrency();
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Format the initial value
    if (value > 0) {
      setDisplayValue(formatNumberToBR(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const formatNumberToBR = (num: number): string => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseFromBR = (str: string): number => {
    if (!str) return 0;
    // Remove symbols and normalize
    const cleanStr = str
      .replace(/[^\d,.]/g, '') // Keep only digits, comma and dot
      .replace(/\./g, '') // Remove thousands separators (dots)
      .replace(',', '.'); // Convert decimal comma to dot
    
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only numbers, comma, and dot
    const cleanValue = inputValue.replace(/[^\d,.]/g, '');
    
    // Don't limit decimals during typing, only on blur
    setDisplayValue(cleanValue);
    
    // Parse and notify parent component
    const numericValue = parseFromBR(cleanValue);
    onChange(numericValue);
  };

  const handleBlur = () => {
    // Format the display value on blur
    if (displayValue) {
      const numericValue = parseFromBR(displayValue);
      if (numericValue > 0) {
        setDisplayValue(formatNumberToBR(numericValue));
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && '*'}
        <span className="text-sm text-muted-foreground ml-1">({symbol})</span>
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          {symbol}
        </span>
        <Input
          id={id}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-12"
        />
      </div>
    </div>
  );
};