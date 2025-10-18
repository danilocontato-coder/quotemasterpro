import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Shield, MapPin, User, Lock, Eye, EyeOff, Globe, Key, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { brazilStates } from '@/data/brazilStates';
import { CEPInput } from '@/components/common/CEPInput';
import { SpecialtiesInput } from '@/components/common/SpecialtiesInput';

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreateSupplier: (supplierData: any, credentials: any) => Promise<any>;
  editingSupplier?: any;
  onCreateCredentials?: (supplierId: string, email: string, name: string) => Promise<any>;
  onResetPassword?: (supplierId: string, email: string) => Promise<any>;
  checkSupplierHasUser?: (email: string) => Promise<boolean>;
}

export function CreateSupplierModal({ 
  open, 
  onClose, 
  onCreateSupplier, 
  editingSupplier,
  onCreateCredentials,
  onResetPassword,
  checkSupplierHasUser 
}: CreateSupplierModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  
  // Supplier data state
  const [supplierData, setSupplierData] = useState({
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
    business_info: {
      description: '',
      specialties: [] as string[],
      workingHours: '',
      servicesOffered: ''
    },
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

  // Credentials state
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    generateCredentials: true,
    forcePasswordChange: true
  });

  const [selectedState, setSelectedState] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Reset form
  const resetForm = () => {
    setSupplierData({
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
      business_info: {
        description: '',
        specialties: [],
        workingHours: '',
        servicesOffered: ''
      },
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
      generateCredentials: true,
      forcePasswordChange: true
    });
    
    setSelectedState('');
    setAvailableCities([]);
  };

  // Check if supplier has user when editing
  useEffect(() => {
    if (!open || !editingSupplier || !checkSupplierHasUser) return;
    
    const checkUser = async () => {
      setCheckingUser(true);
      try {
        const userExists = await checkSupplierHasUser(editingSupplier.email);
        setHasUser(userExists);
      } catch (error) {
        console.error('Error checking user:', error);
        setHasUser(null);
      } finally {
        setCheckingUser(false);
      }
    };
    
    checkUser();
  }, [open, editingSupplier, checkSupplierHasUser]);

  // Load editing data
  useEffect(() => {
    if (!open) return;
    
    if (editingSupplier) {
      console.log('📝 Loading edit data for:', editingSupplier.name);
      
      setSupplierData({
        name: editingSupplier.name || '',
        cnpj: editingSupplier.cnpj || '',
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        whatsapp: editingSupplier.whatsapp || '',
        website: editingSupplier.website || '',
        address: editingSupplier.address || {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: ''
        },
        business_info: editingSupplier.business_info || {
          description: '',
          specialties: [],
          workingHours: '',
          servicesOffered: ''
        },
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
      
      // Set state for form
      if (editingSupplier.state) {
        const state = brazilStates.find(s => s.name === editingSupplier.state);
        if (state) {
          setSelectedState(state.code);
          setAvailableCities(state.cities);
        }
      }
    } else {
      resetForm();
      setHasUser(null);
    }
  }, [open, editingSupplier]);

  // Handle state change (async for awaitable city loading)
  const handleStateChange = async (stateCode: string) => {
    const state = brazilStates.find(s => s.code === stateCode);
    if (state) {
      setSelectedState(stateCode);
      setAvailableCities(state.cities);
      setSupplierData(prev => ({
        ...prev,
        state: state.name,
        region: getRegionFromState(stateCode),
        city: '',
        address: {
          ...prev.address,
          state: state.name,
          city: ''
        }
      }));
      return true;
    }
    return false;
  };

  // Handle address from CEP (awaits state change before updating city)
  const handleAddressFromCEP = async (addressData: {
    state: string;
    city: string;
    street?: string;
    neighborhood?: string;
  }) => {
    const stateObj = brazilStates.find(s => s.name === addressData.state);
    
    if (stateObj) {
      // 1. Update state and wait for cities to load
      await handleStateChange(stateObj.code);
      
      // 2. After cities are loaded, update city and address
      setSupplierData(prev => ({
        ...prev,
        state: stateObj.name,
        city: addressData.city,
        address: {
          ...prev.address,
          state: stateObj.name,
          city: addressData.city,
          street: addressData.street || prev.address.street,
          neighborhood: addressData.neighborhood || prev.address.neighborhood
        }
      }));

      toast({
        title: "CEP encontrado",
        description: "Endereço preenchido automaticamente!"
      });
    }
  };

  const getRegionFromState = (stateCode: string) => {
    const regions: { [key: string]: string } = {
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };
    return regions[stateCode] || '';
  };


  // Handle type change
  const handleTypeChange = (type: 'local' | 'certified') => {
    setSupplierData(prev => ({
      ...prev,
      type,
      is_certified: type === 'certified',
      visibility_scope: type === 'certified' ? 'global' : 'region',
      client_id: type === 'certified' ? null : prev.client_id
    }));
  };

  // Generate username from email
  useEffect(() => {
    if (supplierData.email && !editingSupplier) {
      const username = supplierData.email.split('@')[0];
      setCredentials(prev => ({
        ...prev,
        username
      }));
    }
  }, [supplierData.email, editingSupplier]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) {
      console.log('⚠️ Submit already in progress, ignoring...');
      return;
    }
    
    setIsLoading(true);
    console.log('🔄 Submit started');

    try {
      // Validate required fields
      if (!supplierData.name || !supplierData.email || !supplierData.cnpj) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome, email e CNPJ são obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      if (!supplierData.whatsapp) {
        toast({
          title: "WhatsApp obrigatório",
          description: "O WhatsApp é necessário para envio de cotações.",
          variant: "destructive"
        });
        return;
      }

      if (!supplierData.city || !supplierData.state) {
        toast({
          title: "Localização obrigatória",
          description: "Estado e cidade são obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      // Validate credentials for new suppliers
      if (!editingSupplier && !credentials.generateCredentials && (!credentials.username || !credentials.password)) {
        toast({
          title: "Credenciais obrigatórias",
          description: "Username e senha são obrigatórios quando não gerar automaticamente.",
          variant: "destructive"
        });
        return;
      }

      console.log('📤 Calling onCreateSupplier...');
      await onCreateSupplier(supplierData, credentials);
      console.log('✅ onCreateSupplier completed');
      
      toast({
        title: editingSupplier ? "Fornecedor atualizado" : "Fornecedor criado",
        description: `${supplierData.name} foi ${editingSupplier ? 'atualizado' : 'criado'} com sucesso.`
      });

      resetForm();
      onClose();
      console.log('✅ Modal closed');
    } catch (error) {
      console.error('❌ Error in submit:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o fornecedor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {editingSupplier ? 'Editar Fornecedor' : 'Criar Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={supplierData.name}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da empresa"
                    required
                  />
                </div>

                <div>
                  <Label>CNPJ *</Label>
                  <Input
                    value={supplierData.cnpj}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={supplierData.email}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                    required
                  />
                </div>

                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={supplierData.phone}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 3000-0000"
                  />
                </div>

                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    value={supplierData.whatsapp}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="+55 11 99999-0000"
                    required
                  />
                </div>

                <div>
                  <Label>Website</Label>
                  <Input
                    value={supplierData.website}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://empresa.com.br"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tipo de Fornecedor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Tipo de Fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    supplierData.type === 'local' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleTypeChange('local')}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium">Fornecedor Local</h3>
                      <p className="text-sm text-muted-foreground">
                        Visível apenas para clientes da mesma região
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    supplierData.type === 'certified' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleTypeChange('certified')}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-purple-600" />
                    <div>
                      <h3 className="font-medium">Fornecedor Certificado</h3>
                      <p className="text-sm text-muted-foreground">
                        Visível globalmente na plataforma
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* CEP primeiro - linha inteira */}
                <div className="col-span-2">
                  <CEPInput
                    value={supplierData.address.zipCode}
                    onChange={(cep) => setSupplierData(prev => ({
                      ...prev,
                      address: { ...prev.address, zipCode: cep }
                    }))}
                    onAddressFound={handleAddressFromCEP}
                    label="CEP"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite o CEP primeiro para preencher automaticamente estado, cidade e endereço
                  </p>
                </div>

                {/* Estado e Cidade - lado a lado */}
                <div>
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

                <div>
                  <Label>Cidade *</Label>
                  <Select
                    value={supplierData.city}
                    onValueChange={(value) => setSupplierData(prev => ({ 
                      ...prev, 
                      city: value,
                      address: { ...prev.address, city: value }
                    }))}
                    disabled={!selectedState}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedState ? "Selecione a cidade" : "Selecione o estado primeiro"} />
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

                {/* Endereço e Número - lado a lado */}
                <div>
                  <Label>Endereço</Label>
                  <Input
                    value={supplierData.address.street}
                    onChange={(e) => setSupplierData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    placeholder="Rua, Avenida..."
                  />
                </div>

                <div>
                  <Label>Número</Label>
                  <Input
                    value={supplierData.address.number}
                    onChange={(e) => setSupplierData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, number: e.target.value }
                    }))}
                    placeholder="123"
                  />
                </div>

                {/* Bairro e Complemento - lado a lado */}
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={supplierData.address.neighborhood}
                    onChange={(e) => setSupplierData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, neighborhood: e.target.value }
                    }))}
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <Label>Complemento</Label>
                  <Input
                    value={supplierData.address.complement}
                    onChange={(e) => setSupplierData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, complement: e.target.value }
                    }))}
                    placeholder="Apto, Sala..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Negócio */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Negócio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SpecialtiesInput
                value={supplierData.business_info.specialties}
                onChange={(specialties) => setSupplierData(prev => ({
                  ...prev,
                  business_info: {
                    ...prev.business_info,
                    specialties
                  }
                }))}
                maxSelections={10}
                allowCustom={true}
                showAsBadges={true}
                showTip={true}
              />

              <div>
                <Label>Descrição da Empresa</Label>
                <Textarea
                  value={supplierData.business_info.description}
                  onChange={(e) => setSupplierData(prev => ({ 
                    ...prev, 
                    business_info: { ...prev.business_info, description: e.target.value }
                  }))}
                  placeholder="Descreva os serviços e produtos oferecidos..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Horário de Funcionamento</Label>
                <Input
                  value={supplierData.business_info.workingHours}
                  onChange={(e) => setSupplierData(prev => ({ 
                    ...prev, 
                    business_info: { ...prev.business_info, workingHours: e.target.value }
                  }))}
                  placeholder="Ex: Segunda a Sexta, 8h às 18h"
                />
              </div>
            </CardContent>
          </Card>

          {/* Credenciais de Acesso */}
          {!editingSupplier ? (
            // Novo fornecedor - exibir formulário de credenciais
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Credenciais de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="generateCredentials"
                    checked={credentials.generateCredentials}
                    onCheckedChange={(checked) => setCredentials(prev => ({ 
                      ...prev, 
                      generateCredentials: checked 
                    }))}
                  />
                  <Label htmlFor="generateCredentials">Gerar credenciais automaticamente</Label>
                </div>

                {!credentials.generateCredentials && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Username *</Label>
                      <Input
                        value={credentials.username}
                        onChange={(e) => setCredentials(prev => ({ 
                          ...prev, 
                          username: e.target.value 
                        }))}
                        placeholder="nome.usuario"
                        required={!credentials.generateCredentials}
                      />
                    </div>

                    <div>
                      <Label>Senha *</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={credentials.password}
                          onChange={(e) => setCredentials(prev => ({ 
                            ...prev, 
                            password: e.target.value 
                          }))}
                          placeholder="********"
                          required={!credentials.generateCredentials}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="forcePasswordChange"
                    checked={credentials.forcePasswordChange}
                    onCheckedChange={(checked) => setCredentials(prev => ({ 
                      ...prev, 
                      forcePasswordChange: checked 
                    }))}
                  />
                  <Label htmlFor="forcePasswordChange">Forçar alteração de senha no primeiro login</Label>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Edição - exibir status e ações de credenciais
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Credenciais de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {checkingUser ? (
                  <div className="text-sm text-muted-foreground">Verificando status do usuário...</div>
                ) : hasUser === false ? (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <p className="text-sm text-orange-800">
                        Este fornecedor não possui credenciais de acesso criadas.
                      </p>
                    </div>
                    {onCreateCredentials && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            await onCreateCredentials(editingSupplier.id, editingSupplier.email, editingSupplier.name);
                            const userExists = checkSupplierHasUser && await checkSupplierHasUser(editingSupplier.email);
                            setHasUser(!!userExists);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Criar Credenciais de Acesso
                      </Button>
                    )}
                  </>
                ) : hasUser === true ? (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Key className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-800">
                        Credenciais de acesso já criadas para este fornecedor.
                      </p>
                    </div>
                    {onResetPassword && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            await onResetPassword(editingSupplier.id, editingSupplier.email);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Resetar Senha
                      </Button>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
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
              disabled={isLoading || !supplierData.name || !supplierData.email || !supplierData.cnpj || !supplierData.whatsapp}
            >
              {isLoading ? 'Salvando...' : (editingSupplier ? 'Atualizar Fornecedor' : 'Criar Fornecedor')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}