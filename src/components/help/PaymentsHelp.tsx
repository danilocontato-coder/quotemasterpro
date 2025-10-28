import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, CreditCard, FileText, CheckCircle, XCircle, Clock, Download } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function PaymentsHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Pagamentos gerencia todo o processo financeiro de pagamento aos fornecedores após aprovação das cotações.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Como Visualizar Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acesse e gerencie todos os pagamentos do sistema:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Dashboard de pagamentos:</strong> Visualize resumo com totais pagos, pendentes e em processamento</li>
            <li><strong>Lista completa:</strong> Veja todos os pagamentos com informações de fornecedor, valor e status</li>
            <li><strong>Filtros disponíveis:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>Por status (pendente, processando, pago, falha, cancelado)</li>
                <li>Por período (hoje, semana, mês, personalizado)</li>
                <li>Por fornecedor</li>
                <li>Por faixa de valor</li>
              </ul>
            </li>
            <li><strong>Busca rápida:</strong> Encontre pagamentos por número de cotação ou nome do fornecedor</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-3">
            Entenda o significado de cada status:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
              <p className="text-sm text-muted-foreground">
                Pagamento aguardando processamento. Nenhuma ação foi iniciada ainda.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="default" className="mt-0.5">
                <Clock className="h-3 w-3 mr-1" />
                Processando
              </Badge>
              <p className="text-sm text-muted-foreground">
                Pagamento em andamento. Aguarde a confirmação do banco ou gateway de pagamento.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 border-green-500 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Pago
              </Badge>
              <p className="text-sm text-muted-foreground">
                Pagamento concluído com sucesso. O fornecedor foi notificado.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="destructive" className="mt-0.5">
                <XCircle className="h-3 w-3 mr-1" />
                Falha
              </Badge>
              <p className="text-sm text-muted-foreground">
                Pagamento não foi processado. Verifique os detalhes do erro e tente novamente.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">
                <XCircle className="h-3 w-3 mr-1" />
                Cancelado
              </Badge>
              <p className="text-sm text-muted-foreground">
                Pagamento foi cancelado antes de ser processado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Como Realizar um Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Siga estes passos para efetuar um pagamento:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li><strong>Selecionar cotação aprovada:</strong> Acesse a lista de cotações aprovadas que precisam de pagamento</li>
            <li><strong>Revisar valores e dados bancários:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>Confira o valor total a ser pago</li>
                <li>Verifique os dados bancários do fornecedor</li>
                <li>Revise itens e quantidades</li>
              </ul>
            </li>
            <li><strong>Escolher método de pagamento:</strong> Selecione entre PIX, boleto ou transferência bancária</li>
            <li><strong>Confirmar pagamento:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>Para PIX: copie o código ou escaneie o QR Code</li>
                <li>Para boleto: baixe e pague até a data de vencimento</li>
                <li>Para transferência: use os dados bancários fornecidos</li>
              </ul>
            </li>
            <li><strong>Acompanhar comprovante:</strong> Faça upload do comprovante de pagamento no sistema</li>
          </ol>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              O fornecedor é notificado automaticamente após a confirmação do pagamento.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">PIX (Instantâneo)</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Pagamento processado em segundos</li>
                <li>Disponível 24/7, incluindo finais de semana e feriados</li>
                <li>QR Code ou chave PIX para facilitar o pagamento</li>
                <li>Confirmação automática</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Boleto Bancário</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Pagamento processado em 1-3 dias úteis após compensação</li>
                <li>Boleto com código de barras para facilitar pagamento</li>
                <li>Pode ser pago em qualquer banco ou lotérica</li>
                <li>Atenção à data de vencimento</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Transferência Bancária</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>TED ou DOC entre bancos</li>
                <li>Processamento em 1 dia útil (TED) ou 2 dias úteis (DOC)</li>
                <li>Necessário fazer upload do comprovante</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Integração com Gateways</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Stripe, PagSeguro ou outro gateway configurado</li>
                <li>Pagamento com cartão de crédito (se habilitado)</li>
                <li>Processamento automático e seguro</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comprovantes e Notas Fiscais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mantenha toda a documentação organizada:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Upload de comprovantes:</strong> Anexe comprovantes de pagamento em PDF ou imagem (até 10MB)</li>
            <li><strong>Anexar nota fiscal:</strong> Faça upload da NF-e recebida do fornecedor</li>
            <li><strong>Histórico de documentos:</strong> Todos os documentos ficam armazenados no sistema para consulta futura</li>
            <li><strong>Download em lote:</strong> Baixe todos os comprovantes de um período em um arquivo ZIP</li>
            <li><strong>Auditoria:</strong> Registre automaticamente quem fez upload de cada documento e quando</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Relatórios Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gere relatórios para análise financeira:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Gastos por período:</strong> Veja quanto foi pago em cada mês, trimestre ou ano</li>
            <li><strong>Pagamentos por fornecedor:</strong> Analise o volume de pagamentos para cada fornecedor</li>
            <li><strong>Gastos por categoria:</strong> Identifique onde está concentrando mais gastos</li>
            <li><strong>Fluxo de caixa:</strong> Acompanhe entradas e saídas projetadas</li>
            <li><strong>Exportar relatórios:</strong> Baixe em Excel, PDF ou CSV para análise externa</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Sempre revise os dados bancários do fornecedor antes de realizar o pagamento</li>
            <li>Priorize PIX para pagamentos urgentes e evitar atrasos</li>
            <li>Faça upload dos comprovantes imediatamente após o pagamento</li>
            <li>Configure notificações para ser alertado sobre pagamentos pendentes</li>
            <li>Revise relatórios mensalmente para identificar oportunidades de economia</li>
            <li>Mantenha documentos fiscais organizados para facilitar auditorias</li>
            <li>Estabeleça um calendário de pagamentos para melhor gestão de fluxo de caixa</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
