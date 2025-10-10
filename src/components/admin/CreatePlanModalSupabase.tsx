import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, 
  Building2, 
  Truck, 
  Users, 
  Plus, 
  X, 
  Loader2,
  DollarSign,
  Settings,
  Palette,
  Shield,
  Zap
} from 'lucide-react';
import { PlanFormData } from '@/hooks/useSupabaseSubscriptionPlans';
import { useToast } from '@/hooks/use-toast';
import { AVAILABLE_MODULES, MODULE_CATEGORIES } from '@/constants/modules';
import { Checkbox } from '@/components/ui/checkbox';

interface CreatePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePlan: (planData: PlanFormData) => Promise<void>;
}

export const CreatePlanModalSupabase: React.FC<CreatePlanModalProps> = ({
  open,
  onOpenChange,
  onCreatePlan
}) => {
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    display_name: '',
    description: '',
    target_audience: 'clients',
    status: 'active',
    monthly_price: 0,
    yearly_price: 0,
    max_quotes: 50,
    max_suppliers: 10,
    max_users: 3,
    max_storage_gb: 5,
    is_popular: false,
    features: [],
    allow_branding: false,
    allow_custom_domain: false,
    custom_color: '#3b82f6',
    max_quotes_per_month: 50,
    max_users_per_client: 3,
    max_suppliers_per_quote: 5,
    max_quote_responses_per_month: 50,
    max_products_in_catalog: 100,
    max_categories_per_supplier: 10,
    enabled_modules: []
  });

  const [newFeature, setNewFeature] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.display_name) {
      toast({
        title: "Erro",
        description: "Nome e nome de exibição são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onCreatePlan({
        ...formData,
        enabled_modules: selectedModules
      });
      handleCancel(); // Limpar e fechar
    } catch (error) {
      console.error('Erro ao criar plano:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      target_audience: 'clients',
      status: 'active',
      monthly_price: 0,
      yearly_price: 0,
      max_quotes: 50,
      max_suppliers: 10,
      max_users: 3,
      max_storage_gb: 5,
      is_popular: false,
      features: [],
      allow_branding: false,
      allow_custom_domain: false,
      custom_color: '#3b82f6',
      max_quotes_per_month: 50,
      max_users_per_client: 3,
      max_suppliers_per_quote: 5,
      max_quote_responses_per_month: 50,
      max_products_in_catalog: 100,
      max_categories_per_supplier: 10,
      enabled_modules: []
    });
    setNewFeature('');
    setSelectedModules([]);
    onOpenChange(false);
  };

  const updateFormData = (field: keyof PlanFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleModuleToggle = (moduleKey: string, checked: boolean) => {
    if (checked) {
      setSelectedModules(prev => [...prev, moduleKey]);
    } else {
      setSelectedModules(prev => prev.filter(m => m !== moduleKey));
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'clients': return <Building2 className="h-4 w-4" />;
      case 'suppliers': return <Truck className="h-4 w-4" />;
      case 'both': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateYearlyDiscount = () => {
    if (formData.monthly_price === 0) return 0;
    const yearlyExpected = formData.monthly_price * 12;
    if (formData.yearly_price >= yearlyExpected) return 0;
    return Math.round(((yearlyExpected - formData.yearly_price) / yearlyExpected) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Criar Novo Plano
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="pricing">Preços</TabsTrigger>
              <TabsTrigger value="limits">Limites</TabsTrigger>
              <TabsTrigger value="features">Recursos</TabsTrigger>
              <TabsTrigger value="modules">Módulos</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Plano (ID) *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        placeholder="ex: basic, premium, enterprise"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="display_name">Nome de Exibição *</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => updateFormData('display_name', e.target.value)}
                        placeholder="ex: Plano Básico"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      placeholder="Descreva o plano e seus benefícios"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_audience">Público-Alvo</Label>
                      <Select 
                        value={formData.target_audience} 
                        onValueChange={(value: 'clients' | 'suppliers' | 'both') => updateFormData('target_audience', value)}
                      >
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
                      <Select 
                        value={formData.status} 
                        onValueChange={(value: 'active' | 'inactive') => updateFormData('status', value)}
                      >
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
                      <Label htmlFor="custom_color">Cor do Tema</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={formData.custom_color}
                          onChange={(e) => updateFormData('custom_color', e.target.value)}
                          className="w-12 h-10 rounded-md border cursor-pointer"
                        />
                        <Input
                          value={formData.custom_color}
                          onChange={(e) => updateFormData('custom_color', e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.is_popular}
                        onCheckedChange={(checked) => updateFormData('is_popular', checked)}
                      />
                      <Label>Plano Popular</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.allow_branding}
                        onCheckedChange={(checked) => updateFormData('allow_branding', checked)}
                      />
                      <Label>Permitir Branding</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.allow_custom_domain}
                        onCheckedChange={(checked) => updateFormData('allow_custom_domain', checked)}
                      />
                      <Label>Domínio Personalizado</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Configuração de Preços
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_price">Preço Mensal (R$)</Label>
                      <Input
                        id="monthly_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.monthly_price}
                        onChange={(e) => updateFormData('monthly_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yearly_price">Preço Anual (R$)</Label>
                      <Input
                        id="yearly_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.yearly_price}
                        onChange={(e) => updateFormData('yearly_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Preview de Preços */}
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-3">Preview dos Preços</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Mensal</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(formData.monthly_price)}
                        </p>
                        <p className="text-xs text-muted-foreground">por mês</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Anual</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(formData.yearly_price)}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-xs text-muted-foreground">por ano</p>
                          {calculateYearlyDiscount() > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {calculateYearlyDiscount()}% off
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Limites e Restrições
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_quotes">Máx. Cotações (-1 = ilimitado)</Label>
                      <Input
                        id="max_quotes"
                        type="number"
                        min="-1"
                        value={formData.max_quotes}
                        onChange={(e) => updateFormData('max_quotes', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_suppliers">Máx. Fornecedores</Label>
                      <Input
                        id="max_suppliers"
                        type="number"
                        min="-1"
                        value={formData.max_suppliers}
                        onChange={(e) => updateFormData('max_suppliers', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_users">Máx. Usuários</Label>
                      <Input
                        id="max_users"
                        type="number"
                        min="-1"
                        value={formData.max_users}
                        onChange={(e) => updateFormData('max_users', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_storage_gb">Armazenamento (GB)</Label>
                      <Input
                        id="max_storage_gb"
                        type="number"
                        min="0"
                        value={formData.max_storage_gb}
                        onChange={(e) => updateFormData('max_storage_gb', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_quotes_per_month">Cotações/Mês</Label>
                      <Input
                        id="max_quotes_per_month"
                        type="number"
                        min="-1"
                        value={formData.max_quotes_per_month}
                        onChange={(e) => updateFormData('max_quotes_per_month', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_suppliers_per_quote">Fornecedores/Cotação</Label>
                      <Input
                        id="max_suppliers_per_quote"
                        type="number"
                        min="-1"
                        value={formData.max_suppliers_per_quote}
                        onChange={(e) => updateFormData('max_suppliers_per_quote', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_products_in_catalog">Produtos no Catálogo</Label>
                      <Input
                        id="max_products_in_catalog"
                        type="number"
                        min="-1"
                        value={formData.max_products_in_catalog}
                        onChange={(e) => updateFormData('max_products_in_catalog', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_categories_per_supplier">Categorias/Fornecedor</Label>
                      <Input
                        id="max_categories_per_supplier"
                        type="number"
                        min="-1"
                        value={formData.max_categories_per_supplier}
                        onChange={(e) => updateFormData('max_categories_per_supplier', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_quote_responses_per_month">Respostas/Mês</Label>
                      <Input
                        id="max_quote_responses_per_month"
                        type="number"
                        min="-1"
                        value={formData.max_quote_responses_per_month}
                        onChange={(e) => updateFormData('max_quote_responses_per_month', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    * Use -1 para limites ilimitados
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Recursos e Funcionalidades
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Adicionar novo recurso"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button type="button" onClick={addFeature} variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                        <span className="text-sm">{feature}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeature(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {formData.features.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Zap className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum recurso adicionado ainda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modules" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Módulos do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Controle quais módulos do sistema estarão disponíveis neste plano
                  </p>

                  {MODULE_CATEGORIES.map((category) => {
                    const categoryModules = AVAILABLE_MODULES.filter(m => m.category === category.key);
                    if (categoryModules.length === 0) return null;

                    return (
                      <div key={category.key} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${category.color}`} />
                          <h4 className="font-medium">{category.name}</h4>
                          <Badge variant="outline" className="ml-auto">
                            {categoryModules.filter(m => selectedModules.includes(m.key)).length} / {categoryModules.length}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-5">
                          {categoryModules.map((module) => {
                            const Icon = module.icon;
                            return (
                              <div 
                                key={module.key} 
                                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                              >
                                <Checkbox
                                  id={`module-${module.key}`}
                                  checked={selectedModules.includes(module.key)}
                                  onCheckedChange={(checked) => handleModuleToggle(module.key, checked as boolean)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <Label 
                                    htmlFor={`module-${module.key}`}
                                    className="flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{module.name}</span>
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {module.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {selectedModules.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum módulo selecionado</p>
                      <p className="text-sm">Selecione os módulos que deseja disponibilizar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Plano
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};