import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { useToast } from '@/hooks/use-toast';
import { AVAILABLE_MODULES, MODULE_CATEGORIES } from '@/constants/modules';

interface EditPlanModalProps {
  plan: any;
  open: boolean;
  onClose: () => void;
}

// Lista de funcionalidades disponíveis
const AVAILABLE_FEATURES = [
  'Export PDF de Cotações',
  'Suporte por Email',
  'Suporte por WhatsApp',
  'Suporte Prioritário',
  'API Access',
  'Integração WhatsApp',
  'Integração Email Marketing',
  'Relatórios Avançados',
  'Dashboard Personalizado',
  'Múltiplos Usuários',
  'Gestão de Fornecedores',
  'Aprovações Múltiplas',
  'Centros de Custo',
  'Auditoria Completa',
  'Backup Automático',
  'SLA Garantido',
  'Treinamento Personalizado',
  'Onboarding Dedicado',
  'Custom Branding',
  'Domínio Personalizado',
  'White Label',
  'Analytics Avançados',
  'Integrações Personalizadas'
];

export const EditPlanModal = ({ plan, open, onClose }: EditPlanModalProps) => {
  const { updatePlan } = useSupabaseSubscriptionPlans();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    monthly_price: 0,
    yearly_price: 0,
    max_quotes_per_month: 50,
    max_users_per_client: 3,
    max_suppliers_per_quote: 5,
    max_quote_responses_per_month: 50,
    max_products_in_catalog: 100,
    max_categories_per_supplier: 10,
    max_storage_gb: 5,
    target_audience: 'clients',
    status: 'active',
    is_popular: false,
    allow_branding: false,
    allow_custom_domain: false,
    custom_color: '#3b82f6',
    features: [] as string[],
    enabled_modules: [] as string[]
  });

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (plan && open) {
      const planFeatures = Array.isArray(plan.features) ? plan.features : [];
      const planModules = Array.isArray(plan.enabled_modules) ? plan.enabled_modules : [];
      
      setFormData({
        name: plan.name || '',
        display_name: plan.display_name || '',
        description: plan.description || '',
        monthly_price: plan.monthly_price || 0,
        yearly_price: plan.yearly_price || 0,
        max_quotes_per_month: plan.max_quotes_per_month || 50,
        max_users_per_client: plan.max_users_per_client || 3,
        max_suppliers_per_quote: plan.max_suppliers_per_quote || 5,
        max_quote_responses_per_month: plan.max_quote_responses_per_month || 50,
        max_products_in_catalog: plan.max_products_in_catalog || 100,
        max_categories_per_supplier: plan.max_categories_per_supplier || 10,
        max_storage_gb: plan.max_storage_gb || 5,
        target_audience: plan.target_audience || 'clients',
        status: plan.status || 'active',
        is_popular: plan.is_popular || false,
        allow_branding: plan.allow_branding || false,
        allow_custom_domain: plan.allow_custom_domain || false,
        custom_color: plan.custom_color || '#3b82f6',
        features: planFeatures,
        enabled_modules: planModules
      });
      
      setSelectedFeatures(planFeatures);
      setSelectedModules(planModules);
    }
  }, [plan, open]);

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    if (checked) {
      setSelectedFeatures(prev => [...prev, feature]);
    } else {
      setSelectedFeatures(prev => prev.filter(f => f !== feature));
    }
  };

  const handleModuleToggle = (moduleKey: string, checked: boolean) => {
    if (checked) {
      setSelectedModules(prev => [...prev, moduleKey]);
    } else {
      setSelectedModules(prev => prev.filter(m => m !== moduleKey));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Dados do plano sendo enviados:', {
        planId: plan?.id,
        formData,
        selectedFeatures
      });

      if (!plan?.id) {
        throw new Error('ID do plano não encontrado');
      }

      const planData = {
        ...formData,
        features: selectedFeatures,
        enabled_modules: selectedModules,
        target_audience: formData.target_audience as 'clients' | 'suppliers' | 'both',
        status: formData.status as 'active' | 'inactive'
      };

      await updatePlan(plan.id, planData);
      
      toast({
        title: "Sucesso",
        description: "Plano atualizado com sucesso",
      });
      
      onClose();
    } catch (error) {
      console.error('Erro detalhado ao atualizar plano:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o plano",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]" aria-describedby="edit-plan-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Editar Plano: {plan?.display_name}
          </DialogTitle>
          <p id="edit-plan-description" className="text-sm text-muted-foreground">
            Atualize as configurações, preços e recursos deste plano de assinatura
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Plano (ID)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: basic, premium, enterprise"
                  required
                />
              </div>
              <div>
                <Label htmlFor="display_name">Nome de Exibição</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Ex: Plano Básico"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do plano..."
                rows={3}
              />
            </div>
          </div>

          {/* Preços */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Preços</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_price">Preço Mensal (R$)</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                  placeholder="99.90"
                  required
                />
              </div>
              <div>
                <Label htmlFor="yearly_price">Preço Anual (R$)</Label>
                <Input
                  id="yearly_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.yearly_price}
                  onChange={(e) => setFormData({ ...formData, yearly_price: parseFloat(e.target.value) || 0 })}
                  placeholder="999.90"
                />
              </div>
            </div>
          </div>

          {/* Limites */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Limites do Plano</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_quotes_per_month">Cotações/Mês</Label>
                <Input
                  id="max_quotes_per_month"
                  type="number"
                  min="-1"
                  value={formData.max_quotes_per_month}
                  onChange={(e) => setFormData({ ...formData, max_quotes_per_month: parseInt(e.target.value) || 0 })}
                  placeholder="-1 para ilimitado"
                />
              </div>
              <div>
                <Label htmlFor="max_users_per_client">Usuários/Cliente</Label>
                <Input
                  id="max_users_per_client"
                  type="number"
                  min="-1"
                  value={formData.max_users_per_client}
                  onChange={(e) => setFormData({ ...formData, max_users_per_client: parseInt(e.target.value) || 0 })}
                  placeholder="-1 para ilimitado"
                />
              </div>
              <div>
                <Label htmlFor="max_suppliers_per_quote">Fornecedores/Cotação</Label>
                <Input
                  id="max_suppliers_per_quote"
                  type="number"
                  min="-1"
                  value={formData.max_suppliers_per_quote}
                  onChange={(e) => setFormData({ ...formData, max_suppliers_per_quote: parseInt(e.target.value) || 0 })}
                  placeholder="-1 para ilimitado"
                />
              </div>
              <div>
                <Label htmlFor="max_products_in_catalog">Produtos no Catálogo</Label>
                <Input
                  id="max_products_in_catalog"
                  type="number"
                  min="-1"
                  value={formData.max_products_in_catalog}
                  onChange={(e) => setFormData({ ...formData, max_products_in_catalog: parseInt(e.target.value) || 0 })}
                  placeholder="-1 para ilimitado"
                />
              </div>
              <div>
                <Label htmlFor="max_storage_gb">Armazenamento (GB)</Label>
                <Input
                  id="max_storage_gb"
                  type="number"
                  min="0"
                  value={formData.max_storage_gb}
                  onChange={(e) => setFormData({ ...formData, max_storage_gb: parseInt(e.target.value) || 0 })}
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configurações</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_audience">Público Alvo</Label>
                <Select 
                  value={formData.target_audience} 
                  onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clients">Clientes</SelectItem>
                    <SelectItem value="suppliers">Fornecedores</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="deprecated">Descontinuado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_popular">Plano Popular</Label>
                <Switch
                  id="is_popular"
                  checked={formData.is_popular}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow_branding">Permitir Personalização</Label>
                <Switch
                  id="allow_branding"
                  checked={formData.allow_branding}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_branding: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow_custom_domain">Domínio Personalizado</Label>
                <Switch
                  id="allow_custom_domain"
                  checked={formData.allow_custom_domain}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_custom_domain: checked })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="custom_color">Cor Personalizada</Label>
              <Input
                id="custom_color"
                type="color"
                value={formData.custom_color}
                onChange={(e) => setFormData({ ...formData, custom_color: e.target.value })}
                className="h-10"
              />
            </div>
          </div>

          {/* Funcionalidades */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Funcionalidades Incluídas</h3>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
              {AVAILABLE_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feature-${feature}`}
                    checked={selectedFeatures.includes(feature)}
                    onCheckedChange={(checked) => handleFeatureToggle(feature, checked as boolean)}
                  />
                  <Label 
                    htmlFor={`feature-${feature}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {feature}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Selecione as funcionalidades que estarão disponíveis neste plano
            </p>
          </div>

          <Separator />

          {/* Módulos do Sistema */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Módulos Ativos</h3>
              <p className="text-sm text-muted-foreground">
                Controle quais módulos do sistema estarão disponíveis neste plano
              </p>
            </div>

            {MODULE_CATEGORIES.map((category) => {
              const categoryModules = AVAILABLE_MODULES.filter(m => m.category === category.key);
              if (categoryModules.length === 0) return null;

              return (
                <div key={category.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${category.color}`} />
                    <h4 className="font-medium">{category.name}</h4>
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
                              className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <span>{module.name}</span>
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

            {selectedModules.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Módulos selecionados ({selectedModules.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedModules.map((moduleKey) => {
                    const module = AVAILABLE_MODULES.find(m => m.key === moduleKey);
                    if (!module) return null;
                    const Icon = module.icon;
                    return (
                      <Badge key={moduleKey} variant="secondary" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {module.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};