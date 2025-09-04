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
  const { symbol, parseCurrencyInput } = useCurrency();
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Format the initial value
    if (value > 0) {
      setDisplayValue(value.toFixed(2).replace('.', ','));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only numbers, comma, and dot
    const cleanValue = inputValue.replace(/[^\d,.]/g, '');
    
    setDisplayValue(cleanValue);
    
    // Parse and notify parent component
    const numericValue = parseCurrencyInput(cleanValue);
    onChange(numericValue);
  };

  const handleBlur = () => {
    // Format the display value on blur
    if (displayValue) {
      const numericValue = parseCurrencyInput(displayValue);
      if (numericValue > 0) {
        setDisplayValue(numericValue.toFixed(2).replace('.', ','));
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