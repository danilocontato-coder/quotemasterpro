import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Phone, 
  Clock, 
  User, 
  Bot, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Download,
  Copy
} from 'lucide-react';
import { AINegotiation } from '@/hooks/useAINegotiation';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NegotiationLogModalProps {
  open: boolean;
  onClose: () => void;
  negotiation: AINegotiation | null;
}

export function NegotiationLogModal({ open, onClose, negotiation }: NegotiationLogModalProps) {
  const { toast } = useToast();

  if (!negotiation) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  const exportLog = () => {
    const logData = {
      negotiation_id: negotiation.id,
      quote_id: negotiation.quote_id,
      status: negotiation.status,
      original_amount: negotiation.original_amount,
      negotiated_amount: negotiation.negotiated_amount,
      discount_percentage: negotiation.discount_percentage,
      conversation_log: negotiation.conversation_log,
      ai_analysis: negotiation.ai_analysis,
      negotiation_strategy: negotiation.negotiation_strategy,
      created_at: negotiation.created_at,
      updated_at: negotiation.updated_at,
      completed_at: negotiation.completed_at
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `negociacao-${negotiation.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Log exportado!",
      description: "O log da negociação foi baixado como arquivo JSON",
    });
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'ai':
        return <Bot className="h-4 w-4 text-blue-600" />;
      case 'supplier':
        return <User className="h-4 w-4 text-green-600" />;
      case 'system':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getMessageBgColor = (role: string) => {
    switch (role) {
      case 'ai':
        return 'bg-blue-50 border-blue-200';
      case 'supplier':
        return 'bg-green-50 border-green-200';
      case 'system':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ai':
        return 'Sistema IA';
      case 'supplier':
        return 'Fornecedor';
      case 'system':
        return 'Sistema';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Log de Negociação via WhatsApp</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Cotação #{negotiation.quote_id} • Negociação {negotiation.id.slice(0, 8)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportLog}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Log
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo da Negociação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Resumo da Negociação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p className="font-semibold">{negotiation.status}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Valor Original</span>
                  <p className="font-semibold">{formatCurrency(negotiation.original_amount)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Valor Negociado</span>
                  <p className="font-semibold text-green-600">
                    {negotiation.negotiated_amount 
                      ? formatCurrency(negotiation.negotiated_amount)
                      : 'Em andamento'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Desconto</span>
                  <p className="font-semibold text-green-600">
                    {negotiation.discount_percentage 
                      ? `${negotiation.discount_percentage.toFixed(1)}%`
                      : 'Calculando...'
                    }
                  </p>
                </div>
              </div>

              {negotiation.ai_analysis && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Análise da IA</h4>
                  <p className="text-sm text-blue-700">
                    <strong>Estratégia:</strong> {negotiation.negotiation_strategy?.strategy || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Razão:</strong> {negotiation.negotiation_strategy?.reason || 'N/A'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline da Conversa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Conversa via WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {negotiation.conversation_log && negotiation.conversation_log.length > 0 ? (
                <div className="space-y-4">
                  {negotiation.conversation_log.map((message: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border ${getMessageBgColor(message.role)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getMessageIcon(message.role)}
                          <span className="font-medium">{getRoleLabel(message.role)}</span>
                          {message.channel && (
                            <Badge variant="secondary" className="text-xs">
                              {message.channel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(message.timestamp).toLocaleString('pt-BR')}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(message.message)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm leading-relaxed mb-2">{message.message}</p>
                      
                      {/* Informações técnicas */}
                      <div className="mt-3 pt-2 border-t border-current opacity-20">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {message.messageId && (
                            <span>ID: {message.messageId}</span>
                          )}
                          {message.phone && (
                            <span>WhatsApp: {message.phone}</span>
                          )}
                          {message.deliveryStatus && (
                            <Badge variant="outline" className="text-xs">
                              {message.deliveryStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium">Nenhuma conversa registrada</h3>
                  <p className="text-sm">A conversa via WhatsApp aparecerá aqui quando iniciada</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Análise iniciada</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(negotiation.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {negotiation.status !== 'analyzing' && (
                  <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Negociação via WhatsApp iniciada</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(negotiation.updated_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}

                {negotiation.completed_at && (
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Negociação {negotiation.status === 'approved' ? 'aprovada' : 'concluída'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(negotiation.completed_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID da Negociação:</span>
                  <p className="font-mono">{negotiation.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ID da Cotação:</span>
                  <p className="font-mono">{negotiation.quote_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Aprovada por:</span>
                  <p>{negotiation.approved_by || 'Pendente'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Feedback:</span>
                  <p>{negotiation.human_feedback || 'Nenhum'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}