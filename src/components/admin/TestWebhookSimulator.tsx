import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap,
  DollarSign,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Calendar,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  webhookPayloadTemplates, 
  getPayloadDescription, 
  getExpectedActions 
} from '@/lib/webhook-payloads';

interface TestResult {
  timestamp: string;
  event: string;
  status: 'success' | 'error';
  duration: number;
  response: any;
  actions: string[];
}

const eventIcons: Record<string, any> = {
  PAYMENT_RECEIVED: DollarSign,
  PAYMENT_CONFIRMED: CheckCircle2,
  PAYMENT_OVERDUE: AlertTriangle,
  PAYMENT_DELETED: Trash2,
  SUBSCRIPTION_UPDATED: RefreshCw,
  SUBSCRIPTION_EXPIRED: Calendar
};

const eventColors: Record<string, string> = {
  PAYMENT_RECEIVED: 'bg-green-500/10 text-green-700 border-green-500/20',
  PAYMENT_CONFIRMED: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  PAYMENT_OVERDUE: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  PAYMENT_DELETED: 'bg-red-500/10 text-red-700 border-red-500/20',
  SUBSCRIPTION_UPDATED: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  SUBSCRIPTION_EXPIRED: 'bg-gray-500/10 text-gray-700 border-gray-500/20'
};

export function TestWebhookSimulator() {
  const [selectedEvent, setSelectedEvent] = useState<string>('PAYMENT_RECEIVED');
  const [payload, setPayload] = useState<string>(
    JSON.stringify(webhookPayloadTemplates.PAYMENT_RECEIVED, null, 2)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const handleQuickTest = (eventType: string) => {
    setSelectedEvent(eventType);
    setPayload(JSON.stringify(webhookPayloadTemplates[eventType], null, 2));
  };

  const handleSendTest = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Validar JSON
      const parsedPayload = JSON.parse(payload);
      
      // Chamar edge function de teste
      const { data, error } = await supabase.functions.invoke('test-asaas-webhook', {
        body: parsedPayload
      });

      const duration = Date.now() - startTime;

      if (error) throw error;

      const result: TestResult = {
        timestamp: new Date().toISOString(),
        event: parsedPayload.event,
        status: 'success',
        duration,
        response: data,
        actions: data.actions || []
      };

      setTestResults([result, ...testResults]);
      toast.success(`Teste concluído em ${duration}ms`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        timestamp: new Date().toISOString(),
        event: selectedEvent,
        status: 'error',
        duration,
        response: { error: error.message },
        actions: []
      };

      setTestResults([result, ...testResults]);
      toast.error('Erro no teste: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Aviso de segurança */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Modo de Teste:</strong> Os testes simulados não afetam dados reais no banco de dados.
          Use esta ferramenta para validar a estrutura dos webhooks antes de ir para produção.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Painel de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Simulador de Webhook
            </CardTitle>
            <CardDescription>
              Selecione um cenário rápido ou edite o payload manualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cenários Rápidos */}
            <div>
              <label className="text-sm font-medium mb-2 block">Cenários Rápidos</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(webhookPayloadTemplates).map((eventType) => {
                  const Icon = eventIcons[eventType];
                  return (
                    <Button
                      key={eventType}
                      variant={selectedEvent === eventType ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleQuickTest(eventType)}
                      className="justify-start gap-2 text-xs"
                    >
                      <Icon className="h-3 w-3" />
                      {eventType.replace('PAYMENT_', '').replace('SUBSCRIPTION_', '')}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Descrição do Evento */}
            <Alert className={eventColors[selectedEvent]}>
              <AlertDescription className="text-xs">
                {getPayloadDescription(selectedEvent)}
              </AlertDescription>
            </Alert>

            {/* Editor de Payload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Payload JSON</label>
              <Textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="font-mono text-xs h-64"
                placeholder='{"event": "PAYMENT_RECEIVED", ...}'
              />
            </div>

            {/* Botão de Teste */}
            <Button
              onClick={handleSendTest}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Enviar Teste
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Painel de Resultados */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados dos Testes</CardTitle>
            <CardDescription>
              {testResults.length > 0 
                ? `${testResults.length} teste(s) realizado(s)` 
                : 'Nenhum teste realizado ainda'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {testResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Execute um teste para ver os resultados aqui</p>
                  </div>
                ) : (
                  testResults.map((result, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {result.status === 'success' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{result.event}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimestamp(result.timestamp)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {result.duration}ms
                          </Badge>
                        </div>

                        {/* Ações Executadas */}
                        {result.status === 'success' && result.actions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Ações Simuladas:
                            </p>
                            <ul className="space-y-1">
                              {result.actions.map((action, i) => (
                                <li key={i} className="text-xs flex items-start gap-2">
                                  <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Erro */}
                        {result.status === 'error' && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription className="text-xs">
                              {result.response.error}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Detalhes da Resposta */}
                        {result.response.details && (
                          <details className="mt-3">
                            <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver detalhes técnicos
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                              {JSON.stringify(result.response.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Ações Esperadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações Esperadas para {selectedEvent}</CardTitle>
          <CardDescription>
            O que deve acontecer quando este evento é processado em produção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {getExpectedActions(selectedEvent).map((action, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
