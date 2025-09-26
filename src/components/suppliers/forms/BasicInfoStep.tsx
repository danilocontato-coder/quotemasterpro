import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, AlertCircle } from 'lucide-react';
import { BasicInfoData } from './SupplierFormSchema';

interface BasicInfoStepProps {
  data: Partial<BasicInfoData>;
  errors: Partial<Record<keyof BasicInfoData, string>>;
  onChange: (field: keyof BasicInfoData, value: string) => void;
}

export function BasicInfoStep({ data, errors, onChange }: BasicInfoStepProps) {
  const formatCNPJ = (value: string) => {
    // Remove tudo que não for dígito
    const digits = value.replace(/\D/g, '');
    
    // Aplica a máscara do CNPJ
    if (digits.length <= 14) {
      return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    onChange('cnpj', formatted);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          Dados Básicos do Fornecedor
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Informe o nome e identificação da empresa
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nome da Empresa *
          </Label>
          <Input
            id="name"
            value={data.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Ex: Construções Silva Ltda"
            className={errors.name ? "border-destructive focus:border-destructive" : ""}
            maxLength={100}
          />
          {errors.name && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj" className="text-sm font-medium">
            CNPJ *
          </Label>
          <Input
            id="cnpj"
            value={data.cnpj || ''}
            onChange={handleCNPJChange}
            placeholder="00.000.000/0000-00"
            className={errors.cnpj ? "border-destructive focus:border-destructive" : ""}
            maxLength={18}
          />
          {errors.cnpj && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.cnpj}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Será usado para identificação única do fornecedor
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Informação importante</h4>
              <p className="text-xs text-blue-700 mt-1">
                Os dados básicos são essenciais para a identificação e cadastro do fornecedor. 
                Certifique-se de que o CNPJ está correto, pois será usado para verificar duplicatas.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}