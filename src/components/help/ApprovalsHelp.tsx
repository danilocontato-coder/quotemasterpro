import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, CheckCircle } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function ApprovalsHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Aprovações gerencia o fluxo de aprovação de cotações, permitindo controle e auditoria das decisões.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Como Funciona o Fluxo de Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O sistema possui níveis de aprovação configurados pelo administrador baseados em faixas de valores. Quando uma cotação é criada, o sistema verifica automaticamente qual nível de aprovação se aplica baseado no valor total.
          </p>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Importante:</strong> Os níveis de aprovação são criados e gerenciados na tela "Níveis de Aprovação" do menu lateral.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Aprovar ou Rejeitar uma Cotação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 1: Acessar Aprovações Pendentes</h4>
                <p className="text-muted-foreground">
                  No menu lateral, clique em "Aprovações". Você verá uma lista de todas as cotações aguardando sua aprovação.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 2: Revisar a Cotação</h4>
                <p className="text-muted-foreground">
                  Clique na cotação para ver todos os detalhes:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li>Itens solicitados e quantidades</li>
                  <li>Propostas dos fornecedores</li>
                  <li>Comparativo de preços</li>
                  <li>Histórico da cotação</li>
                  <li>Anexos e documentos</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 3: Tomar Decisão</h4>
                <p className="text-muted-foreground">
                  Após revisar, você tem duas opções:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Aprovar:</strong> Libera a cotação para prosseguir para o próximo nível ou finaliza o fluxo</li>
                  <li><strong>Rejeitar:</strong> Impede o prosseguimento da cotação</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 4: Adicionar Comentário</h4>
                <p className="text-muted-foreground">
                  Sempre adicione um comentário explicando sua decisão, especialmente em caso de rejeição ou solicitação de alterações. Isso ajuda a equipe a entender o motivo e melhorar processos futuros.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 5: Confirmar</h4>
                <p className="text-muted-foreground">
                  Clique no botão correspondente (Aprovar/Rejeitar) e confirme sua decisão. O sistema notificará automaticamente o solicitante.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Níveis de Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Os níveis de aprovação são configurados na tela "Níveis de Aprovação" (menu lateral) e definem:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li><strong>Nome do Nível:</strong> Identificação do nível (ex: "Nível 1 - Básico")</li>
            <li><strong>Faixa de Valores:</strong> Valor mínimo e máximo que ativa este nível</li>
            <li><strong>Aprovadores Autorizados:</strong> Lista de usuários que podem aprovar neste nível</li>
            <li><strong>Ordem do Nível:</strong> Sequência de execução quando há múltiplos níveis</li>
          </ul>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Exemplo:</strong> Se configurado um nível para cotações de R$ 1.000 a R$ 5.000, todas as cotações nesta faixa serão automaticamente encaminhadas aos aprovadores definidos nesse nível.
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground mt-4">
            Na lista de aprovações, você pode visualizar qual nível se aplica a cada cotação e quem são os aprovadores autorizados ao passar o mouse sobre o ícone do nível.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Use os filtros disponíveis para organizar sua fila de aprovações:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li><strong>Status:</strong> Pendente, Aprovado, Rejeitado</li>
            <li><strong>Período:</strong> Data de criação da solicitação</li>
            <li><strong>Solicitante:</strong> Quem criou a cotação</li>
            <li><strong>Valor:</strong> Faixa de valor da cotação</li>
            <li><strong>Fornecedor:</strong> Fornecedor selecionado</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações de Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Você receberá notificações quando:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Uma nova cotação precisar da sua aprovação</li>
            <li>Uma cotação estiver próxima do vencimento</li>
            <li>Uma cotação que você aprovou foi finalizada</li>
            <li>Houver comentários ou atualizações em cotações sob sua responsabilidade</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Aprovações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Para consultar aprovações anteriores:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
            <li>Acesse a aba "Histórico" no módulo de Aprovações</li>
            <li>Use os filtros para encontrar aprovações específicas</li>
            <li>Clique em qualquer aprovação para ver detalhes completos</li>
            <li>Você pode exportar relatórios de aprovações para análise</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria de Aprovações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Todas as aprovações e rejeições são registradas no sistema para auditoria:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Data e hora da decisão</li>
            <li>Quem aprovou ou rejeitou</li>
            <li>Comentários adicionados</li>
            <li>Valor da cotação na época da aprovação</li>
            <li>Fornecedor selecionado</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Estes registros ficam disponíveis no histórico da cotação e podem ser exportados para relatórios.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Revise todas as propostas dos fornecedores antes de aprovar. Compare preços, prazos e condições.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Sempre documente o motivo de rejeições para melhorar o processo.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Configure alertas para não perder prazos críticos de aprovação.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Verifique o histórico do fornecedor antes de aprovar grandes valores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
