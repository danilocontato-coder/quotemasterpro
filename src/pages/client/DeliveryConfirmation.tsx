import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Key, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeliveryConfirmation() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Confirmação de Entrega
          </h1>
          <p className="text-muted-foreground">
            Como funciona o processo de confirmação
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Processo de Confirmação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Package className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Novo fluxo de confirmação
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  Agora você recebe um código de confirmação quando a entrega é agendada. 
                  Ao receber seus produtos, <strong>informe este código ao entregador</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Como funciona:</h4>
              
              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Fornecedor agenda a entrega</p>
                    <p className="text-sm text-muted-foreground">
                      Você recebe um código de 6 dígitos por e-mail e WhatsApp
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Entrega é realizada</p>
                    <p className="text-sm text-muted-foreground">
                      Ao receber os produtos, informe o código ao entregador
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Fornecedor confirma no sistema</p>
                    <p className="text-sm text-muted-foreground">
                      Com o código que você informou, o fornecedor confirma a entrega
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Pagamento liberado</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      O pagamento é transferido automaticamente para o fornecedor
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => navigate('/client/deliveries')} className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Ver Minhas Entregas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
