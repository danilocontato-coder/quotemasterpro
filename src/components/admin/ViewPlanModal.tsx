import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Users, 
  Package, 
  Truck, 
  Building2, 
  Star, 
  CheckCircle2,
  Crown,
  Percent,
  Calendar,
  DollarSign
} from 'lucide-react';

interface ViewPlanModalProps {
  plan: any;
  open: boolean;
  onClose: () => void;
}

export const ViewPlanModal = ({ plan, open, onClose }: ViewPlanModalProps) => {
  if (!plan) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateYearlyDiscount = (monthly: number, yearly: number) => {
    if (!monthly || monthly === 0) return 0;
    const yearlyExpected = monthly * 12;
    if (yearly >= yearlyExpected) return 0;
    return Math.round(((yearlyExpected - yearly) / yearlyExpected) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100]" aria-describedby="view-plan-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detalhes do Plano: {plan.display_name}
          </DialogTitle>
          <p id="view-plan-description" className="text-sm text-muted-foreground">
            Visualize todas as informações, limites, recursos e estatísticas deste plano
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID do Plano</label>
                  <p className="text-sm">{plan.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="text-sm">{plan.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome de Exibição</label>
                  <p className="text-sm font-semibold">{plan.display_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2">
                    <Badge className={plan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {plan.is_popular && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Popular
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm mt-1">{plan.description || 'Sem descrição'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Público Alvo</label>
                <Badge variant="outline" className="ml-2">
                  {plan.target_audience === 'clients' && 'Clientes'}
                  {plan.target_audience === 'suppliers' && 'Fornecedores'}
                  {plan.target_audience === 'both' && 'Clientes e Fornecedores'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Preços */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Preços e Descontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Plano Mensal</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(plan.monthly_price)}
                  </div>
                  <div className="text-sm text-muted-foreground">/mês</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Plano Anual</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(plan.yearly_price)}
                  </div>
                  <div className="text-sm text-muted-foreground">/ano</div>
                  {calculateYearlyDiscount(plan.monthly_price, plan.yearly_price) > 0 && (
                    <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                      <Percent className="h-3 w-3 mr-1" />
                      {calculateYearlyDiscount(plan.monthly_price, plan.yearly_price)}% desconto
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limites e Recursos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Limites do Plano
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cotações/mês:</span>
                  <span className="font-semibold text-primary">
                    {plan.max_quotes_per_month === -1 ? '∞' : plan.max_quotes_per_month || plan.max_quotes || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Usuários/cliente:</span>
                  <span className="font-semibold text-primary">
                    {plan.max_users_per_client === -1 ? '∞' : plan.max_users_per_client || plan.max_users || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fornecedores/cotação:</span>
                  <span className="font-semibold text-primary">
                    {plan.max_suppliers_per_quote === -1 ? '∞' : plan.max_suppliers_per_quote || plan.max_suppliers || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Produtos no catálogo:</span>
                  <span className="font-semibold text-primary">
                    {plan.max_products_in_catalog === -1 ? '∞' : plan.max_products_in_catalog || 100}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Armazenamento:</span>
                  <span className="font-semibold text-primary">{plan.max_storage_gb || 5}GB</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Funcionalidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma funcionalidade específica listada
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Personalização:</span>
                    <Badge variant={plan.allow_branding ? "default" : "secondary"}>
                      {plan.allow_branding ? 'Permitida' : 'Não permitida'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Domínio personalizado:</span>
                    <Badge variant={plan.allow_custom_domain ? "default" : "secondary"}>
                      {plan.allow_custom_domain ? 'Permitido' : 'Não permitido'}
                    </Badge>
                  </div>
                  {plan.custom_color && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cor personalizada:</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: plan.custom_color }}
                        />
                        <span className="text-xs font-mono">{plan.custom_color}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Estatísticas de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {plan.clients_subscribed || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Clientes Ativos</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(plan.total_revenue || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Receita Total</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {plan.suppliers_subscribed || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Fornecedores</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informações de Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Criado em:</label>
                  <p>{plan.created_at ? new Date(plan.created_at).toLocaleString('pt-BR') : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Última atualização:</label>
                  <p>{plan.updated_at ? new Date(plan.updated_at).toLocaleString('pt-BR') : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};