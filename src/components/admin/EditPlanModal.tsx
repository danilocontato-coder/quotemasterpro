import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { useToast } from '@/hooks/use-toast';

interface EditPlanModalProps {
  plan: any;
  open: boolean;
  onClose: () => void;
}

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
    features: [] as string[]
  });

  const [features, setFeatures] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (plan && open) {
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
        features: Array.isArray(plan.features) ? plan.features : []
      });
      setFeatures(Array.isArray(plan.features) ? plan.features.join('\n') : '');
    }
  }, [plan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const featuresArray = features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const planData = {
        ...formData,
        features: featuresArray,
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
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plano",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Editar Plano: {plan?.display_name}
          </DialogTitle>
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
            <div>
              <Label htmlFor="features">Funcionalidades (uma por linha)</Label>
              <Textarea
                id="features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="PDF Export&#10;Suporte prioritário&#10;API Access"
                rows={6}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Digite uma funcionalidade por linha
              </p>
            </div>
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