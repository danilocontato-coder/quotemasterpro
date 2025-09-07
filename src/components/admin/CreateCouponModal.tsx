import React, { useState, useEffect } from 'react';
import { X, Calendar, Percent, DollarSign, Users, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useCoupons } from '@/hooks/useCoupons';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';

interface CreateCouponModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateCouponModal = ({ open, onClose }: CreateCouponModalProps) => {
  const { createCoupon } = useCoupons();
  const { plans } = useSupabaseSubscriptionPlans();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    max_discount_amount: 0,
    minimum_purchase_amount: 0,
    usage_limit: 0,
    target_plans: [] as string[],
    target_audience: 'all' as 'all' | 'new_customers' | 'existing_customers',
    active: true,
    starts_at: '',
    expires_at: '',
  });

  const [hasUsageLimit, setHasUsageLimit] = useState(false);
  const [hasMaxDiscount, setHasMaxDiscount] = useState(false);
  const [hasMinPurchase, setHasMinPurchase] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);

  useEffect(() => {
    if (open) {
      // Resetar form quando modal abre
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      
      setFormData({
        code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_discount_amount: 0,
        minimum_purchase_amount: 0,
        usage_limit: 0,
        target_plans: [],
        target_audience: 'all',
        active: true,
        starts_at: now.toISOString().slice(0, 16),
        expires_at: '',
      });
      setHasUsageLimit(false);
      setHasMaxDiscount(false);
      setHasMinPurchase(false);
      setHasExpiration(false);
    }
  }, [open]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        ...formData,
        max_discount_amount: hasMaxDiscount && formData.max_discount_amount > 0 ? formData.max_discount_amount : undefined,
        minimum_purchase_amount: hasMinPurchase ? formData.minimum_purchase_amount : 0,
        usage_limit: hasUsageLimit && formData.usage_limit > 0 ? formData.usage_limit : undefined,
        expires_at: hasExpiration && formData.expires_at ? formData.expires_at : undefined,
      };

      await createCoupon(submitData);
      onClose();
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanToggle = (planId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      target_plans: checked 
        ? [...prev.target_plans, planId]
        : prev.target_plans.filter(id => id !== planId)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Criar Novo Cupom
          </DialogTitle>
          <DialogDescription>
            Configure um novo cupom de desconto para os planos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Código do Cupom *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="DESCONTO10"
                    required
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Gerar
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Nome do Cupom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Desconto de 10%"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional do cupom..."
                rows={2}
              />
            </div>
          </div>

          {/* Configuração de Desconto */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Configuração de Desconto
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_type">Tipo de Desconto *</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(value: 'percentage' | 'fixed_amount') => 
                    setFormData(prev => ({ ...prev, discount_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discount_value">
                  Valor do Desconto * 
                  {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                  min="0"
                  step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                  required
                />
              </div>
            </div>

            {formData.discount_type === 'percentage' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasMaxDiscount"
                  checked={hasMaxDiscount}
                onCheckedChange={(checked) => setHasMaxDiscount(checked as boolean)}
                />
                <Label htmlFor="hasMaxDiscount">Definir valor máximo de desconto</Label>
              </div>
            )}

            {hasMaxDiscount && formData.discount_type === 'percentage' && (
              <div>
                <Label htmlFor="max_discount_amount">Valor Máximo de Desconto (R$)</Label>
                <Input
                  id="max_discount_amount"
                  type="number"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Restrições */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Restrições e Limites
            </h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasMinPurchase"
                checked={hasMinPurchase}
                onCheckedChange={(checked) => setHasMinPurchase(checked as boolean)}
              />
              <Label htmlFor="hasMinPurchase">Valor mínimo de compra</Label>
            </div>

            {hasMinPurchase && (
              <div>
                <Label htmlFor="minimum_purchase_amount">Valor Mínimo (R$)</Label>
                <Input
                  id="minimum_purchase_amount"
                  type="number"
                  value={formData.minimum_purchase_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_purchase_amount: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasUsageLimit"
                  checked={hasUsageLimit}
                  onCheckedChange={(checked) => setHasUsageLimit(checked as boolean)}
              />
              <Label htmlFor="hasUsageLimit">Limite de uso</Label>
            </div>

            {hasUsageLimit && (
              <div>
                <Label htmlFor="usage_limit">Máximo de Usos</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: Number(e.target.value) }))}
                  min="1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="target_audience">Público-Alvo</Label>
              <Select 
                value={formData.target_audience} 
                onValueChange={(value: 'all' | 'new_customers' | 'existing_customers') => 
                  setFormData(prev => ({ ...prev, target_audience: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="new_customers">Apenas novos clientes</SelectItem>
                  <SelectItem value="existing_customers">Apenas clientes existentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Planos Específicos */}
          <div className="space-y-4">
            <h4 className="font-medium">Planos Específicos</h4>
            <p className="text-sm text-muted-foreground">
              Deixe vazio para aplicar a todos os planos
            </p>
            <div className="grid grid-cols-2 gap-2">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`plan-${plan.id}`}
                    checked={formData.target_plans.includes(plan.id)}
                    onCheckedChange={(checked) => handlePlanToggle(plan.id, checked as boolean)}
                  />
                  <Label htmlFor={`plan-${plan.id}`} className="text-sm">
                    {plan.display_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Datas */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período de Validade
            </h4>

            <div>
              <Label htmlFor="starts_at">Data de Início *</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasExpiration"
                checked={hasExpiration}
                onCheckedChange={(checked) => setHasExpiration(checked as boolean)}
              />
              <Label htmlFor="hasExpiration">Definir data de expiração</Label>
            </div>

            {hasExpiration && (
              <div>
                <Label htmlFor="expires_at">Data de Expiração</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  min={formData.starts_at}
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Cupom ativo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Cupom'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};