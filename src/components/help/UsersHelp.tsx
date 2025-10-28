import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, Users, UserPlus, Shield, Key, Clock, UserX } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function UsersHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Usuários permite gerenciar os usuários do sistema, incluindo permissões, papéis e controle de acesso.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tipos de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-3">
            O sistema possui diferentes tipos de usuários com permissões específicas:
          </p>
          <div className="space-y-3">
            <div>
              <Badge variant="default" className="mb-2">
                <Shield className="h-3 w-3 mr-1" />
                Admin (Super Admin)
              </Badge>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Acesso total ao sistema e todas as funcionalidades</li>
                <li>Gerencia clientes, fornecedores, usuários e planos</li>
                <li>Acessa relatórios globais e auditoria completa</li>
                <li>Configura integrações e parâmetros do sistema</li>
                <li>Pode simular acesso de outros usuários para suporte</li>
              </ul>
            </div>

            <div>
              <Badge variant="outline" className="mb-2 border-blue-500 text-blue-700">
                <Users className="h-3 w-3 mr-1" />
                Gestor (Manager)
              </Badge>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Gerencia cotações, aprovações e pagamentos do seu cliente/condomínio</li>
                <li>Cadastra e gerencia produtos e fornecedores vinculados</li>
                <li>Acessa relatórios e dashboard do seu cliente</li>
                <li>Cria e gerencia usuários colaboradores</li>
                <li>Configura preferências e notificações</li>
              </ul>
            </div>

            <div>
              <Badge variant="secondary" className="mb-2">
                <Users className="h-3 w-3 mr-1" />
                Colaborador (Collaborator)
              </Badge>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Cria e edita cotações do seu departamento</li>
                <li>Consulta aprovações e notificações</li>
                <li>Visualiza produtos e fornecedores disponíveis</li>
                <li>Acesso limitado a relatórios (apenas suas atividades)</li>
                <li>Não pode gerenciar usuários ou configurações</li>
              </ul>
            </div>

            <div>
              <Badge variant="outline" className="mb-2 border-green-500 text-green-700">
                <Users className="h-3 w-3 mr-1" />
                Fornecedor (Supplier)
              </Badge>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Visualiza cotações recebidas e responde propostas</li>
                <li>Gerencia catálogo de produtos e estoque próprio</li>
                <li>Acompanha pagamentos e entregas</li>
                <li>Acessa logs de suas próprias atividades</li>
                <li>Não tem acesso a dados de outros fornecedores ou clientes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Como Cadastrar um Novo Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Siga estes passos para adicionar um novo usuário ao sistema:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li><strong>Acesse o módulo de usuários:</strong> Clique em "Usuários" no menu lateral (disponível apenas para Admin e Manager)</li>
            <li><strong>Criar novo usuário:</strong> Clique no botão "Novo Usuário"</li>
            <li><strong>Preencher informações básicas:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Nome completo</li>
                <li>E-mail (será usado para login)</li>
                <li>Telefone (opcional, mas recomendado para notificações)</li>
                <li>Cargo ou função (opcional)</li>
              </ul>
            </li>
            <li><strong>Definir papel (role):</strong> Selecione Manager, Collaborator ou Supplier conforme as responsabilidades</li>
            <li><strong>Configurar permissões (opcional):</strong> Para controle mais granular, defina permissões específicas</li>
            <li><strong>Enviar convite:</strong> Clique em "Enviar Convite". O usuário receberá um e-mail com instruções para criar senha e acessar o sistema</li>
          </ol>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              O link de convite expira em 7 dias. Após este período, será necessário reenviar o convite.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciamento de Permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Controle o que cada usuário pode fazer no sistema:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Permissões por Papel (Padrão)</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Cada papel tem um conjunto padrão de permissões que cobrem a maioria dos casos de uso.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Permissões Customizadas (Avançado)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Para casos especiais, customize permissões por usuário</li>
              <li>Exemplos: Colaborador que pode aprovar, Manager sem acesso a pagamentos</li>
              <li>Acesse "Editar Usuário" → aba "Permissões"</li>
              <li>Marque/desmarque permissões específicas por módulo</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Acesso a Módulos Específicos</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Controle acesso a módulos como Relatórios, Pagamentos, Comunicação</li>
              <li>Útil para restringir acesso a informações sensíveis</li>
              <li>Módulos não autorizados não aparecem no menu do usuário</li>
            </ul>
          </div>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Sempre siga o princípio do menor privilégio: dê apenas as permissões necessárias para o usuário exercer sua função.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Ativar/Desativar Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gerencie o status de acesso dos usuários:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Suspender Acesso Temporariamente</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Clique em "Editar" no usuário desejado</li>
              <li>Desative o toggle "Usuário Ativo"</li>
              <li>O usuário não conseguirá mais fazer login</li>
              <li>Todas as sessões ativas são encerradas imediatamente</li>
              <li>Dados e histórico são preservados</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Reativar Usuário</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Acesse o usuário desativado</li>
              <li>Ative o toggle "Usuário Ativo"</li>
              <li>O usuário poderá fazer login novamente imediatamente</li>
              <li>Se a senha foi esquecida, use "Redefinir Senha"</li>
            </ul>
          </div>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Desativar é preferível a excluir usuários, pois mantém o histórico de auditoria intacto.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Redefinir Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Reset de Senha via E-mail</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Clique em "Editar" no usuário</li>
              <li>Clique em "Enviar Link de Redefinição de Senha"</li>
              <li>O usuário recebe um e-mail com link seguro</li>
              <li>Link é válido por 24 horas</li>
              <li>Usuário cria nova senha seguindo o link</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Forçar Troca de Senha no Próximo Login</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Marque a opção "Exigir troca de senha"</li>
              <li>No próximo login, o usuário será obrigado a criar nova senha</li>
              <li>Útil para contas temporárias ou após suspeita de comprometimento</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acompanhe o que cada usuário está fazendo no sistema:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Ver ações realizadas:</strong> Acesse a aba "Atividades" no perfil do usuário</li>
            <li><strong>Filtros disponíveis:</strong> Por data, tipo de ação (criar, editar, excluir), módulo</li>
            <li><strong>Auditoria de acesso:</strong> Veja logins, logouts e tentativas de acesso negadas</li>
            <li><strong>Exportar logs:</strong> Baixe relatório de atividades em CSV ou PDF</li>
            <li><strong>Alertas de atividade suspeita:</strong> Receba notificações sobre comportamentos incomuns</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li><strong>Princípio do menor privilégio:</strong> Dê apenas as permissões necessárias para cada função</li>
            <li><strong>Revisão periódica de acessos:</strong> Revise trimestralmente se os usuários ainda precisam dos acessos concedidos</li>
            <li><strong>Desative usuários que saíram:</strong> Imediatamente ao desligar um funcionário, desative seu acesso</li>
            <li><strong>Use e-mails corporativos:</strong> Evite e-mails pessoais para maior controle e segurança</li>
            <li><strong>Documente papéis customizados:</strong> Se criar permissões personalizadas, documente o motivo</li>
            <li><strong>Treine novos usuários:</strong> Forneça treinamento adequado antes de conceder acesso ao sistema</li>
            <li><strong>Monitore atividades suspeitas:</strong> Configure alertas para logins em horários incomuns ou de locais inesperados</li>
            <li><strong>Force troca periódica de senhas:</strong> Considere exigir mudança de senha a cada 90 dias para usuários críticos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
