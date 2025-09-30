import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, CheckCircle } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function SuppliersHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Fornecedores permite gerenciar todos os fornecedores cadastrados, incluindo dados de contato, especialidades e histórico de negociações.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Como Cadastrar um Novo Fornecedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 1: Acessar o Módulo</h4>
                <p className="text-muted-foreground">
                  No menu lateral, clique em "Fornecedores" para ver a lista de fornecedores cadastrados.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 2: Criar Novo Fornecedor</h4>
                <p className="text-muted-foreground">
                  Clique no botão "Novo Fornecedor" no canto superior direito.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 3: Informações Básicas</h4>
                <p className="text-muted-foreground">
                  Preencha os dados obrigatórios:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Razão Social:</strong> Nome oficial da empresa</li>
                  <li><strong>Nome Fantasia:</strong> Nome comercial</li>
                  <li><strong>CNPJ:</strong> Cadastro Nacional de Pessoa Jurídica</li>
                  <li><strong>Inscrição Estadual:</strong> Se aplicável</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 4: Dados de Contato</h4>
                <p className="text-muted-foreground">
                  Informe os meios de comunicação:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>E-mail:</strong> E-mail principal para cotações</li>
                  <li><strong>Telefone:</strong> Telefone comercial</li>
                  <li><strong>WhatsApp:</strong> Número para notificações (opcional)</li>
                  <li><strong>Website:</strong> Site da empresa (opcional)</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 5: Endereço</h4>
                <p className="text-muted-foreground">
                  Complete o endereço completo do fornecedor incluindo CEP, rua, número, bairro, cidade e estado.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 6: Especialidades</h4>
                <p className="text-muted-foreground">
                  Selecione as categorias de produtos/serviços que o fornecedor oferece. Isso ajudará o sistema a sugerir automaticamente fornecedores apropriados ao criar cotações.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Passo 7: Salvar</h4>
                <p className="text-muted-foreground">
                  Revise todas as informações e clique em "Salvar". O fornecedor estará disponível para receber cotações.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Busca Automática por CNPJ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O sistema possui integração com a Receita Federal para busca automática de dados:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
            <li>Ao cadastrar um fornecedor, digite apenas o CNPJ</li>
            <li>Clique em "Buscar por CNPJ"</li>
            <li>O sistema preencherá automaticamente: razão social, nome fantasia, endereço e situação cadastral</li>
            <li>Você só precisa completar os dados de contato e especialidades</li>
          </ol>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Dica:</strong> Use esta funcionalidade para evitar erros de digitação e agilizar o cadastro.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Na lista de fornecedores, você pode:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li><strong>Buscar:</strong> Use a barra de busca para encontrar fornecedores por nome, CNPJ ou categoria</li>
            <li><strong>Filtrar:</strong> Filtre por status (ativo/inativo), categoria ou avaliação</li>
            <li><strong>Ordenar:</strong> Ordene por nome, avaliação ou número de cotações</li>
            <li><strong>Editar:</strong> Clique no ícone de lápis para editar informações</li>
            <li><strong>Visualizar:</strong> Clique no fornecedor para ver detalhes completos</li>
            <li><strong>Desativar:</strong> Desative fornecedores que não trabalham mais com você</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avaliação de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O sistema avalia automaticamente os fornecedores baseado em:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Qualidade dos produtos/serviços entregues</li>
            <li>Pontualidade nas entregas</li>
            <li>Cumprimento dos prazos de resposta</li>
            <li>Competitividade de preços</li>
            <li>Avaliações manuais dos usuários</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Você também pode avaliar manualmente um fornecedor após receber produtos/serviços. A avaliação aparecerá no perfil do fornecedor e ajudará na tomada de decisões futuras.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grupos de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Organize fornecedores em grupos para facilitar o envio de cotações:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
            <li>Na lista de fornecedores, clique em "Gerenciar Grupos"</li>
            <li>Crie um novo grupo (ex: "Fornecedores de Material Elétrico")</li>
            <li>Adicione fornecedores ao grupo</li>
            <li>Ao criar uma cotação, você pode enviar para o grupo inteiro de uma vez</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Negociações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Ao visualizar um fornecedor, você tem acesso ao histórico completo:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Todas as cotações enviadas</li>
            <li>Propostas recebidas e valores</li>
            <li>Cotações vencidas e perdidas</li>
            <li>Produtos mais fornecidos</li>
            <li>Volume total de negócios</li>
            <li>Taxa de resposta</li>
            <li>Tempo médio de resposta</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status do Fornecedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">🟢 Ativo</h4>
              <p className="text-muted-foreground">
                Fornecedor está ativo e pode receber cotações normalmente.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">🟡 Pendente</h4>
              <p className="text-muted-foreground">
                Cadastro novo aguardando validação de documentos.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">🔴 Inativo</h4>
              <p className="text-muted-foreground">
                Fornecedor desativado. Não receberá novas cotações mas o histórico é mantido.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">⚫ Bloqueado</h4>
              <p className="text-muted-foreground">
                Fornecedor bloqueado por problemas (inadimplência, má qualidade, etc.). Não pode participar de cotações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Mantenha sempre os dados de contato atualizados para garantir que os fornecedores recebam as notificações.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Cadastre múltiplos contatos por fornecedor (comercial, financeiro, entrega) quando disponível.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Revise periodicamente a base de fornecedores e remova/desative aqueles inativos.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Use grupos para agilizar o envio de cotações recorrentes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
