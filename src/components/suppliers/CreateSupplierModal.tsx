import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Eye, EyeOff, RefreshCw, UserPlus, X } from 'lucide-react';
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
  { value: 'local', label: 'Local' },
  { value: 'national', label: 'Nacional' },
  { value: 'international', label: 'Internacional' }
];

const subscriptionPlans = [
  'plan-basic',
  'plan-pro', 
  'plan-enterprise'
];

export function CreateSupplierModal({ open, onClose, onCreateSupplier }: CreateSupplierModalProps) {
  const { createSupplierWithUser } = useSupabaseAdminSuppliers();
  const { toast } = useToast();

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

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    generateCredentials: true,
    forcePasswordChange: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    if (credentials.generateCredentials && formData.email) {
      const username = formData.email.split('@')[0] + Math.floor(Math.random() * 100);
      const password = generatePassword();
      setCredentials(prev => ({ ...prev, username, password }));
    }
  }, [credentials.generateCredentials, formData.email]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGenerateNewPassword = () => {
    setCredentials(prev => ({ ...prev, password: generatePassword() }));
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(credentials.password);
    toast({
      title: "Senha copiada",
      description: "A senha foi copiada para a área de transferência."
    });
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
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
    setCredentials({
      username: '',
      password: '',
      generateCredentials: true,
      forcePasswordChange: true
    });
    setNewSpecialty('');
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

      await createSupplierWithUser(formData, credentials);
      
      toast({
        title: "Fornecedor criado com sucesso",
        description: `${formData.name} foi adicionado ao sistema.`
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Novo Fornecedor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="credentials">Credenciais</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
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
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Região</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plano de Assinatura</Label>
                  <Select value={formData.subscription_plan_id} onValueChange={(value) => setFormData(prev => ({ ...prev, subscription_plan_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans.map(plan => (
                        <SelectItem key={plan} value={plan}>
                          {plan.replace('plan-', '').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Especialidades</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Digite uma especialidade"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  />
                  <Button type="button" onClick={addSpecialty} variant="outline">
                    Adicionar
                  </Button>
                </div>
                {formData.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
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
                )}
              </div>
            </TabsContent>

            <TabsContent value="credentials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Acesso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="generateCredentials"
                      checked={credentials.generateCredentials}
                      onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, generateCredentials: checked }))}
                    />
                    <Label htmlFor="generateCredentials">Gerar credenciais automaticamente</Label>
                  </div>

                  {credentials.generateCredentials && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="username">Nome de usuário</Label>
                        <div className="flex gap-2">
                          <Input
                            id="username"
                            value={credentials.username}
                            onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Nome de usuário"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCredentials(prev => ({ 
                              ...prev, 
                              username: formData.email.split('@')[0] + Math.floor(Math.random() * 100) 
                            }))}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Senha temporária</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={credentials.password}
                              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Senha temporária"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                          <Button type="button" variant="outline" onClick={handleGenerateNewPassword}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" onClick={handleCopyPassword}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="forcePasswordChange"
                          checked={credentials.forcePasswordChange}
                          onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, forcePasswordChange: checked }))}
                        />
                        <Label htmlFor="forcePasswordChange">Forçar alteração de senha no primeiro login</Label>
                      </div>

                      <Card className="bg-muted">
                        <CardHeader>
                          <CardTitle className="text-sm">Resumo das Credenciais</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <p><strong>Email:</strong> {formData.email}</p>
                          <p><strong>Usuário:</strong> {credentials.username}</p>
                          <p><strong>Senha:</strong> {credentials.password}</p>
                          <p><strong>Alterar senha:</strong> {credentials.forcePasswordChange ? 'Sim' : 'Não'}</p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Fornecedor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}