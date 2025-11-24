import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  validationFn?: (value: string) => Promise<boolean>;
  error?: string;
  icon?: React.ReactNode;
  debounceMs?: number;
  required?: boolean;
}

export function ValidatedInput({
  label,
  value,
  onValueChange,
  validationFn,
  error,
  icon,
  debounceMs = 500,
  required = false,
  className,
  ...props
}: ValidatedInputProps) {
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !validationFn) {
      setStatus('idle');
      setValidationMessage(null);
      return;
    }

    setStatus('validating');
    const timer = setTimeout(async () => {
      try {
        const isValid = await validationFn(value);
        setStatus(isValid ? 'valid' : 'invalid');
        setValidationMessage(isValid ? 'Válido e disponível' : 'Valor inválido ou já em uso');
      } catch (err) {
        setStatus('invalid');
        setValidationMessage('Erro ao validar');
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, validationFn, debounceMs]);

  const getStatusIcon = () => {
    switch (status) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    if (error) return 'border-destructive focus-visible:ring-destructive';
    switch (status) {
      case 'validating':
        return 'border-blue-300 focus-visible:ring-blue-300';
      case 'valid':
        return 'border-green-300 focus-visible:ring-green-300';
      case 'invalid':
        return 'border-red-300 focus-visible:ring-red-300';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={props.id} className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {icon}
          </div>
        )}
        <Input
          {...props}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            icon && 'pl-10',
            getStatusIcon() && 'pr-10',
            getStatusColor(),
            className
          )}
        />
        {getStatusIcon() && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getStatusIcon()}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          {error}
        </p>
      ) : validationMessage && status !== 'idle' ? (
        <p
          className={cn(
            'text-xs flex items-center gap-1',
            status === 'valid' && 'text-green-600',
            status === 'invalid' && 'text-red-600',
            status === 'validating' && 'text-blue-600'
          )}
        >
          {status === 'validating' ? <Clock className="h-3 w-3" /> : getStatusIcon()}
          {validationMessage}
        </p>
      ) : null}
    </div>
  );
}
