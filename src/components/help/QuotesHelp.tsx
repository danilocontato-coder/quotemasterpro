import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, CheckCircle } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function QuotesHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Cotações permite criar, gerenciar e acompanhar todas as solicitações de orçamento enviadas aos fornecedores.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Como Criar uma Nova Cotação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 1: Acessar o Módulo</h4>
                <p className="text-muted-foreground">
                  No menu lateral, clique em "Cotações" para acessar a lista de cotações.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 2: Criar Nova Cotação</h4>
                <p className="text-muted-foreground">
                  Clique no botão "Nova Cotação" no canto superior direito da página.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 3: Preencher Informações Básicas</h4>
                <p className="text-muted-foreground">
                  No formulário que abre, preencha:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Título:</strong> Nome descritivo da cotação</li>
                  <li><strong>Descrição:</strong> Detalhes sobre o que está sendo solicitado</li>
                  <li><strong>Data de Validade:</strong> Prazo para os fornecedores responderem</li>
                  <li><strong>Centro de Custo:</strong> Área ou departamento responsável (opcional)</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 4: Adicionar Itens</h4>
                <p className="text-muted-foreground">
                  Clique em "Adicionar Item" e para cada produto/serviço informe:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Produto:</strong> Selecione do catálogo ou crie um novo</li>
                  <li><strong>Quantidade:</strong> Quantidade desejada</li>
                  <li><strong>Unidade:</strong> Unidade de medida (kg, unidade, caixa, etc.)</li>
                  <li><strong>Observações:</strong> Detalhes específicos sobre o item</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 5: Anexar Documentos (Opcional)</h4>
                <p className="text-muted-foreground">
                  Você pode anexar especificações técnicas, imagens de referência ou outros documentos relevantes clicando em "Anexar Arquivos".
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 6: Salvar ou Enviar</h4>
                <p className="text-muted-foreground">
                  Você pode:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Salvar como Rascunho:</strong> Para continuar editando depois</li>
                  <li><strong>Enviar para Aprovação:</strong> Se sua empresa tem fluxo de aprovação configurado</li>
                  <li><strong>Enviar para Fornecedores:</strong> Se você tem permissão para envio direto</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Enviar Cotação para Fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 1: Selecionar Cotação</h4>
                <p className="text-muted-foreground">
                  Na lista de cotações, clique na cotação que deseja enviar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 2: Selecionar Fornecedores</h4>
                <p className="text-muted-foreground">
                  Clique em "Enviar para Fornecedores" e selecione os fornecedores que devem receber a solicitação. O sistema sugere automaticamente fornecedores baseado nas categorias dos produtos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 3: Confirmar Envio</h4>
                <p className="text-muted-foreground">
                  Revise os fornecedores selecionados e clique em "Enviar". Os fornecedores receberão notificação por e-mail e/ou WhatsApp (se configurado).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status das Cotações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">🟤 Rascunho (Draft)</h4>
              <p className="text-muted-foreground">
                Cotação criada mas ainda não enviada. Pode ser editada livremente.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">🔵 Enviada (Sent)</h4>
              <p className="text-muted-foreground">
                Cotação enviada aos fornecedores, aguardando respostas.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">🟡 Recebendo Propostas (Receiving)</h4>
              <p className="text-muted-foreground">
                Cotação enviada e já recebeu algumas propostas, mas ainda aguarda resposta de outros fornecedores.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">✅ Propostas Recebidas (Received)</h4>
              <p className="text-muted-foreground">
                Todas as propostas esperadas foram recebidas. Cotação pronta para análise.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">🔵 Em Análise (Under Review)</h4>
              <p className="text-muted-foreground">
                Cotação foi enviada para aprovação e está aguardando decisão do aprovador responsável.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">🟢 Aprovada (Approved)</h4>
              <p className="text-muted-foreground">
                Cotação aprovada pelo gestor responsável. Pronta para gerar pagamento e finalizar o processo.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">🔴 Rejeitada (Rejected)</h4>
              <p className="text-muted-foreground">
                Cotação rejeitada pelo aprovador. Verifique os comentários para entender o motivo. A cotação não pode mais prosseguir.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">⚫ Cancelada (Cancelled)</h4>
              <p className="text-muted-foreground">
                Cotação cancelada antes da conclusão. Não pode mais ser editada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visualizando Respostas de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Para ver as propostas dos fornecedores:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
            <li>Clique na cotação desejada na lista</li>
            <li>Na aba "Propostas", você verá todas as respostas recebidas</li>
            <li>Clique em cada proposta para ver detalhes completos</li>
            <li>Compare preços, prazos e condições de pagamento</li>
            <li>Use a opção "Comparar Propostas" para análise lado a lado</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico e Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Cada cotação mantém um histórico completo de todas as ações realizadas:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Quem criou a cotação e quando</li>
            <li>Alterações realizadas no conteúdo</li>
            <li>Envio para fornecedores</li>
            <li>Recebimento de propostas</li>
            <li>Aprovações e rejeições</li>
            <li>Comentários e observações</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Para acessar o histórico, abra a cotação e clique na aba "Histórico".
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dicas e Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Sempre forneça descrições detalhadas dos itens para evitar mal-entendidos com fornecedores.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Anexe fotos ou especificações técnicas quando necessário para melhor compreensão.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Defina prazos realistas para que os fornecedores possam preparar propostas adequadas.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Use a função de salvar como rascunho enquanto coleta informações, e só envie quando tiver certeza de todos os detalhes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
