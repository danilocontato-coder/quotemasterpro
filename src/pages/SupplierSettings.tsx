import React, { useState } from 'react';
import { Save, User, Bell, Key, CreditCard, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

const SupplierSettings = () => {
  const { toast } = useToast();
  const { getPlanDisplayName } = useSubscriptionPlans();
  
  // Mock data - seria substituído por dados reais do fornecedor logado
  const [supplierData, setSupplierData] = useState({
    companyName: 'Fornecedor Alpha Ltda',
    cnpj: '12.345.678/0001-90',
    address: 'Rua das Empresas, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    email: 'contato@alpha.com',
    phone: '+55 11 99999-0000',
    whatsapp: '+55 11 99999-0000',
    description: 'Especializada em materiais de limpeza e higiene'
  });

  const [notifications, setNotifications] = useState({
    email: true,
    whatsapp: true,
    inApp: true,
    newQuotes: true,
    statusUpdates: true,
    payments: true
  });

  const [planInfo] = useState({
    planId: 'plan-pro',
    planName: 'Profissional',
    quotesUsed: 23,
    quotesLimit: 100,
    storageUsed: 2.3,
    storageLimit: 10
  });

  const handleSaveProfile = () => {
    // Aqui seria feita a chamada para atualizar no backend
    toast({
      title: "Sucesso",
      description: "Perfil atualizado com sucesso",
    });
  };

  const handleSaveNotifications = () => {
    // Aqui seria feita a chamada para atualizar no backend
    toast({
      title: "Sucesso",
      description: "Preferências de notificação atualizadas",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações e preferências
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Assinatura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa *</Label>
                  <Input
                    id="companyName"
                    value={supplierData.companyName}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={supplierData.cnpj}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, cnpj: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={supplierData.description}
                  onChange={(e) => setSupplierData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva sua empresa e especialidades..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={supplierData.address}
                  onChange={(e) => setSupplierData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={supplierData.city}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={supplierData.state}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    value={supplierData.zipCode}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, zipCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={supplierData.email}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={supplierData.phone}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={supplierData.whatsapp}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Canais de Notificação</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">E-mail</p>
                      <p className="text-sm text-muted-foreground">Receber notificações por e-mail</p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-sm text-muted-foreground">Receber notificações via WhatsApp</p>
                    </div>
                    <Switch
                      checked={notifications.whatsapp}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, whatsapp: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">No App</p>
                      <p className="text-sm text-muted-foreground">Notificações dentro da plataforma</p>
                    </div>
                    <Switch
                      checked={notifications.inApp}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, inApp: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Tipos de Notificação</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Novas Cotações</p>
                      <p className="text-sm text-muted-foreground">Quando receber solicitação de cotação</p>
                    </div>
                    <Switch
                      checked={notifications.newQuotes}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newQuotes: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Mudanças de Status</p>
                      <p className="text-sm text-muted-foreground">Atualizações sobre cotações enviadas</p>
                    </div>
                    <Switch
                      checked={notifications.statusUpdates}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, statusUpdates: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pagamentos</p>
                      <p className="text-sm text-muted-foreground">Confirmações de pagamento</p>
                    </div>
                    <Switch
                      checked={notifications.payments}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, payments: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotifications}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Integrações de API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  Integrações disponíveis conforme seu plano
                </p>
                <p className="text-sm text-muted-foreground">
                  Configure suas integrações para automatizar processos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-medium text-lg">Plano {planInfo.planName}</h3>
                  <p className="text-sm text-muted-foreground">Plano para fornecedores</p>
                </div>
                <Badge variant="secondary">Ativo</Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Cotações</span>
                    <span className="text-sm text-muted-foreground">{planInfo.quotesUsed}/{planInfo.quotesLimit}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(planInfo.quotesUsed / planInfo.quotesLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Armazenamento</span>
                    <span className="text-sm text-muted-foreground">{planInfo.storageUsed}GB/{planInfo.storageLimit}GB</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(planInfo.storageUsed / planInfo.storageLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline">
                  Ver Planos Disponíveis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupplierSettings;