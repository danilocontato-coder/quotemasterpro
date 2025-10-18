import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CEPInputProps {
  value: string;
  onChange: (cep: string) => void;
  onAddressFound?: (address: {
    state: string;
    city: string;
    street?: string;
    neighborhood?: string;
  }) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export function CEPInput({
  value,
  onChange,
  onAddressFound,
  error,
  label = 'CEP',
  required = false,
}: CEPInputProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 8) {
      return digits.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    onChange(formatted);
    setSuccess(false);
  };

  const searchCEP = async () => {
    const cleanCEP = value.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          description: 'Verifique o CEP digitado e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Mapeamento de siglas de estados
      const stateMapping: Record<string, string> = {
        AC: 'Acre',
        AL: 'Alagoas',
        AP: 'Amapá',
        AM: 'Amazonas',
        BA: 'Bahia',
        CE: 'Ceará',
        DF: 'Distrito Federal',
        ES: 'Espírito Santo',
        GO: 'Goiás',
        MA: 'Maranhão',
        MT: 'Mato Grosso',
        MS: 'Mato Grosso do Sul',
        MG: 'Minas Gerais',
        PA: 'Pará',
        PB: 'Paraíba',
        PR: 'Paraná',
        PE: 'Pernambuco',
        PI: 'Piauí',
        RJ: 'Rio de Janeiro',
        RN: 'Rio Grande do Norte',
        RS: 'Rio Grande do Sul',
        RO: 'Rondônia',
        RR: 'Roraima',
        SC: 'Santa Catarina',
        SP: 'São Paulo',
        SE: 'Sergipe',
        TO: 'Tocantins',
      };

      const addressData = {
        state: stateMapping[data.uf] || data.uf,
        city: data.localidade,
        street: data.logradouro || undefined,
        neighborhood: data.bairro || undefined,
      };

      if (onAddressFound) {
        onAddressFound(addressData);
      }

      setSuccess(true);
      toast({
        title: 'CEP encontrado!',
        description: `${addressData.city} - ${addressData.state}`,
      });
    } catch (error) {
      console.error('Error searching CEP:', error);
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o endereço. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    const cleanCEP = value.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      searchCEP();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="cep" className="text-sm font-medium">
        <MapPin className="h-4 w-4 inline mr-1 text-muted-foreground" />
        {label}
        {required && ' *'}
      </Label>
      <div className="relative">
        <Input
          id="cep"
          value={value}
          onChange={handleCEPChange}
          onBlur={handleBlur}
          placeholder="00000-000"
          className={error ? 'border-destructive focus:border-destructive' : ''}
          maxLength={9}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {success && !loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="h-4 w-4 text-green-600" />
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
      {!error && (
        <p className="text-xs text-muted-foreground">
          O endereço será preenchido automaticamente
        </p>
      )}
    </div>
  );
}
