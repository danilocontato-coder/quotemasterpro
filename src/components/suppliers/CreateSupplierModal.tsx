import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, X, UserPlus, Building, MapPin, MessageCircle, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAdminSuppliers } from "@/hooks/useSupabaseAdminSuppliers";
import { Supplier } from "@/hooks/useSupabaseSuppliers";
import { brazilStates } from '@/data/brazilStates';

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreateSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating' | 'completed_orders'>) => Promise<any>;
  editingSupplier?: any;
}

const specialtyOptions = [
  'Materiais de Construção',
  'Limpeza e Higiene',
  'Jardinagem',
  'Manutenção',
  'Ferramentas',
  'Equipamentos',
  'Pinturas',
  'Elétrica',
  'Hidráulica',
  'Segurança',
  'Alimentação',
  'Móveis e Decoração'
];

export function CreateSupplierModal({ open, onClose, onCreateSupplier, editingSupplier }: CreateSupplierModalProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('contact');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
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
    type: 'local' as 'local' | 'certified',
    region: '',
    state: '',
    city: '',
    visibility_scope: 'region' as 'region' | 'global',
    status: 'active' as 'pending' | 'active' | 'inactive' | 'suspended',
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
  const [newSpecialty, setNewSpecialty] = useState('');

  // Load data when editing - SIMPLIFIED
  const loadEditingData = useCallback(() => {
    if (!editingSupplier) return;
    
    console.log('📝 Carregando dados para edição:', editingSupplier.name);
    
    const addressData = editingSupplier.address || {};
    
    setFormData({
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
    });
    
    // Set state and city for proper form behavior
    if (editingSupplier.state) {
      const state = brazilStates.find(s => s.name === editingSupplier.state);
      if (state) {
        setSelectedState(state.code);
        setAvailableCities(state.cities);
      }
    }
    
    console.log('✅ Dados carregados para edição');
  }, [editingSupplier]);

  // Reset form
  const resetForm = useCallback(() => {
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
  }, []);

  // Effect for loading data - CONTROLLED
  useEffect(() => {
    if (!open) return;
    
    if (editingSupplier) {
      loadEditingData();
    } else {
      resetForm();
    }
  }, [open, editingSupplier, loadEditingData, resetForm]);

  // Handle state change
  const handleStateChange = (stateCode: string) => {
    const state = brazilStates.find(s => s.code === stateCode);
    if (state) {
      setSelectedState(stateCode);
      setAvailableCities(state.cities);
      setFormData(prev => ({
        ...prev,
        state: state.name,
        region: getRegionFromState(stateCode),
        city: '' // Reset city when state changes
      }));
    }
  };

  const getRegionFromState = (stateCode: string) => {
    const regions: { [key: string]: string } = {
      // Norte
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      // Nordeste  
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      // Centro-Oeste
      'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
      // Sudeste
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      // Sul
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };
    return regions[stateCode] || '';
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleAddCustomSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  // Handle submit - SIMPLIFIED AND PROTECTED
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

      // Prepare supplier data
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

      // Reset and close
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
                          placeholder="Ex: Fornecedor Alpha Ltda"
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
                          placeholder="contato@fornecedor.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+55 11 99999-0000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp * <span className="text-green-600">(Obrigatório)</span></Label>
                        <Input
                          id="whatsapp"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                          placeholder="+55 11 99999-0000"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Cotações serão enviadas automaticamente para este número
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://www.fornecedor.com"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="business" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Informações da Empresa</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Defina as especialidades e tipo do fornecedor
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label>Especialidades</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {specialtyOptions.map((specialty) => (
                          <div key={specialty} className="flex items-center space-x-2">
                            <Checkbox
                              id={specialty}
                              checked={formData.specialties.includes(specialty)}
                              onCheckedChange={() => handleSpecialtyToggle(specialty)}
                            />
                            <Label htmlFor={specialty} className="text-sm">{specialty}</Label>
                          </div>
                        ))}
                      </div>

                      {/* Custom specialty input */}
                      <div className="flex gap-2">
                        <Input
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          placeholder="Adicionar especialidade personalizada"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomSpecialty();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddCustomSpecialty}
                          disabled={!newSpecialty.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Selected specialties */}
                      {formData.specialties.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Especialidades Selecionadas:</Label>
                          <div className="flex flex-wrap gap-2">
                            {formData.specialties.map((specialty) => (
                              <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                                {specialty}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpecialty(specialty)}
                                  className="ml-1 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label>Tipo de Fornecedor</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: 'local' | 'certified') => 
                          setFormData(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="certified">Certificado</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Fornecedores certificados ficam disponíveis para todos os clientes
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Label>Escopo de Visibilidade</Label>
                      <Select
                        value={formData.visibility_scope}
                        onValueChange={(value: 'region' | 'global') => 
                          setFormData(prev => ({ ...prev, visibility_scope: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="region">Regional</SelectItem>
                          <SelectItem value="global">Global</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="location" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Localização</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Defina a localização para melhor direcionamento de cotações
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Estado *</Label>
                        <Select value={selectedState} onValueChange={handleStateChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {brazilStates.map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cidade *</Label>
                        <Select
                          value={formData.city}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                          disabled={!selectedState}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedState ? "Selecione a cidade" : "Selecione primeiro o estado"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Região</Label>
                        <Input
                          value={formData.region}
                          readOnly
                          className="bg-muted"
                          placeholder="Será preenchida automaticamente"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Endereço Completo (Opcional)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="street">Rua</Label>
                          <Input
                            id="street"
                            value={formData.address.street}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              address: { ...prev.address, street: e.target.value }
                            }))}
                            placeholder="Nome da rua"
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
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {!editingSupplier && (
                <TabsContent value="credentials" className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg">Acesso ao Sistema</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Configure o acesso do fornecedor ao sistema (opcional)
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="generateCredentials"
                          checked={credentials.generateCredentials}
                          onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, generateCredentials: checked }))}
                        />
                        <Label htmlFor="generateCredentials">Criar acesso ao sistema para este fornecedor</Label>
                      </div>

                      {credentials.generateCredentials && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                          <div className="space-y-2">
                            <Label htmlFor="password">Senha Temporária</Label>
                            <Input
                              id="password"
                              type="password"
                              value={credentials.password}
                              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Digite uma senha temporária"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="forcePasswordChange"
                              checked={credentials.forcePasswordChange}
                              onCheckedChange={(checked) => setCredentials(prev => ({ 
                                ...prev, 
                                forcePasswordChange: checked === true 
                              }))}
                            />
                            <Label htmlFor="forcePasswordChange">Forçar alteração de senha no primeiro acesso</Label>
                          </div>

                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                              <strong>📱 Envio Automático:</strong> Se o fornecedor tiver WhatsApp cadastrado, 
                              as credenciais de acesso serão enviadas automaticamente via mensagem.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </div>
          </Tabs>

          <div className="flex-shrink-0 flex justify-between items-center gap-4 pt-6 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {!isFormValid && (
                <span className="text-amber-600">* Preencha todos os campos obrigatórios</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isFormValid || isLoading}>
                {isLoading ? 'Salvando...' : (editingSupplier ? 'Atualizar' : 'Criar Fornecedor')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}