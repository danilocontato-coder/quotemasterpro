import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, CheckCircle2, AlertTriangle, Clock, Info, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AsaasWalletSettingsProps {
  supplierData: {
    asaas_wallet_id?: string;
    bank_data?: {
      bank_name?: string;
      bank_code?: string;
      account_number?: string;
      account_type?: string;
      agency?: string;
      pix_key?: string;
      pix_key_type?: string;
      verified?: boolean;
      verified_at?: string;
    };
    created_at?: string;
    status?: string;
  };
}

export function AsaasWalletSettings({ supplierData }: AsaasWalletSettingsProps) {
  const hasWallet = !!supplierData.asaas_wallet_id;
  const bankData = supplierData.bank_data || {};

  return (
    <div className="space-y-6">
      {/* Explicação sobre Escrow */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Sistema de Pagamento Escrow (Garantia)</CardTitle>
          </div>
          <CardDescription>
            Entenda como funciona o sistema de pagamento seguro da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-1">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">O que é Pagamento Escrow?</h4>
                <p className="text-sm text-muted-foreground">
                  O pagamento escrow é um sistema de garantia onde o valor pago pelo cliente fica retido em uma conta intermediária até que a entrega seja confirmada. Isso protege tanto o comprador quanto o fornecedor.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-1">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Como funciona o processo?</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Cliente realiza o pagamento da cotação aprovada</li>
                  <li>Valor fica retido em conta escrow (garantia)</li>
                  <li>Fornecedor realiza a entrega do produto/serviço</li>
                  <li>Cliente confirma o recebimento através de código</li>
                  <li>Valor é liberado para sua conta Asaas automaticamente</li>
                </ol>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-1">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Benefícios para você</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Recebimento garantido após confirmação de entrega</li>
                  <li>• Proteção contra inadimplência</li>
                  <li>• Transparência no fluxo de pagamento</li>
                  <li>• Liberação automática do valor em 7 dias (se configurado)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status da Wallet Asaas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <CardTitle>Carteira Digital Asaas</CardTitle>
          </div>
          <CardDescription>
            Sua conta para recebimento de pagamentos via plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasWallet ? (
            <>
              <Alert className="border-success/50 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Sua carteira digital está configurada e pronta para receber pagamentos
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">ID da Subconta Asaas</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">{supplierData.asaas_wallet_id}</code>
                </div>

                {supplierData.created_at && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Data de Criação</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(supplierData.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Status da Conta</span>
                  <Badge variant={supplierData.status === 'active' ? 'default' : 'secondary'}>
                    {supplierData.status === 'active' ? 'Ativa' : 'Pendente'}
                  </Badge>
                </div>
              </div>

              {/* Dados Bancários */}
              {bankData.bank_name && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    Dados Bancários Vinculados
                    {bankData.verified && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Verificado
                      </Badge>
                    )}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Banco</span>
                      <span className="font-medium">{bankData.bank_name} ({bankData.bank_code})</span>
                    </div>
                    {bankData.agency && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Agência</span>
                        <span className="font-medium">{bankData.agency}</span>
                      </div>
                    )}
                    {bankData.account_number && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Conta</span>
                        <span className="font-medium">
                          {bankData.account_number} ({bankData.account_type === 'corrente' ? 'Corrente' : 'Poupança'})
                        </span>
                      </div>
                    )}
                    {bankData.pix_key && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Chave PIX</span>
                        <span className="font-medium">{bankData.pix_key}</span>
                      </div>
                    )}
                    {bankData.verified_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Verificado em</span>
                        <span className="font-medium">
                          {format(new Date(bankData.verified_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Alert className="border-warning/50 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                <p className="font-semibold mb-2">Carteira digital não configurada</p>
                <p className="text-sm">
                  Para receber pagamentos através da plataforma, é necessário ter uma carteira digital Asaas configurada. 
                  Entre em contato com o administrador da plataforma para solicitar a configuração da sua conta de recebimento.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informações Importantes
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• A Asaas é a plataforma de pagamentos integrada ao sistema</li>
              <li>• Seus dados bancários são mantidos seguros e criptografados</li>
              <li>• Os pagamentos são liberados após confirmação de entrega pelo cliente</li>
              <li>• Você pode acompanhar todos os recebíveis na aba "Recebíveis"</li>
              <li>• Para dúvidas sobre transferências, consulte o suporte Asaas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
