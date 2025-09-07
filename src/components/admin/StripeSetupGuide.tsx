import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const StripeSetupGuide = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Finalizar Configuração do Stripe
          </CardTitle>
          <CardDescription>
            Para completar a integração dos planos de assinatura, você precisa configurar algumas informações no Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>✅ Chave Secreta Configurada:</strong> A chave secreta do Stripe já foi adicionada ao projeto.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Próximos Passos:</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Configurar Produtos no Stripe</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie produtos no Stripe Dashboard que correspondam aos planos criados no sistema.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Acessar Produtos Stripe
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Configurar Customer Portal</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ative o Customer Portal no Stripe para permitir que clientes gerenciem suas assinaturas.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <a href="https://dashboard.stripe.com/settings/billing/portal" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Configurar Portal
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Testar Pagamentos (Opcional)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use cartões de teste para verificar o fluxo completo de pagamento.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <a href="https://stripe.com/docs/testing" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Guia de Teste
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Certifique-se de estar usando as chaves corretas (teste ou produção) dependendo do ambiente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};