import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, X, MessageCircle, Building, MapPin, Key, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSupabaseAdminSuppliers } from '@/hooks/useSupabaseAdminSuppliers';
import { Supplier } from '@/hooks/useSupabaseSuppliers';
import { brazilStates } from '@/data/brazilStates';

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreateSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating' | 'completed_orders'>) => Promise<any>;
  editingSupplier?: any;
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

const visibilityScopes = [
  { value: 'region', label: 'Região', description: 'Visível apenas para clientes da mesma região' },
  { value: 'global', label: 'Global', description: 'Visível para todos os clientes certificados' }
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

export function CreateSupplierModal({ open, onClose, onCreateSupplier, editingSupplier }: CreateSupplierModalProps) {
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
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    },
    business_info: {},
    specialties: [] as string[],
    type: 'local' as const,
    region: '',
    state: '',
    city: '',
    visibility_scope: 'region' as const,
    status: 'active' as const,
    subscription_plan_id: 'plan-basic',
    client_id: null,
    is_certified: false,
    certification_date: null,
    certification_expires_at: null
  });

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    generateCredentials: false,
    forcePasswordChange: true
  });

  const [selectedState, setSelectedState] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');

  // Load editing supplier data when modal opens
  useEffect(() => {
    console.log('🔧 CreateSupplierModal useEffect:', { open, hasEditingSupplier: !!editingSupplier });
    
    if (open && editingSupplier) {
      console.log('📝 Carregando dados para edição:', editingSupplier.name);
      
      const addressData = editingSupplier.address || {};
      
      // Batch all state updates to prevent multiple re-renders
      const newFormData = {
        name: editingSupplier.name || '',
        cnpj: editingSupplier.cnpj || '',
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        whatsapp: editingSupplier.whatsapp || '',
        website: editingSupplier.website || '',
        address: {
          street: addressData.street || '',
          number: addressData.number || '',
          complement: addressData.complement || '',
          neighborhood: addressData.neighborhood || '',
          city: addressData.city || '',
          state: addressData.state || '',
          zipCode: addressData.zipCode || ''
        },
        business_info: editingSupplier.business_info || {},
        specialties: editingSupplier.specialties || [],
        type: editingSupplier.type || 'local',
        region: editingSupplier.region || '',
        state: editingSupplier.state || '',
        city: editingSupplier.city || '',
        visibility_scope: editingSupplier.visibility_scope || 'region',
        status: editingSupplier.status || 'active',
        subscription_plan_id: editingSupplier.subscription_plan_id || 'plan-basic',
        client_id: editingSupplier.client_id || null,
        is_certified: editingSupplier.is_certified || false,
        certification_date: editingSupplier.certification_date || null,
        certification_expires_at: editingSupplier.certification_expires_at || null
      };
      
      setFormData(newFormData);
      
      // Set state and city for proper form behavior
      if (editingSupplier.state) {
        const state = brazilStates.find(s => s.name === editingSupplier.state);
        if (state) {
          setSelectedState(state.code);
          setAvailableCities(state.cities);
        }
      }
      
      console.log('✅ Dados carregados para edição');
    } else if (open && !editingSupplier) {
      console.log('🆕 Modal aberto para novo fornecedor');
      resetForm();
    }
  }, [open, editingSupplier]);

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

  const generateCredentials = () => {
    const username = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15) + Math.floor(Math.random() * 100);
    const password = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);
    
    setCredentials(prev => ({
      ...prev,
      username,
      password
    }));
  };

  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode);
    const state = brazilStates.find(s => s.code === stateCode);
    if (state) {
      setAvailableCities(state.cities);
      setFormData(prev => ({
        ...prev,
        state: state.name,
        city: '',
        region: getRegionByState(stateCode)
      }));
    }
  };

  const getRegionByState = (stateCode: string): string => {
    const regions: Record<string, string> = {
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };
    return regions[stateCode] || '';
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: ''
      },
      business_info: {},
      specialties: [],
      type: 'local',
      region: '',
      state: '',
      city: '',
      visibility_scope: 'region',
      status: 'active',
      subscription_plan_id: 'plan-basic',
      client_id: null,
      is_certified: false,
      certification_date: null,
      certification_expires_at: null
    });
    setCredentials({
      username: '',
      password: '',
      generateCredentials: false,
      forcePasswordChange: true
    });
    setSelectedState('');
    setAvailableCities([]);
    setNewSpecialty('');
    setActiveTab('contact');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) {
      console.log('Submit já em andamento, ignorando...');
      return;
    }
    
    setIsLoading(true);
    console.log('🔄 handleSubmit iniciado', { editingSupplier: !!editingSupplier, formData: formData.name });

    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.cnpj) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome, email e CNPJ são obrigatórios.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (!formData.whatsapp) {
        toast({
          title: "WhatsApp obrigatório",
          description: "O WhatsApp é necessário para envio de cotações.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Ensure address is properly structured
      const supplierData = {
        ...formData,
        address: formData.address
      };
      
      console.log('📤 Chamando onCreateSupplier...');
      await onCreateSupplier(supplierData);
      console.log('✅ onCreateSupplier concluído');
      
      toast({
        title: editingSupplier ? "Fornecedor atualizado com sucesso" : "Fornecedor criado com sucesso",
        description: `${formData.name} foi ${editingSupplier ? 'atualizado' : 'adicionado ao sistema'}. As cotações serão enviadas via WhatsApp.`
      });

      console.log('🔄 Resetando form e fechando modal...');
      resetForm();
      onClose();
      console.log('✅ Modal fechado com sucesso');
    } catch (error) {
      console.error('❌ Error creating supplier:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name && formData.email && formData.cnpj && formData.whatsapp && formData.state && formData.city;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {editingSupplier ? 'Editar Fornecedor' : 'Criar Novo Fornecedor'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {editingSupplier 
              ? 'Edite as informações do fornecedor'
              : 'Cadastre fornecedores para receber cotações via WhatsApp'
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
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
              {!editingSupplier && (
                <TabsTrigger value="credentials" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Acesso
                </TabsTrigger>
              )}
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
                    <CardTitle className="text-lg">Localização e Endereço Completo</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure a localização detalhada para melhor sugestão aos clientes
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Estado e Cidade */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado *</Label>
                        <Select value={selectedState} onValueChange={handleStateChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {brazilStates.map(state => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name} ({state.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Select value={formData.city} onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a cidade" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCities.map(city => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Endereço detalhado */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Rua/Avenida</Label>
                        <Input
                          id="street"
                          value={formData.address.street}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            address: { ...prev.address, street: e.target.value }
                          }))}
                          placeholder="Nome da rua ou avenida"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          value={formData.address.number}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            address: { ...prev.address, number: e.target.value }
                          }))}
                          placeholder="123"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          value={formData.address.complement}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            address: { ...prev.address, complement: e.target.value }
                          }))}
                          placeholder="Sala, andar, etc."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={formData.address.neighborhood}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            address: { ...prev.address, neighborhood: e.target.value }
                          }))}
                          placeholder="Nome do bairro"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        value={formData.address.zipCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          address: { ...prev.address, zipCode: e.target.value }
                        }))}
                        placeholder="00000-000"
                        className="w-40"
                      />
                    </div>

                    {/* Tipo e Configurações */}
                    <div className="border-t pt-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="type">Tipo de Fornecedor</Label>
                          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any, is_certified: value === 'certified' }))}>
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
                          <Label htmlFor="visibility">Visibilidade</Label>
                          <Select value={formData.visibility_scope} onValueChange={(value) => setFormData(prev => ({ ...prev, visibility_scope: value as any }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a visibilidade" />
                            </SelectTrigger>
                            <SelectContent>
                              {visibilityScopes.map(scope => (
                                <SelectItem key={scope.value} value={scope.value}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{scope.label}</span>
                                    <span className="text-xs text-muted-foreground">{scope.description}</span>
                                  </div>
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
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {!editingSupplier && (
                <TabsContent value="credentials" className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Credenciais de Acesso
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Configure o acesso do fornecedor ao sistema
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="generateCredentials"
                          checked={credentials.generateCredentials}
                          onCheckedChange={(checked) => {
                            setCredentials(prev => ({ ...prev, generateCredentials: !!checked }));
                            if (checked) {
                              generateCredentials();
                            }
                          }}
                        />
                        <Label htmlFor="generateCredentials" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Criar login e senha para o fornecedor
                        </Label>
                      </div>

                      {credentials.generateCredentials && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="username">Usuário</Label>
                              <Input
                                id="username"
                                value={credentials.username}
                                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="Nome de usuário"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="password">Senha Temporária</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="password"
                                  value={credentials.password}
                                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                                  placeholder="Senha"
                                  type="text"
                                />
                                <Button type="button" variant="outline" onClick={generateCredentials}>
                                  Gerar
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="forcePasswordChange"
                              checked={credentials.forcePasswordChange}
                              onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, forcePasswordChange: !!checked }))}
                            />
                            <Label htmlFor="forcePasswordChange" className="text-sm">
                              Forçar mudança de senha no primeiro login
                            </Label>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="h-5 w-5 text-green-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                  Envio Automático via WhatsApp
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                                  As credenciais serão enviadas automaticamente para o WhatsApp do fornecedor após o cadastro.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {!credentials.generateCredentials && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            O fornecedor receberá apenas as cotações via WhatsApp, sem acesso ao sistema.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
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
                    {isLoading ? (editingSupplier ? "Atualizando..." : "Cadastrando...") : (editingSupplier ? "Atualizar Fornecedor" : "Cadastrar Fornecedor")}
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