import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, CheckCircle2, XCircle, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface CompanyData {
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  cnpj_formatado: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  atividade_principal?: {
    codigo: string;
    descricao: string;
  };
}

interface CNPJValidationInputProps {
  cnpj: string;
  onCNPJChange: (cnpj: string) => void;
  onValidated: (valid: boolean, company?: CompanyData) => void;
  disabled?: boolean;
  error?: string;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'error';

// Formatar CNPJ enquanto digita
const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

// Validar formato básico do CNPJ
const isValidCNPJFormat = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // Todos iguais
  
  // Validar dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits[12]) !== digit1) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(digits[13]) === digit2;
};

export const CNPJValidationInput: React.FC<CNPJValidationInputProps> = ({
  cnpj,
  onCNPJChange,
  onValidated,
  disabled = false,
  error
}) => {
  const [state, setState] = useState<ValidationState>('idle');
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    onCNPJChange(formatted);
    
    // Reset estado se mudar o CNPJ
    if (state !== 'idle') {
      setState('idle');
      setCompany(null);
      setValidationError(null);
      onValidated(false);
    }
  };

  const handleValidate = async () => {
    const digits = cnpj.replace(/\D/g, '');
    
    if (!isValidCNPJFormat(cnpj)) {
      setState('invalid');
      setValidationError('CNPJ inválido. Verifique os dígitos.');
      onValidated(false);
      return;
    }

    setState('validating');
    setValidationError(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-cnpj', {
        body: { cnpj: digits }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.valid) {
        setState('invalid');
        setValidationError(data?.error || 'CNPJ não está ativo na Receita Federal');
        setCompany(data?.company || null);
        onValidated(false);
        return;
      }

      setState('valid');
      setCompany(data.company);
      onValidated(true, data.company);
      toast.success(`CNPJ verificado: ${data.company.razao_social}`);
    } catch (err: any) {
      setState('error');
      setValidationError(err.message || 'Erro ao consultar CNPJ');
      onValidated(false);
      toast.error(err.message || 'Erro ao consultar CNPJ');
    }
  };

  const digits = cnpj.replace(/\D/g, '');
  const canValidate = digits.length === 14 && isValidCNPJFormat(cnpj);

  return (
    <div className="space-y-4">
      {/* Campo de CNPJ */}
      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="cnpj"
              type="text"
              value={cnpj}
              onChange={(e) => handleCNPJChange(e.target.value)}
              disabled={disabled || state === 'valid'}
              placeholder="00.000.000/0000-00"
              className={cn(
                "pr-10",
                state === 'valid' && "border-green-500 bg-green-50",
                (state === 'invalid' || error) && "border-destructive"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {state === 'valid' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : state === 'invalid' ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
          
          {state !== 'valid' && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleValidate}
              disabled={!canValidate || disabled || state === 'validating'}
            >
              {state === 'validating' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Validar</span>
            </Button>
          )}
        </div>
        
        {(error || validationError) && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {error || validationError}
          </p>
        )}
      </div>

      {/* Dados da empresa */}
      {company && (
        <div className={cn(
          "p-4 rounded-lg border",
          state === 'valid' ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-start gap-3">
            {state === 'valid' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground">
                  {company.nome_fantasia || company.razao_social}
                </h4>
                <Badge 
                  variant={state === 'valid' ? 'default' : 'destructive'}
                  className={state === 'valid' ? 'bg-green-600' : ''}
                >
                  {company.situacao_cadastral}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                <strong>Razão Social:</strong> {company.razao_social}
              </p>
              
              <p className="text-sm text-muted-foreground">
                <strong>CNPJ:</strong> {company.cnpj_formatado}
              </p>
              
              {company.atividade_principal && (
                <p className="text-sm text-muted-foreground">
                  <strong>Atividade:</strong> {company.atividade_principal.descricao}
                </p>
              )}
              
              {company.endereco && (
                <p className="text-sm text-muted-foreground">
                  <strong>Endereço:</strong> {company.endereco.logradouro}, {company.endereco.numero}
                  {company.endereco.complemento && ` - ${company.endereco.complemento}`}
                  {' - '}{company.endereco.bairro}, {company.endereco.municipio}/{company.endereco.uf}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botão para alterar CNPJ validado */}
      {state === 'valid' && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setState('idle');
            setCompany(null);
            onCNPJChange('');
            onValidated(false);
          }}
          className="w-full"
        >
          Alterar CNPJ
        </Button>
      )}
    </div>
  );
};
