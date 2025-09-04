import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { Integration } from "@/hooks/useSupabaseIntegrations";

interface IntegrationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: Integration | null;
}

export function IntegrationDetailsModal({ open, onOpenChange, integration }: IntegrationDetailsModalProps) {
  if (!integration) return null;

  const getStatusIcon = (active: boolean) => {
    return active ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getConfigurationPreview = (config: any) => {
    try {
      const safeConfig = { ...config };
      
      // Ocultar campos sensíveis
      const sensitiveFields = ['api_key', 'secret_key', 'auth_token', 'password', 'webhook_secret'];
      sensitiveFields.forEach(field => {
        if (safeConfig[field]) {
          safeConfig[field] = '****' + safeConfig[field].slice(-4);
        }
      });

      return safeConfig;
    } catch (error) {
      return { erro: 'Não foi possível carregar a configuração' };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(integration.active)}
            Detalhes da Integração
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a integração configurada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tipo:</span>
                <Badge variant="outline" className="capitalize">
                  {integration.integration_type.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={integration.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {integration.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="text-sm font-mono">{integration.id}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Criada em:</span>
                <span className="text-sm">{formatDate(integration.created_at)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Atualizada em:</span>
                <span className="text-sm">{formatDate(integration.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Configuração */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                {(() => {
                  try {
                    return JSON.stringify(getConfigurationPreview(integration.configuration), null, 2);
                  } catch (error) {
                    return 'Erro ao exibir configuração';
                  }
                })()}
              </pre>
            </CardContent>
          </Card>

          {/* Links Úteis */}
          {integration.integration_type === 'n8n_webhook' && integration.configuration.webhook_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Links Úteis</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => window.open(integration.configuration.webhook_url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir Webhook N8N
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Informações de Uso */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações de Uso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Esta integração está {integration.active ? 'ativa' : 'inativa'} e 
                {integration.active ? ' pode ser' : ' não será'} utilizada pelo sistema.
              </div>
              
              {integration.integration_type === 'n8n_webhook' && (
                <div className="text-xs text-muted-foreground">
                  • Usado para envio de cotações aos fornecedores<br/>
                  • Recebe dados completos da cotação, cliente e fornecedores<br/>
                  • Configuração por cliente ou global (sem client_id)
                </div>
              )}

              {integration.integration_type.includes('email') && (
                <div className="text-xs text-muted-foreground">
                  • Usado para envio de e-mails transacionais<br/>
                  • Notificações de cotações e atualizações
                </div>
              )}

              {integration.integration_type.includes('whatsapp') && (
                <div className="text-xs text-muted-foreground">
                  • Usado para envio de mensagens WhatsApp<br/>
                  • Notificações diretas aos fornecedores
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}