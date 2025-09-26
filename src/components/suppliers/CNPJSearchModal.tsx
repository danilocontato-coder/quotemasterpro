import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  client_id: string;
  client_name: string;
}

interface CNPJSearchModalProps {
  cnpj: string;
  onCNPJChange: (cnpj: string) => void;
  onReuseData: (supplier: ExistingSupplier) => void;
}

export function CNPJSearchModal({ cnpj, onCNPJChange, onReuseData }: CNPJSearchModalProps) {
  const [existingSuppliers, setExistingSuppliers] = useState<ExistingSupplier[]>([]);
  const [showExistingOptions, setShowExistingOptions] = useState(false);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const { toast } = useToast();

  const searchSupplierByCNPJ = async (searchCnpj: string) => {
    if (!searchCnpj || searchCnpj.length < 14) return;
    
    setIsSearchingCNPJ(true);
    try {
      const { data, error } = await supabase.rpc('search_supplier_by_cnpj', {
        search_cnpj: searchCnpj
      });

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

  const handleCNPJChange = (value: string) => {
    const cleanCNPJ = value.replace(/\D/g, '');
    const formattedCNPJ = cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    
    onCNPJChange(formattedCNPJ);
    
    // Buscar fornecedores existentes quando CNPJ estiver completo
    if (cleanCNPJ.length === 14) {
      searchSupplierByCNPJ(cleanCNPJ);
    } else {
      setExistingSuppliers([]);
      setShowExistingOptions(false);
    }
  };

  const reuseSupplierData = (supplier: ExistingSupplier) => {
    onReuseData(supplier);
    setShowExistingOptions(false);
    
    toast({
      title: "Dados preenchidos",
      description: `Dados do fornecedor ${supplier.name} foram preenchidos. Você pode editá-los se necessário.`,
    });
  };

  return (
    <div>
      <div className="relative">
        <Input
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => handleCNPJChange(e.target.value)}
          maxLength={18}
        />
        {isSearchingCNPJ && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Mostrar fornecedores existentes com mesmo CNPJ */}
      {showExistingOptions && existingSuppliers.length > 0 && (
        <Card className="mt-4 border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Fornecedores encontrados com este CNPJ
            </CardTitle>
            <p className="text-xs text-orange-700">
              Você pode reutilizar os dados de um fornecedor existente ou continuar criando um novo.
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
                      {supplier.client_name && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          Cliente: {supplier.client_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reuseSupplierData(supplier)}
                    className="ml-3"
                  >
                    Reutilizar dados
                  </Button>
                </div>
              ))}
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExistingOptions(false)}
                  className="w-full text-muted-foreground"
                >
                  Continuar criando novo fornecedor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}