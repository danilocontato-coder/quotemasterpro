import React, { useState, useEffect } from 'react';
import { Check, Zap, Star, CreditCard, RefreshCw, Crown, Users, FileText, Building2, Database, Package, TrendingUp, Infinity, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UpgradeConfirmationModal } from '@/components/plans/UpgradeConfirmationModal';
import { AsaasPaymentModal } from '@/components/plans/AsaasPaymentModal';

export const PlansPage = () => {
  const { plans, isLoading } = useSupabaseSubscriptionPlans({ 
    defaultFilterAudience: 'clients' 
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    currentUsage, 
    getUsagePercentage, 
    userPlan,
    isLoading: usageLoading
  } = useSupabaseSubscriptionGuard();
  
  const [creatingCheckout, setCreatingCheckout] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [upgradeData, setUpgradeData] = useState<{
    currentPlan: string;
    newPlan: string;
    newPlanId: string;
    amountDue: number;
    daysRemaining: number;
    originalDueDate: string;
  } | null>(null);
  const [paymentData, setPaymentData] = useState<{
    payment_url?: string;
    payment_barcode?: string;
    qr_code?: string;
    subscription_id: string;
    planName?: string;
    planPrice?: number;
  } | null>(null);

  // Debug logs
  useEffect(() => {
    console.log('🎯 PlansPage - Estado atual:', {
      user: user?.email,
      clientId: user?.clientId,
      userPlan,
      usageLoading,
      currentUsage,
      plansCount: plans.length
    });
  }, [user, userPlan, usageLoading, currentUsage, plans.length]);

  const handlePlanSelection = async (planId: string, planName: string, planPrice: number) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar um plano",
        variant: "destructive",
      });
      return;
    }

    // Verificar se usuário já tem plano ativo
    const { data: currentSubscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans!plan_id(name, display_name, monthly_price)
      `)
      .eq('client_id', user.clientId)
      .eq('status', 'active')
      .single();

    // Se já tem plano, é upgrade/downgrade
    if (currentSubscription) {
      const currentPlanPrice = currentSubscription.subscription_plans.monthly_price;
      const selectedPlan = activePlans.find(p => p.id === planId);
      
      if (!selectedPlan) return;

      // Se novo plano é mais caro → UPGRADE
      if (selectedPlan.monthly_price > currentPlanPrice) {
        // Calcular preview do valor
        const periodEnd = new Date(currentSubscription.current_period_end);
        const today = new Date();
        const daysRemaining = Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const priceDiff = selectedPlan.monthly_price - currentPlanPrice;
        const amountDue = Math.round((priceDiff * daysRemaining / 30) * 100) / 100;

        // Abrir modal de confirmação
        setUpgradeData({
          currentPlan: currentSubscription.subscription_plans.display_name || currentSubscription.subscription_plans.name,
          newPlan: selectedPlan.display_name,
          newPlanId: planId,
          amountDue,
          daysRemaining,
          originalDueDate: currentSubscription.current_period_end
        });
        setShowUpgradeModal(true);
        return;
      }
      
      // Se novo plano é mais barato → DOWNGRADE
      if (selectedPlan.monthly_price < currentPlanPrice) {
        toast({
          title: "Downgrade de Plano",
          description: "Para trocar para um plano inferior, entre em contato com o suporte.",
          variant: "default"
        });
        return;
      }

      // Se preços são iguais
      toast({
        title: "Plano Atual",
        description: "Você já está neste plano.",
        variant: "default"
      });
      return;
    }

    // Se não tem plano, criar nova assinatura (usando Asaas)
    toast({
      title: "Em Desenvolvimento",
      description: "A criação de nova assinatura será implementada em breve.",
    });
  };

  const handleConfirmUpgrade = async () => {
    if (!upgradeData) return;

    setCreatingCheckout(upgradeData.newPlanId);
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { newPlanId: upgradeData.newPlanId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Fechar modal de confirmação
      setShowUpgradeModal(false);

      // Abrir modal de pagamento
      const selectedPlan = activePlans.find(p => p.id === upgradeData.newPlanId);
      setPaymentData({
        payment_url: data.payment_url,
        payment_barcode: data.payment_barcode,
        qr_code: data.qr_code,
        subscription_id: data.subscription_id,
        planName: selectedPlan?.display_name || upgradeData.newPlan,
        planPrice: data.amount_due
      });
      setShowPaymentModal(true);

      toast({
        title: "Upgrade Iniciado",
        description: `Complete o pagamento de R$ ${data.amount_due.toFixed(2)} para ativar seu novo plano.`,
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setCreatingCheckout(null);
    }
  };


  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const activePlans = plans.filter(plan => 
    plan.status === 'active' && 
    (plan.target_audience === 'clients' || plan.target_audience === 'both')
  );

  // Identificar plano atual do usuário usando userPlan
  const currentUserPlanId = userPlan?.id;
  const currentPlanPrice = userPlan?.monthly_price || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  // Limites para exibir
  const limits = [
    {
      key: 'CREATE_QUOTE',
      icon: FileText,
      label: 'Cotações/Mês',
      current: currentUsage.quotesThisMonth,
      limit: userPlan?.max_quotes_per_month || userPlan?.max_quotes || 0,
      color: 'text-blue-600'
    },
    {
      key: 'ADD_USER',
      icon: Users,
      label: 'Usuários',
      current: currentUsage.usersCount,
      limit: userPlan?.max_users_per_client || userPlan?.max_users || 0,
      color: 'text-green-600'
    },
    {
      key: 'ADD_SUPPLIER_TO_QUOTE',
      icon: Building2,
      label: 'Fornecedores/Cotação',
      current: currentUsage.suppliersPerQuote,
      limit: userPlan?.max_suppliers_per_quote || 0,
      color: 'text-purple-600'
    },
    {
      key: 'UPLOAD_FILE',
      icon: Database,
      label: 'Armazenamento (GB)',
      current: currentUsage.storageUsedGB,
      limit: userPlan?.max_storage_gb || 0,
      color: 'text-orange-600'
    }
  ];

  if (user?.role === 'supplier') {
    limits.push(
      {
        key: 'ADD_PRODUCT',
        icon: Package,
        label: 'Produtos',
        current: currentUsage.productsInCatalog,
        limit: userPlan?.max_products_in_catalog || 0,
        color: 'text-cyan-600'
      }
    );
  }

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  };

  const nearLimitCount = limits.filter(limit => {
    if (limit.limit === -1) return false;
    const percentage = getUsagePercentage(limit.key);
    return percentage >= 80 && limit.current < limit.limit;
  }).length;

  const atLimitCount = limits.filter(limit => {
    if (limit.limit === -1) return false;
    return limit.current >= limit.limit;
  }).length;

  // Debug logs
  console.log('PlansPage - userPlan:', userPlan);
  console.log('PlansPage - usageLoading:', usageLoading);
  console.log('PlansPage - currentUsage:', currentUsage);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Escolha seu Plano</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para suas necessidades e potencialize sua gestão de cotações
        </p>
      </div>

      {/* Plano Atual e Uso */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                {usageLoading ? (
                  'Carregando seu plano...'
                ) : userPlan ? (
                  `Seu Plano Atual: ${userPlan.display_name || userPlan.name}`
                ) : (
                  'Plano não configurado'
                )}
              </CardTitle>
              <CardDescription className="mt-2">
                {usageLoading ? (
                  'Aguarde enquanto carregamos os dados do seu plano'
                ) : (
                  'Acompanhe o uso dos recursos do seu plano'
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {usageLoading ? (
          <CardContent>
            <div className="space-y-4">
              <div className="h-20 bg-muted rounded animate-pulse" />
              <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        ) : userPlan ? (
          <CardContent className="space-y-4">
            {(nearLimitCount > 0 || atLimitCount > 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {atLimitCount > 0 && nearLimitCount > 0
                    ? `${atLimitCount} limite(s) atingido(s) e ${nearLimitCount} próximo(s) do máximo. Considere fazer upgrade.`
                    : atLimitCount > 0 
                      ? `${atLimitCount} limite(s) atingido(s). Faça upgrade do seu plano para continuar.`
                      : `Você está próximo do limite em ${nearLimitCount} recurso(s). Considere fazer upgrade.`}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {limits.map((item) => {
                const percentage = getUsagePercentage(item.key);
                const Icon = item.icon;
                const isUnlimited = item.limit === -1;
                const remaining = Math.max(0, item.limit - item.current);
                
                return (
                  <div key={item.key} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${item.color}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {item.current}/{formatLimit(item.limit)}
                        </span>
                        {isUnlimited && (
                          <Infinity className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                    
                    {!isUnlimited && (
                      <div className="space-y-1">
                        <Progress 
                          value={percentage} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage}% usado</span>
                          {remaining === 0 ? (
                            <span className="text-red-600 font-medium">
                              Limite atingido
                            </span>
                          ) : percentage >= 80 ? (
                            <span className="text-yellow-600 font-medium">
                              {remaining} restante{remaining !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span>
                              {remaining} restante{remaining !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Funcionalidades do Plano Atual */}
            {userPlan.features && userPlan.features.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-3">Funcionalidades Incluídas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {userPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        ) : (
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Não foi possível carregar as informações do seu plano. Por favor, entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>


      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {activePlans.map((plan) => {
          const isCurrentPlan = userPlan?.id === plan.id;
          const isPopular = plan.is_popular;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 ${
                isCurrentPlan ? 'border-primary shadow-lg scale-105' : 
                isPopular ? 'border-yellow-500 shadow-md' : ''
              }`}
            >
              {isPopular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-yellow-500 text-yellow-900">
                    <Star className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Seu Plano
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <Zap className="h-6 w-6" style={{ color: plan.custom_color }} />
                  {plan.display_name}
                </CardTitle>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
                <div className="py-4">
                  <div className="text-4xl font-bold">
                    {formatPrice(plan.monthly_price)}
                  </div>
                  <div className="text-sm text-muted-foreground">por mês</div>
                  {plan.yearly_price > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      ou {formatPrice(plan.yearly_price)}/ano
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Limites */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Limites Incluídos
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Cotações por mês</span>
                      <span className="font-medium">
                        {plan.max_quotes_per_month === -1 ? 'Ilimitado' : plan.max_quotes_per_month}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Usuários por cliente</span>
                      <span className="font-medium">
                        {plan.max_users_per_client === -1 ? 'Ilimitado' : plan.max_users_per_client}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Produtos no catálogo</span>
                      <span className="font-medium">
                        {plan.max_products_in_catalog === -1 ? 'Ilimitado' : plan.max_products_in_catalog}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Armazenamento</span>
                      <span className="font-medium">{plan.max_storage_gb} GB</span>
                    </div>
                  </div>
                </div>

                {/* Funcionalidades */}
                {plan.features && plan.features.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Funcionalidades
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Botão de Ação */}
                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    onClick={() => handlePlanSelection(plan.id, plan.display_name, plan.monthly_price)}
                    disabled={creatingCheckout === plan.id || isCurrentPlan}
                    variant={isCurrentPlan ? "outline" : "default"}
                    style={!isCurrentPlan ? { backgroundColor: plan.custom_color } : undefined}
                  >
                    {isCurrentPlan ? (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        Seu Plano Atual
                      </>
                    ) : creatingCheckout === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {userPlan && plan.monthly_price > currentPlanPrice 
                          ? 'Fazer Upgrade' 
                          : 'Assinar Agora'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Informações Adicionais */}
      <div className="text-center space-y-4 pt-8">
        <p className="text-sm text-muted-foreground">
          Todas as assinaturas incluem suporte técnico e atualizações automáticas
        </p>
        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          <span>✓ Sem taxa de setup</span>
          <span>✓ Cancele a qualquer momento</span>
          <span>✓ Upgrade/downgrade instantâneo</span>
        </div>
      </div>

      {/* Modal de Confirmação de Upgrade */}
      {showUpgradeModal && upgradeData && (
        <UpgradeConfirmationModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onConfirm={handleConfirmUpgrade}
          currentPlan={upgradeData.currentPlan}
          newPlan={upgradeData.newPlan}
          amountDue={upgradeData.amountDue}
          daysRemaining={upgradeData.daysRemaining}
          originalDueDate={upgradeData.originalDueDate}
          isLoading={creatingCheckout !== null}
        />
      )}

      {/* Modal de Pagamento Asaas */}
      {showPaymentModal && paymentData && (
        <AsaasPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          planName={paymentData.planName || ''}
          planPrice={paymentData.planPrice || 0}
          paymentData={paymentData}
        />
      )}
    </div>
  );
};

export default PlansPage;