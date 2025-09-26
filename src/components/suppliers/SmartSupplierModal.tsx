import React, { useState } from 'react';
import { CheckCircle, Search, Building2, Plus, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSupplierAssociation } from '@/hooks/useSupplierAssociation';
import { InactiveSupplierModal } from './InactiveSupplierModal';

interface SmartSupplierModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SmartSupplierModal({ isOpen, onOpenChange, onSuccess }: SmartSupplierModalProps) {
  const { toast } = useToast();
  const { 
    findSupplierByCNPJ, 
    createNewSupplier, 
    associateSupplierToClient, 
    isLoading 
  } = useSupplierAssociation();

  const [step, setStep] = useState<'search' | 'create' | 'found' | 'inactive'>('search');
  const [foundSupplier, setFoundSupplier] = useState<any>(null);
  const [searchCnpj, setSearchCnpj] = useState('');
  const [inactiveSupplierData, setInactiveSupplierData] = useState<any>(null);

  const resetModal = () => {
    setStep('search');
    setFoundSupplier(null);
    setSearchCnpj('');
    setInactiveSupplierData(null);
  };

  const handleCNPJSearch = async (cnpj: string) => {
    if (!cnpj.trim()) return;

    try {
      setSearchCnpj(cnpj);
      const supplier = await findSupplierByCNPJ(cnpj);
      
      if (supplier) {
        setFoundSupplier(supplier);
        
        
        if (supplier.association_status === 'associated') {
          toast({
            title: "Fornecedor já associado",
            description: `O fornecedor ${supplier.name} já está associado ao seu cliente.`,
            variant: "default"
          });
          return;
        }
        
        // Verificar se fornecedor está ativo
        if (supplier.status !== 'active') {
          setInactiveSupplierData({
            supplier_name: supplier.name,
            supplier_cnpj: supplier.cnpj,
            supplier_email: supplier.email,
            supplier_status: supplier.status
          });
          setStep('inactive');
          return;
        }
        
        setStep('found');
      } else {
        // Não encontrou fornecedor, ir para tela de criação
        setStep('create');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar o fornecedor.",
        variant: "destructive"
      });
    }
  };

  const handleAssociateSupplier = async () => {
    if (!foundSupplier) return;
    
    try {
      await associateSupplierToClient(foundSupplier.id);
      onSuccess?.();
      onOpenChange(false);
      resetModal();
    } catch (error: any) {
      console.error('Erro ao associar fornecedor:', error);
      
      if (error.code === 'SUPPLIER_INACTIVE') {
        // Mostrar modal de fornecedor inativo
        setInactiveSupplierData(error.supplierData);
        setStep('inactive');
      }
    }
  };

  const handleCreateSupplier = async (supplierData: any) => {
    try {
      // Usar o CNPJ da busca se não foi fornecido
      const cnpjToUse = supplierData.cnpj || searchCnpj;
      
      const result = await createNewSupplier({
        cnpj: cnpjToUse,
        name: supplierData.name,
        email: supplierData.email,
        phone: supplierData.phone
      });
      
      if (result.supplier_id) {
        // Associar o fornecedor ao cliente atual
        await associateSupplierToClient(result.supplier_id);
        
        toast({
          title: result.is_new ? "Fornecedor criado e associado" : "Fornecedor associado",
          description: `${supplierData.name} foi ${result.is_new ? 'criado e ' : ''}associado com sucesso.`,
          variant: "default"
        });
        
        onSuccess?.();
        onOpenChange(false);
        resetModal();
      }
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {step === 'create' ? 'Criar Novo Fornecedor' : step === 'inactive' ? 'Fornecedor Inativo' : 'Buscar Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <CNPJSearch onSearch={handleCNPJSearch} isLoading={isLoading} />
        )}

        {step === 'found' && foundSupplier && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Fornecedor Encontrado!</h3>
              <p className="text-sm text-muted-foreground">
                Já existe um fornecedor cadastrado com este CNPJ. Deseja associá-lo ao seu cliente?
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="space-y-2">
                <p><span className="font-medium">Nome:</span> {foundSupplier.name}</p>
                <p><span className="font-medium">CNPJ:</span> {foundSupplier.cnpj}</p>
                <p><span className="font-medium">Email:</span> {foundSupplier.email}</p>
                <p><span className="font-medium">Status:</span> 
                  <Badge variant={foundSupplier.certification_status === 'certified' ? 'default' : 'outline'} className="ml-2">
                    {foundSupplier.certification_status === 'certified' ? 'Certificado' : 'Não Certificado'}
                  </Badge>
                  <Badge variant={foundSupplier.status === 'active' ? 'default' : 'destructive'} className="ml-2">
                    {foundSupplier.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('search')} 
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleAssociateSupplier} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Associando...' : 'Associar Fornecedor'}
              </Button>
            </div>
          </div>
        )}

        {step === 'create' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Plus className="h-12 w-12 text-blue-500 mx-auto" />
              <h3 className="text-lg font-semibold">Criar Novo Fornecedor</h3>
              <p className="text-sm text-muted-foreground">
                Nenhum fornecedor foi encontrado com este CNPJ. Preencha os dados para criar um novo.
              </p>
            </div>
            
            <SupplierForm 
              onSubmit={handleCreateSupplier}
              onCancel={() => setStep('search')}
              isLoading={isLoading}
              defaultCnpj={searchCnpj}
            />
          </div>
        )}
        
        {/* Modal de fornecedor inativo */}
        <InactiveSupplierModal
          isOpen={step === 'inactive'}
          onOpenChange={(open) => {
            if (!open) {
              setStep('search');
              setInactiveSupplierData(null);
            }
          }}
          supplierData={inactiveSupplierData}
          onRequestReactivation={() => {
            // TODO: Implementar solicitação de reativação
            toast({
              title: "Solicitação enviada",
              description: "Sua solicitação de reativação foi enviada para análise.",
            });
            onOpenChange(false);
            resetModal();
          }}
          onContactSupport={() => {
            // TODO: Implementar contato com suporte
            toast({
              title: "Redirecionando",
              description: "Você será redirecionado para o suporte.",
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CNPJSearchProps {
  onSearch: (cnpj: string) => void;
  isLoading: boolean;
}

function CNPJSearch({ onSearch, isLoading }: CNPJSearchProps) {
  const [cnpj, setCNPJ] = useState('');

  const handleCNPJChange = (value: string) => {
    const cleanCNPJ = value.replace(/\D/g, '');
    const formattedCNPJ = cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    setCNPJ(formattedCNPJ);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length === 14) {
      onSearch(cleanCNPJ);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center space-y-2">
        <Search className="h-12 w-12 text-blue-500 mx-auto" />
        <h3 className="text-lg font-semibold">Buscar Fornecedor</h3>
        <p className="text-sm text-muted-foreground">
          Digite o CNPJ para verificar se o fornecedor já existe no sistema
        </p>
      </div>
      
      <div>
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => handleCNPJChange(e.target.value)}
          maxLength={18}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={cnpj.replace(/\D/g, '').length !== 14 || isLoading}
      >
        {isLoading ? 'Buscando...' : 'Buscar Fornecedor'}
      </Button>
    </form>
  );
}

interface SupplierFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultCnpj?: string;
}

function SupplierForm({ onSubmit, onCancel, isLoading, defaultCnpj }: SupplierFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    cnpj: defaultCnpj || '',
    email: '',
    phone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome/Razão Social *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
      </div>
      
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={!formData.name || !formData.email || isLoading}
          className="flex-1"
        >
          {isLoading ? 'Criando...' : 'Criar Fornecedor'}
        </Button>
      </div>
    </form>
  );
}