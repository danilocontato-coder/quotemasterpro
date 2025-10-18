import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, AlertCircle, Loader2, FileText, User } from 'lucide-react';
import { BasicInfoData } from './SupplierFormSchema';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDocument, normalizeDocument, getDocumentPlaceholder } from '@/utils/documentValidation';

interface ExistingSupplier {
  id: string;
  name: string;
  document_type: string;
  document_number: string;
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
  const [isSearching, setIsSearching] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string; cnpj: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const documentType = (data.document_type as 'cpf' | 'cnpj') || 'cnpj';
  const isAdmin = user?.role === 'admin';
  const supplierType = data.type || 'local';

  // Buscar clientes quando admin e tipo for local
  useEffect(() => {
    if (isAdmin && supplierType === 'local') {
      fetchClients();
    }
  }, [isAdmin, supplierType]);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, name, cnpj')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a lista de clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const searchSupplierByDocument = async (searchDoc: string, docType: 'cpf' | 'cnpj') => {
    const cleanDoc = normalizeDocument(searchDoc);
    const expectedLength = docType === 'cpf' ? 11 : 14;
    if (!cleanDoc || cleanDoc.length < expectedLength) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('document_type', docType)
        .eq('document_number', cleanDoc);

      if (error) {
        console.error('Error searching supplier:', error);
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
      console.error('Error searching supplier:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value, documentType);
    onChange('document_number', formatted);
    
    // Buscar fornecedores existentes quando documento estiver completo
    const cleanDoc = normalizeDocument(formatted);
    const expectedLength = documentType === 'cpf' ? 11 : 14;
    if (cleanDoc.length === expectedLength) {
      searchSupplierByDocument(cleanDoc, documentType);
    } else {
      setExistingSuppliers([]);
      setShowExistingOptions(false);
    }
  };

  const handleDocumentTypeChange = (value: string) => {
    onChange('document_type', value);
    onChange('document_number', ''); // Limpar documento ao trocar tipo
    setExistingSuppliers([]);
    setShowExistingOptions(false);
  };

  const selectExistingSupplier = (supplier: ExistingSupplier) => {
    if (onSelectExistingSupplier) {
      onSelectExistingSupplier(supplier);
      setShowExistingOptions(false);
      toast({
        title: "Fornecedor selecionado",
        description: `${supplier.name} será associado ao seu cliente. Você pode revisar os dados antes de confirmar.`,
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

        {/* Seleção de Cliente (apenas para admin criando fornecedor local) */}
        {isAdmin && supplierType === 'local' && (
          <div className="space-y-2">
            <Label htmlFor="client_id" className="text-sm font-medium">
              Cliente Vinculado *
            </Label>
            <Select
              value={data.client_id || ''}
              onValueChange={(value) => onChange('client_id', value)}
            >
              <SelectTrigger className={errors.client_id ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione o cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.cnpj && `(${client.cnpj})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.client_id}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Fornecedores locais devem estar vinculados a um cliente específico
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Documento *</Label>
          <RadioGroup 
            value={documentType} 
            onValueChange={handleDocumentTypeChange}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cnpj" id="doc-cnpj" />
              <Label htmlFor="doc-cnpj" className="cursor-pointer flex items-center gap-1 font-normal">
                <Building className="h-3.5 w-3.5" />
                CNPJ (Empresa)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cpf" id="doc-cpf" />
              <Label htmlFor="doc-cpf" className="cursor-pointer flex items-center gap-1 font-normal">
                <User className="h-3.5 w-3.5" />
                CPF (Pessoa Física)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document" className="text-sm font-medium">
            {documentType === 'cpf' ? 'CPF *' : 'CNPJ *'}
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              {documentType === 'cpf' ? <User className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
            </div>
            <Input
              id="document"
              value={data.document_number || ''}
              onChange={handleDocumentChange}
              placeholder={getDocumentPlaceholder(documentType)}
              className={`pl-10 ${errors.document_number ? "border-destructive focus:border-destructive" : ""}`}
              maxLength={documentType === 'cpf' ? 14 : 18}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {errors.document_number && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.document_number}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {documentType === 'cpf' 
              ? 'Será usado para identificação única do prestador de serviço'
              : 'Será usado para identificação única da empresa'
            }
          </p>
        </div>

        {/* Mostrar fornecedores existentes com mesmo documento */}
        {showExistingOptions && existingSuppliers.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Fornecedores encontrados com este {documentType === 'cpf' ? 'CPF' : 'CNPJ'}
              </CardTitle>
              <p className="text-xs text-orange-700">
                Encontramos fornecedor(es) com este documento. Você pode associá-lo ao seu cliente sem criar duplicatas.
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
                      <div className="text-xs text-green-600 mt-1 font-medium">
                        ✅ Será associado ao seu cliente (sem duplicatas)
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectExistingSupplier(supplier)}
                      className="ml-3"
                    >
                      Associar ao Cliente
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
                Certifique-se de que o documento está correto, pois será usado para verificar duplicatas e evitar cadastros duplicados.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}