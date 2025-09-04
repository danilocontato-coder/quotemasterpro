import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, X, MessageCircle, Building, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSupabaseAdminSuppliers } from '@/hooks/useSupabaseAdminSuppliers';
import { Supplier } from '@/hooks/useSupabaseSuppliers';

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreateSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating' | 'completed_orders'>) => Promise<any>;
}

const regions = [
  'Norte',
  'Nordeste', 
  'Centro-Oeste',
  'Sudeste',
  'Sul'
];

const supplierTypes = [
  { value: 'local', label: 'Local', description: 'Fornecedor vinculado a um cliente' },
  { value: 'certified', label: 'Certificado', description: 'Fornecedor certificado pela plataforma (global)' }
];

const commonSpecialties = [
  'Materiais de Construção',
  'Produtos de Limpeza', 
  'Elétrica e Iluminação',
  'Ferramentas',
  'Jardinagem',
  'Serviços',
  'Manutenção',
  'Segurança',
  'Alimentação',
  'Móveis e Decoração'
];

export function CreateSupplierModal({ open, onClose, onCreateSupplier }: CreateSupplierModalProps) {
  const { createSupplierWithUser } = useSupabaseAdminSuppliers();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: null as any,
    business_info: {},
    specialties: [] as string[],
    type: 'local' as const,
    region: '',
    status: 'active' as const,
    subscription_plan_id: 'plan-basic',
    client_id: null
  });

  const [credentials] = useState({
    username: '',
    password: '',
    generateCredentials: false,
    forcePasswordChange: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');

  const addSpecialty = (specialty: string) => {
    if (specialty.trim() && !formData.specialties.includes(specialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      address: null,
      business_info: {},
      specialties: [],
      type: 'local',
      region: '',
      status: 'active',
      subscription_plan_id: 'plan-basic',
      client_id: null
    });
    setNewSpecialty('');
    setActiveTab('contact');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.cnpj) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome, email e CNPJ são obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      if (!formData.whatsapp) {
        toast({
          title: "WhatsApp obrigatório",
          description: "O WhatsApp é necessário para envio de cotações.",
          variant: "destructive"
        });
        return;
      }

      await createSupplierWithUser(formData, credentials);
      
      toast({
        title: "Fornecedor criado com sucesso",
        description: `${formData.name} foi adicionado ao sistema. As cotações serão enviadas via WhatsApp.`
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name && formData.email && formData.cnpj && formData.whatsapp;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Novo Fornecedor
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre fornecedores para receber cotações via WhatsApp
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Contato
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Localização
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="contact" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Informações de Contato</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      O WhatsApp é essencial para o envio automático de cotações
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome da Empresa *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome da empresa fornecedora"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ *</Label>
                        <Input
                          id="cnpj"
                          value={formData.cnpj}
                          onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                          placeholder="00.000.000/0000-00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="contato@empresa.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(11) 3333-4444"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        WhatsApp * (Para envio de cotações)
                      </Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="border-green-200 focus:border-green-400"
                        required
                      />
                      <p className="text-xs text-green-600">
                        ✓ As cotações serão enviadas automaticamente para este WhatsApp
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://www.empresa.com"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="business" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Especialidades e Serviços</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Defina as áreas de atuação do fornecedor
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label>Especialidades</Label>
                      
                      {/* Especialidades comuns */}
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Selecione as especialidades mais comuns:</p>
                        <div className="flex flex-wrap gap-2">
                          {commonSpecialties.map((specialty) => (
                            <Badge
                              key={specialty}
                              variant={formData.specialties.includes(specialty) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => 
                                formData.specialties.includes(specialty) 
                                  ? removeSpecialty(specialty)
                                  : addSpecialty(specialty)
                              }
                            >
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Adicionar especialidade customizada */}
                      <div className="flex gap-2">
                        <Input
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          placeholder="Adicionar especialidade personalizada"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty(newSpecialty))}
                        />
                        <Button 
                          type="button" 
                          onClick={() => addSpecialty(newSpecialty)} 
                          variant="outline"
                          disabled={!newSpecialty.trim()}
                        >
                          Adicionar
                        </Button>
                      </div>

                      {/* Especialidades selecionadas */}
                      {formData.specialties.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Especialidades selecionadas:</p>
                          <div className="flex flex-wrap gap-2">
                            {formData.specialties.map((specialty) => (
                              <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                                {specialty}
                                <X 
                                  className="h-3 w-3 cursor-pointer" 
                                  onClick={() => removeSpecialty(specialty)}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="location" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Localização e Abrangência</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure a área de atuação do fornecedor
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Fornecedor</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {supplierTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{type.label}</span>
                                  <span className="text-xs text-muted-foreground">{type.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="region">Região Principal</Label>
                        <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a região" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map(region => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status Inicial</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo - Pode receber cotações</SelectItem>
                          <SelectItem value="pending">Pendente - Aguardando verificação</SelectItem>
                          <SelectItem value="inactive">Inativo - Não recebe cotações</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            {/* Actions fixas no bottom */}
            <div className="flex-shrink-0 border-t p-4 bg-background">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {!isFormValid && (
                    <span className="text-destructive">
                      * Preencha todos os campos obrigatórios
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="btn-corporate"
                    disabled={isLoading || !isFormValid}
                  >
                    {isLoading ? "Cadastrando..." : "Cadastrar Fornecedor"}
                  </Button>
                </div>
              </div>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}