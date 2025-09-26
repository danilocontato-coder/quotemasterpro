import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building, AlertCircle, Loader2 } from 'lucide-react';
import { BasicInfoData } from './SupplierFormSchema';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExistingSupplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: any;
  specialties: string[];
  certification_status: string;
  status: string;
  state: string;
  city: string;
}

interface BasicInfoStepProps {
  data: Partial<BasicInfoData>;
  errors: Partial<Record<keyof BasicInfoData, string>>;
  onChange: (field: keyof BasicInfoData, value: string) => void;
  onSelectExistingSupplier?: (supplier: ExistingSupplier) => void;
}

export function BasicInfoStep({ data, errors, onChange, onSelectExistingSupplier }: BasicInfoStepProps) {
  const [existingSuppliers, setExistingSuppliers] = useState<ExistingSupplier[]>([]);
  const [showExistingOptions, setShowExistingOptions] = useState(false);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const { toast } = useToast();
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

  const searchSupplierByCNPJ = async (searchCnpj: string) => {
    const cleanCNPJ = searchCnpj.replace(/\D/g, '');
    if (!cleanCNPJ || cleanCNPJ.length < 14) return;
    
    setIsSearchingCNPJ(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('cnpj', cleanCNPJ);

      if (error) {
        console.error('Error searching supplier by CNPJ:', error);
        return;
      }

      if (data && data.length > 0) {
        setExistingSuppliers(data);
        setShowExistingOptions(true);
      } else {
        setExistingSuppliers([]);
        setShowExistingOptions(false);
      }
    } catch (error) {
      console.error('Error searching supplier by CNPJ:', error);
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    onChange('cnpj', formatted);
    
    // Buscar fornecedores existentes quando CNPJ estiver completo
    const cleanCNPJ = formatted.replace(/\D/g, '');
    if (cleanCNPJ.length === 14) {
      searchSupplierByCNPJ(cleanCNPJ);
    } else {
      setExistingSuppliers([]);
      setShowExistingOptions(false);
    }
  };

  const selectExistingSupplier = (supplier: ExistingSupplier) => {
    if (onSelectExistingSupplier) {
      onSelectExistingSupplier(supplier);
      setShowExistingOptions(false);
      toast({
        title: "Dados preenchidos como base",
        description: `Os dados de ${supplier.name} foram preenchidos. Uma nova cópia independente será criada para seu cliente. Você pode editá-los livremente.`,
      });
    }
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
          <div className="relative">
            <Input
              id="cnpj"
              value={data.cnpj || ''}
              onChange={handleCNPJChange}
              placeholder="00.000.000/0000-00"
              className={errors.cnpj ? "border-destructive focus:border-destructive" : ""}
              maxLength={18}
            />
            {isSearchingCNPJ && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
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

        {/* Mostrar fornecedores existentes com mesmo CNPJ */}
        {showExistingOptions && existingSuppliers.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Fornecedores encontrados com este CNPJ
              </CardTitle>
              <p className="text-xs text-orange-700">
                Encontramos fornecedor(es) com este CNPJ. Você pode usar os dados como base para criar um novo fornecedor para seu cliente. Uma cópia independente será criada - suas alterações não afetarão outros clientes.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {existingSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {supplier.email}
                        {supplier.certification_status === 'certified' && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Certificado
                          </span>
                        )}
                        {supplier.status === 'active' && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            Ativo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        ⚠️ Uma cópia será criada para seu cliente
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectExistingSupplier(supplier)}
                      className="ml-3"
                    >
                      Usar como Base
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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