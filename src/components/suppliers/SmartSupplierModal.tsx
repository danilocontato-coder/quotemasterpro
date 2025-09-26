import React, { useState } from 'react';
import { AlertTriangle, Building, CheckCircle, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupplierAssociation } from '@/hooks/useSupplierAssociation';


interface SmartSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SmartSupplierModal({ isOpen, onClose, onSuccess }: SmartSupplierModalProps) {
  const [cnpj, setCNPJ] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [specialties, setSpecialties] = useState('');
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [step, setStep] = useState<'search' | 'found' | 'create'>('search');

  const { 
    searchSupplierByCNPJ, 
    findOrCreateSupplier, 
    associateSupplierToClient,
    isLoading 
  } = useSupplierAssociation();

  const handleCNPJSearch = async (searchCnpj: string) => {
    if (!searchCnpj || searchCnpj.length < 14) {
      setSearchResults([]);
      setStep('search');
      return;
    }
    
    try {
      const results = await searchSupplierByCNPJ(searchCnpj);
      setSearchResults(results);
      
      if (results.length > 0) {
        setStep('found');
        // Auto-preencher campos do primeiro resultado
        const firstResult = results[0];
        setName(firstResult.name);
        setEmail(firstResult.email);
        setPhone(firstResult.phone || '');
        setWhatsapp(firstResult.whatsapp || '');
        setWebsite(firstResult.website || '');
        setSpecialties(firstResult.specialties?.join(', ') || '');
      } else {
        setStep('create');
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      setStep('create');
    }
  };

  const handleCNPJChange = (value: string) => {
    const cleanCNPJ = value.replace(/\D/g, '');
    const formattedCNPJ = cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    setCNPJ(formattedCNPJ);
    
    if (cleanCNPJ.length === 14) {
      handleCNPJSearch(cleanCNPJ);
    } else {
      setSearchResults([]);
      setStep('search');
    }
  };

  const handleUseExisting = async (supplier: any) => {
    if (supplier.is_associated) {
      // Já está associado
      return;
    }

    // Associar diretamente ao cliente
    try {
      await associateSupplierToClient(supplier.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao associar fornecedor:', error);
    }
  };

  const handleCreateNew = async () => {
    if (!name || !cnpj) return;

    try {
      const result = await findOrCreateSupplier(cnpj, name, email, phone);
      await associateSupplierToClient(result.supplier_id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
    }
  };

  const resetForm = () => {
    setCNPJ('');
    setName('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setWebsite('');
    setSpecialties('');
    setSearchResults([]);
    setStep('search');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {step === 'create' ? 'Novo Fornecedor' : 'Buscar/Associar Fornecedor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Campo CNPJ sempre visível */}
            <div>
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                maxLength={18}
              />
            </div>

            {/* Resultados da busca */}
            {step === 'found' && searchResults.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Fornecedor encontrado no sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {searchResults.map((supplier) => (
                    <div key={supplier.id} className="bg-white p-4 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{supplier.name}</h4>
                            <Badge variant={supplier.certification_status === 'certified' ? 'default' : 'outline'}>
                              {supplier.certification_status === 'certified' ? 'Certificado' : 'Não Certificado'}
                            </Badge>
                            {supplier.is_associated && (
                              <Badge variant="secondary">Já Associado</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>{supplier.email}</p>
                            {supplier.phone && <p>Tel: {supplier.phone}</p>}
                            {supplier.specialties && supplier.specialties.length > 0 && (
                              <p>Especialidades: {supplier.specialties.join(', ')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {!supplier.is_associated && (
                            <Button
                              size="sm"
                              onClick={() => handleUseExisting(supplier)}
                              disabled={isLoading}
                            >
                              Associar
                            </Button>
                          )}
                          {supplier.is_associated && (
                            <Badge variant="secondary" className="text-xs">
                              Já em sua base
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                    </div>
                  ))}
                  
                  <div className="pt-3 border-t">
                    <Button
                      variant="ghost"
                      onClick={() => setStep('create')}
                      className="w-full text-muted-foreground"
                    >
                      Criar novo fornecedor com este CNPJ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formulário de criação */}
            {(step === 'create' || step === 'search') && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome/Razão Social *</Label>
                    <Input
                      id="name"
                      placeholder="Nome do fornecedor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@fornecedor.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      placeholder="(00) 00000-0000"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://www.fornecedor.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="specialties">Especialidades</Label>
                  <Textarea
                    id="specialties"
                    placeholder="Ex: Materiais elétricos, Hidráulica, Pintura..."
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Botões de ação */}
            {step === 'create' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateNew}
                  disabled={!name || !cnpj || !email || isLoading}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar e Associar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}