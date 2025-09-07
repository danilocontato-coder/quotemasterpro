import React, { useState, useEffect } from 'react';
import { Check, Zap, Star, CreditCard, RefreshCw, Settings, Crown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  current_plan_id?: string;
}

export const PlansPage = () => {
  const { plans, isLoading } = useSupabaseSubscriptionPlans();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false
  });
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [creatingCheckout, setCreatingCheckout] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;
    
    setCheckingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Erro ao verificar assinatura:', error);
        return;
      }
      
      setSubscriptionStatus(data || { subscribed: false });
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handlePlanSelection = async (planId: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar um plano",
        variant: "destructive",
      });
      return;
    }

    setCreatingCheckout(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId }
      });
      
      if (error) {
        throw error;
      }
      
      // Abrir checkout do Stripe em nova aba
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível iniciar o checkout",
        variant: "destructive",
      });
    } finally {
      setCreatingCheckout(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível acessar o portal de gerenciamento",
        variant: "destructive",
      });
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

  const activePlans = plans.filter(plan => plan.status === 'active');
  const currentPlan = activePlans.find(plan => 
    plan.name === subscriptionStatus.subscription_tier?.toLowerCase()
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Escolha seu Plano</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para suas necessidades e potencialize sua gestão de cotações
        </p>
      </div>

      {/* Status da Assinatura */}
      {subscriptionStatus.subscribed && (
        <Alert className="max-w-2xl mx-auto">
          <Crown className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Assinatura Ativa:</strong> {subscriptionStatus.subscription_tier}
              {subscriptionStatus.subscription_end && (
                <span className="ml-2 text-sm text-muted-foreground">
                  • Renovação: {formatDate(subscriptionStatus.subscription_end)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkSubscriptionStatus}
                disabled={checkingSubscription}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${checkingSubscription ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
              >
                <Settings className="h-3 w-3 mr-1" />
                Gerenciar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {activePlans.map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id;
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

                {/* Estatísticas */}
                {plan.clients_subscribed > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {plan.clients_subscribed} {plan.clients_subscribed === 1 ? 'cliente ativo' : 'clientes ativos'}
                    </div>
                  </div>
                )}

                {/* Botão de Ação */}
                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={handleManageSubscription}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Gerenciar Assinatura
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => handlePlanSelection(plan.id)}
                      disabled={creatingCheckout === plan.id}
                      style={{ backgroundColor: plan.custom_color }}
                    >
                      {creatingCheckout === plan.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          {subscriptionStatus.subscribed ? 'Alterar Plano' : 'Assinar Agora'}
                        </>
                      )}
                    </Button>
                  )}
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
    </div>
  );
};