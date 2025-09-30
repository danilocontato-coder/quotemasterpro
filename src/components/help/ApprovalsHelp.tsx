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
            O sistema permite configurar níveis de aprovação baseados em valores, categorias ou outros critérios. Quando uma cotação atinge determinado valor, ela passa automaticamente pelo fluxo de aprovação configurado.
          </p>
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
                  Após revisar, você tem três opções:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Aprovar:</strong> Libera a cotação para prosseguir</li>
                  <li><strong>Rejeitar:</strong> Impede o prosseguimento</li>
                  <li><strong>Solicitar Alterações:</strong> Devolve para ajustes</li>
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
          <CardTitle>Níveis de Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O sistema suporta múltiplos níveis de aprovação. Por exemplo:
          </p>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">Nível 1: Supervisor</h4>
              <p className="text-muted-foreground">
                Cotações até R$ 5.000 - aprovação do supervisor direto
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Nível 2: Gerente</h4>
              <p className="text-muted-foreground">
                Cotações de R$ 5.001 até R$ 20.000 - aprovação do gerente
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Nível 3: Diretor</h4>
              <p className="text-muted-foreground">
                Cotações acima de R$ 20.000 - aprovação da diretoria
              </p>
            </div>
          </div>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Nota:</strong> Os níveis e valores são configuráveis pelo administrador do sistema. Entre em contato com seu gestor para entender as regras específicas da sua organização.
            </AlertDescription>
          </Alert>
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
          <CardTitle>Delegação de Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Se você estiver ausente, pode delegar suas aprovações:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
            <li>Vá para "Configurações" no menu</li>
            <li>Clique em "Delegação de Aprovações"</li>
            <li>Selecione o usuário que assumirá suas aprovações</li>
            <li>Defina o período de delegação</li>
            <li>Confirme a delegação</li>
          </ol>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Importante:</strong> O usuário delegado terá os mesmos poderes de aprovação que você durante o período definido.
            </AlertDescription>
          </Alert>
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
