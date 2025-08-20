import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  DollarSign,
  Users,
  Building2,
  Truck,
  Database,
  Settings,
  Star,
  Plus,
  Trash2,
  Palette,
  Globe,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Clock,
  Infinity
} from 'lucide-react';
import { SubscriptionPlan } from '@/data/subscriptionPlans';

interface CreatePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePlan: (plan: Omit<SubscriptionPlan, 'id' | 'usageStats'>) => void;
}

interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  open,
  onOpenChange,
  onCreatePlan
}) => {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    price: 0,
    currency: 'BRL',
    pricing: {
      monthly: 0,
      yearly: 0,
      discount: 0
    },
    status: 'active' as const,
    targetAudience: 'clients' as const,
    isPopular: false
  });

  const [limits, setLimits] = useState({
    maxQuotes: 50,
    maxSuppliers: 10,
    maxUsers: 3,
    storageGB: 5,
    maxQuotesPerMonth: 50,
    maxUsersPerClient: 3,
    maxSuppliersPerQuote: 5,
    maxStorageGB: 5,
    maxQuoteResponsesPerMonth: 50,
    maxProductsInCatalog: 100,
    maxCategoriesPerSupplier: 10
  });

  const [features, setFeatures] = useState<PlanFeature[]>([
    { id: 'quotes', name: 'Sistema de Cotações', included: true },
    { id: 'suppliers', name: 'Gestão de Fornecedores', included: true },
    { id: 'users', name: 'Múltiplos Usuários', included: true },
    { id: 'reports', name: 'Relatórios Básicos', included: true },
    { id: 'email-support', name: 'Suporte por Email', included: true },
    { id: 'phone-support', name: 'Suporte por Telefone', included: false },
    { id: 'priority-support', name: 'Suporte Prioritário', included: false },
    { id: '247-support', name: 'Suporte 24/7', included: false },
    { id: 'advanced-reports', name: 'Relatórios Avançados', included: false },
    { id: 'custom-reports', name: 'Relatórios Personalizados', included: false },
    { id: 'market-analysis', name: 'Análise de Mercado', included: false },
    { id: 'whatsapp', name: 'Integração WhatsApp', included: false },
    { id: 'email-integration', name: 'Integração de Email', included: false },
    { id: 'api-access', name: 'Acesso à API', included: false },
    { id: 'backup', name: 'Backup Automático', included: false },
    { id: 'branding', name: 'Marca Personalizada', included: false },
    { id: 'custom-domain', name: 'Domínio Personalizado', included: false },
    { id: 'sso', name: 'Single Sign-On (SSO)', included: false },
    { id: 'advanced-security', name: 'Segurança Avançada', included: false },
    { id: 'manager', name: 'Gerente Dedicado', included: false },
    { id: 'training', name: 'Treinamento Incluído', included: false }
  ]);

  const [customizations, setCustomizations] = useState({
    allowBranding: false,
    allowCustomDomain: false,
    color: 'blue'
  });

  const handleSubmit = async () => {
    if (!formData.displayName || !formData.description || formData.pricing.monthly <= 0) {
      toast({
        title: "Erro de validação",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const newPlan: Omit<SubscriptionPlan, 'id' | 'usageStats'> = {
        name: formData.name || formData.displayName.toLowerCase().replace(/\s+/g, '-'),
        displayName: formData.displayName,
        description: formData.description,
        price: formData.pricing.monthly,
        currency: formData.currency,
        pricing: {
          ...formData.pricing,
          yearly: formData.pricing.yearly || formData.pricing.monthly * 12 * (1 - formData.pricing.discount / 100)
        },
        features: features.filter(f => f.included),
        limits,
        status: formData.status,
        targetAudience: formData.targetAudience,
        isPopular: formData.isPopular,
        customizations
      };

      await onCreatePlan(newPlan);
      
      toast({
        title: "Plano criado com sucesso!",
        description: `O plano ${formData.displayName} foi criado.`
      });

      // Reset form
      setFormData({
        name: '',
        displayName: '',
        description: '',
        price: 0,
        currency: 'BRL',
        pricing: { monthly: 0, yearly: 0, discount: 0 },
        status: 'active',
        targetAudience: 'clients',
        isPopular: false
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao criar plano",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomFeature = () => {
    const newFeature: PlanFeature = {
      id: `custom-${Date.now()}`,
      name: '',
      included: true
    };
    setFeatures([...features, newFeature]);
  };

  const removeFeature = (id: string) => {
    setFeatures(features.filter(f => f.id !== id));
  };

  const updateFeature = (id: string, updates: Partial<PlanFeature>) => {
    setFeatures(features.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const isUnlimited = (key: keyof typeof limits) => limits[key] === -1;

  const setUnlimited = (key: keyof typeof limits, unlimited: boolean) => {
    setLimits(prev => ({
      ...prev,
      [key]: unlimited ? -1 : (key.includes('Storage') ? 5 : key.includes('Month') ? 50 : 10)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Criar Novo Plano de Assinatura
          </DialogTitle>
          <DialogDescription>
            Configure todas as informações, recursos e limites do novo plano
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="pricing">Preços</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="features">Recursos</TabsTrigger>
          </TabsList>

          <div className="max-h-[60vh] overflow-y-auto">
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Nome do Plano *</Label>
                      <Input
                        id="displayName"
                        value={formData.displayName}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Ex: Plano Premium"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Técnico</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: premium (auto-gerado)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva as principais características do plano"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience">Público-Alvo</Label>
                      <Select value={formData.targetAudience} onValueChange={(value: any) => setFormData(prev => ({ ...prev, targetAudience: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clients">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Clientes
                            </div>
                          </SelectItem>
                          <SelectItem value="suppliers">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Fornecedores
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Ambos
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color">Cor do Tema</Label>
                      <Select value={customizations.color} onValueChange={(value) => setCustomizations(prev => ({ ...prev, color: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blue">Azul</SelectItem>
                          <SelectItem value="green">Verde</SelectItem>
                          <SelectItem value="purple">Roxo</SelectItem>
                          <SelectItem value="orange">Laranja</SelectItem>
                          <SelectItem value="red">Vermelho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPopular"
                        checked={formData.isPopular}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPopular: checked }))}
                      />
                      <Label htmlFor="isPopular" className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Marcar como Popular
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allowBranding"
                        checked={customizations.allowBranding}
                        onCheckedChange={(checked) => setCustomizations(prev => ({ ...prev, allowBranding: checked }))}
                      />
                      <Label htmlFor="allowBranding" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Permitir Marca Personalizada
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allowCustomDomain"
                        checked={customizations.allowCustomDomain}
                        onCheckedChange={(checked) => setCustomizations(prev => ({ ...prev, allowCustomDomain: checked }))}
                      />
                      <Label htmlFor="allowCustomDomain" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Permitir Domínio Personalizado
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Configuração de Preços
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly">Preço Mensal (R$) *</Label>
                      <Input
                        id="monthly"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.pricing.monthly}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          pricing: { ...prev.pricing, monthly: parseFloat(e.target.value) || 0 }
                        }))}
                        placeholder="99.90"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yearly">Preço Anual (R$)</Label>
                      <Input
                        id="yearly"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.pricing.yearly}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          pricing: { ...prev.pricing, yearly: parseFloat(e.target.value) || 0 }
                        }))}
                        placeholder="999.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discount">Desconto Anual (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.pricing.discount}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          pricing: { ...prev.pricing, discount: parseInt(e.target.value) || 0 }
                        }))}
                        placeholder="15"
                      />
                    </div>
                  </div>

                  {formData.pricing.monthly > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Preview de Preços:</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Mensal:</span>
                          <span className="ml-2 font-medium">R$ {formData.pricing.monthly.toFixed(2)}/mês</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Anual:</span>
                          <span className="ml-2 font-medium">
                            R$ {(formData.pricing.yearly || formData.pricing.monthly * 12 * (1 - formData.pricing.discount / 100)).toFixed(2)}/ano
                          </span>
                          {formData.pricing.discount > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              -{formData.pricing.discount}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Limites e Restrições
                  </CardTitle>
                  <CardDescription>
                    Configure os limites específicos para clientes e fornecedores
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Limites para Clientes */}
                  <div>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Limites para Clientes
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Cotações por Mês
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isUnlimited('maxQuotesPerMonth')}
                              onCheckedChange={(checked) => setUnlimited('maxQuotesPerMonth', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Ilimitado</span>
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={isUnlimited('maxQuotesPerMonth')}
                            value={isUnlimited('maxQuotesPerMonth') ? '' : limits.maxQuotesPerMonth}
                            onChange={(e) => setLimits(prev => ({ ...prev, maxQuotesPerMonth: parseInt(e.target.value) || 0 }))}
                            placeholder="50"
                          />
                          {isUnlimited('maxQuotesPerMonth') && (
                            <Infinity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Usuários por Cliente
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isUnlimited('maxUsersPerClient')}
                              onCheckedChange={(checked) => setUnlimited('maxUsersPerClient', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Ilimitado</span>
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={isUnlimited('maxUsersPerClient')}
                            value={isUnlimited('maxUsersPerClient') ? '' : limits.maxUsersPerClient}
                            onChange={(e) => setLimits(prev => ({ ...prev, maxUsersPerClient: parseInt(e.target.value) || 0 }))}
                            placeholder="3"
                          />
                          {isUnlimited('maxUsersPerClient') && (
                            <Infinity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Fornecedores por Cotação
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isUnlimited('maxSuppliersPerQuote')}
                              onCheckedChange={(checked) => setUnlimited('maxSuppliersPerQuote', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Ilimitado</span>
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={isUnlimited('maxSuppliersPerQuote')}
                            value={isUnlimited('maxSuppliersPerQuote') ? '' : limits.maxSuppliersPerQuote}
                            onChange={(e) => setLimits(prev => ({ ...prev, maxSuppliersPerQuote: parseInt(e.target.value) || 0 }))}
                            placeholder="5"
                          />
                          {isUnlimited('maxSuppliersPerQuote') && (
                            <Infinity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Armazenamento (GB)
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isUnlimited('maxStorageGB')}
                              onCheckedChange={(checked) => setUnlimited('maxStorageGB', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Ilimitado</span>
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={isUnlimited('maxStorageGB')}
                            value={isUnlimited('maxStorageGB') ? '' : limits.maxStorageGB}
                            onChange={(e) => setLimits(prev => ({ ...prev, maxStorageGB: parseInt(e.target.value) || 0 }))}
                            placeholder="5"
                          />
                          {isUnlimited('maxStorageGB') && (
                            <Infinity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Limites para Fornecedores */}
                  <div>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Limites para Fornecedores
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Respostas de Cotação por Mês
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isUnlimited('maxQuoteResponsesPerMonth')}
                              onCheckedChange={(checked) => setUnlimited('maxQuoteResponsesPerMonth', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Ilimitado</span>
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={isUnlimited('maxQuoteResponsesPerMonth')}
                            value={isUnlimited('maxQuoteResponsesPerMonth') ? '' : limits.maxQuoteResponsesPerMonth}
                            onChange={(e) => setLimits(prev => ({ ...prev, maxQuoteResponsesPerMonth: parseInt(e.target.value) || 0 }))}
                            placeholder="50"
                          />
                          {isUnlimited('maxQuoteResponsesPerMonth') && (
                            <Infinity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Produtos no Catálogo
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isUnlimited('maxProductsInCatalog')}
                              onCheckedChange={(checked) => setUnlimited('maxProductsInCatalog', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Ilimitado</span>
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={isUnlimited('maxProductsInCatalog')}
                            value={isUnlimited('maxProductsInCatalog') ? '' : limits.maxProductsInCatalog}
                            onChange={(e) => setLimits(prev => ({ ...prev, maxProductsInCatalog: parseInt(e.target.value) || 0 }))}
                            placeholder="100"
                          />
                          {isUnlimited('maxProductsInCatalog') && (
                            <Infinity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          Categorias por Fornecedor
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isUnlimited('maxCategoriesPerSupplier')}
                              onCheckedChange={(checked) => setUnlimited('maxCategoriesPerSupplier', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Ilimitado</span>
                          </div>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            disabled={isUnlimited('maxCategoriesPerSupplier')}
                            value={isUnlimited('maxCategoriesPerSupplier') ? '' : limits.maxCategoriesPerSupplier}
                            onChange={(e) => setLimits(prev => ({ ...prev, maxCategoriesPerSupplier: parseInt(e.target.value) || 0 }))}
                            placeholder="10"
                          />
                          {isUnlimited('maxCategoriesPerSupplier') && (
                            <Infinity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Recursos e Funcionalidades
                    </div>
                    <Button variant="outline" size="sm" onClick={addCustomFeature}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Recurso
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {features.map((feature, index) => (
                      <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <Switch
                            checked={feature.included}
                            onCheckedChange={(checked) => updateFeature(feature.id, { included: checked })}
                          />
                          <Input
                            value={feature.name}
                            onChange={(e) => updateFeature(feature.id, { name: e.target.value })}
                            placeholder="Nome do recurso"
                            className="flex-1"
                          />
                        </div>
                        {feature.id.startsWith('custom-') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(feature.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Recursos Incluídos:</h4>
                    <div className="flex flex-wrap gap-2">
                      {features.filter(f => f.included && f.name).map(feature => (
                        <Badge key={feature.id} variant="secondary">
                          {feature.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Plano'}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};