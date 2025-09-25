import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Gift
} from 'lucide-react';
import { useSupabaseFinancial } from '@/hooks/useSupabaseFinancial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount?: number;
  minimum_purchase_amount: number;
  usage_limit?: number;
  usage_count: number;
  starts_at: string;
  expires_at?: string;
  active: boolean;
  target_plans: string[];
  description?: string;
}

export function CouponIntegrationPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    max_discount_amount: 0,
    minimum_purchase_amount: 0,
    usage_limit: 0,
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    target_plans: [] as string[],
    description: ''
  });

  // Carregar cupons
  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data as Coupon[] || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      max_discount_amount: 0,
      minimum_purchase_amount: 0,
      usage_limit: 0,
      starts_at: new Date().toISOString().split('T')[0],
      expires_at: '',
      target_plans: [],
      description: ''
    });
    setEditingCoupon(null);
    setShowCreateForm(false);
  };

  const handleSaveCoupon = async () => {
    try {
      const couponData = {
        ...formData,
        name: formData.code, // Adding required name field
        expires_at: formData.expires_at || null,
        usage_limit: formData.usage_limit || null,
        max_discount_amount: formData.max_discount_amount || null
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);
        
        if (error) throw error;
        toast.success('Cupom atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert(couponData);
        
        if (error) throw error;
        toast.success('Cupom criado com sucesso');
      }

      resetForm();
      await loadCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('Erro ao salvar cupom');
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount_amount: coupon.max_discount_amount || 0,
      minimum_purchase_amount: coupon.minimum_purchase_amount,
      usage_limit: coupon.usage_limit || 0,
      starts_at: coupon.starts_at.split('T')[0],
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      target_plans: coupon.target_plans,
      description: coupon.description || ''
    });
    setEditingCoupon(coupon);
    setShowCreateForm(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Cupom excluído com sucesso');
      await loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Erro ao excluir cupom');
    }
  };

  const toggleCouponStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Cupom ${!active ? 'ativado' : 'desativado'} com sucesso`);
      await loadCoupons();
    } catch (error) {
      console.error('Error toggling coupon:', error);
      toast.error('Erro ao alterar status do cupom');
    }
  };

  const activeCoupons = coupons.filter(c => c.active).length;
  const totalUsage = coupons.reduce((sum, c) => sum + c.usage_count, 0);
  const expiringSoon = coupons.filter(c => {
    if (!c.expires_at) return false;
    const expires = new Date(c.expires_at);
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return expires <= soon && expires >= new Date();
  }).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            <div>
              <CardTitle>Gestão de Cupons</CardTitle>
              <CardDescription>
                Gerencie cupons de desconto para assinaturas
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cupom
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Tag className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{coupons.length}</p>
            <p className="text-xs text-muted-foreground">Total Cupons</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Gift className="h-6 w-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{activeCoupons}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <TrendingUp className="h-6 w-6 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{totalUsage}</p>
            <p className="text-xs text-muted-foreground">Usos Total</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Calendar className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold">{expiringSoon}</p>
            <p className="text-xs text-muted-foreground">Expirando</p>
          </div>
        </div>

        {/* Formulário de Criação/Edição */}
        {showCreateForm && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-code">Código do Cupom</Label>
                  <Input
                    id="coupon-code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="DESCONTO10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Tipo de Desconto</Label>
                  <Select 
                    value={formData.discount_type} 
                    onValueChange={(value: 'percentage' | 'fixed_amount') => setFormData(prev => ({ ...prev, discount_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem</SelectItem>
                      <SelectItem value="fixed_amount">Valor Fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-value">
                    Valor do Desconto {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                  </Label>
                  <Input
                    id="discount-value"
                    type="number"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-discount">Desconto Máximo (R$)</Label>
                  <Input
                    id="max-discount"
                    type="number"
                    step="0.01"
                    value={formData.max_discount_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: parseFloat(e.target.value) }))}
                    disabled={formData.discount_type === 'fixed_amount'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-purchase">Compra Mínima (R$)</Label>
                  <Input
                    id="min-purchase"
                    type="number"
                    step="0.01"
                    value={formData.minimum_purchase_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_purchase_amount: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usage-limit">Limite de Uso</Label>
                  <Input
                    id="usage-limit"
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: parseInt(e.target.value) }))}
                    placeholder="0 = ilimitado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starts-at">Data de Início</Label>
                  <Input
                    id="starts-at"
                    type="date"
                    value={formData.starts_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires-at">Data de Expiração</Label>
                  <Input
                    id="expires-at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do cupom..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveCoupon}>
                  {editingCoupon ? 'Atualizar' : 'Criar'} Cupom
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Cupons */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Cupons Existentes</h3>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando cupons...</p>
          ) : coupons.length === 0 ? (
            <p className="text-muted-foreground">Nenhum cupom criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={coupon.active ? "default" : "secondary"}>
                      {coupon.code}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}% de desconto`
                          : `R$ ${coupon.discount_value.toFixed(2)} de desconto`
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Usado {coupon.usage_count} vezes
                        {coupon.usage_limit && ` / ${coupon.usage_limit} máximo`}
                        {coupon.expires_at && ` • Expira em ${new Date(coupon.expires_at).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={coupon.active}
                      onCheckedChange={() => toggleCouponStatus(coupon.id, coupon.active)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleEditCoupon(coupon)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCoupon(coupon.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}