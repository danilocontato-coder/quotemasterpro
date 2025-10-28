import React from 'react';
import { AlertTriangle, CreditCard, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useBillingCycle } from '@/hooks/useBillingCycle';

export default function SuspendedAccount() {
  const navigate = useNavigate();
  const { cycleInfo } = useBillingCycle();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Conta Suspensa</CardTitle>
          <CardDescription>
            Sua assinatura foi suspensa devido a inadimplência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Motivo:</strong> Pagamento não identificado
            </p>
            {cycleInfo?.daysUntilRenewal !== undefined && (
              <p className="text-sm text-muted-foreground">
                <strong>Dias em atraso:</strong> {Math.abs(cycleInfo.daysUntilRenewal)} dias
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Como regularizar?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Acesse suas faturas pendentes</li>
              <li>Realize o pagamento da(s) fatura(s) em aberto</li>
              <li>Aguarde até 24h para confirmação do pagamento</li>
              <li>Sua conta será reativada automaticamente</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate('/billing')} 
              className="flex-1"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Ver Faturas
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('mailto:suporte@cotiz.com', '_blank')}
              className="flex-1"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contatar Suporte
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>Precisa de ajuda? Entre em contato:</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <a href="tel:+5571999990000" className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-4 w-4" />
                (71) 99999-0000
              </a>
              <a href="mailto:suporte@cotiz.com" className="flex items-center gap-1 hover:text-primary">
                <Mail className="h-4 w-4" />
                suporte@cotiz.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
