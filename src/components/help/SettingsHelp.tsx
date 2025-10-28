import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, User, Bell, Building2, Plug, CheckSquare, Palette, Shield, Clock } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function SettingsHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Configurações permite personalizar preferências do sistema, notificações, tema e dados do perfil e empresa.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Configurações de Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gerencie seus dados pessoais e preferências de conta:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Editar Dados Pessoais</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Nome completo</li>
              <li>E-mail (requer confirmação ao alterar)</li>
              <li>Telefone para contato</li>
              <li>Foto de perfil (formatos aceitos: JPG, PNG; máx. 5MB)</li>
              <li>Cargo ou função</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Alterar Senha</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Informe sua senha atual para validação</li>
              <li>Digite a nova senha (mínimo 8 caracteres, incluindo letras e números)</li>
              <li>Confirme a nova senha</li>
              <li>Todas as sessões ativas serão encerradas após a mudança</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Preferências de Idioma</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Português (Brasil)</li>
              <li>Inglês (US)</li>
              <li>A interface será exibida no idioma selecionado</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Fuso Horário
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Selecione seu fuso horário local</li>
              <li>Todas as datas e horários serão exibidos de acordo com sua configuração</li>
              <li>Importante para relatórios e notificações programadas</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Personalize como e quando você deseja receber notificações:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Notificações por E-mail</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Novas cotações recebidas</li>
              <li>Aprovações pendentes</li>
              <li>Pagamentos processados</li>
              <li>Mensagens de fornecedores</li>
              <li>Resumo diário ou semanal de atividades</li>
              <li>Alertas de orçamento (centros de custo)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Notificações por WhatsApp</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Requer configuração de integração (ver seção Integrações)</li>
              <li>Alertas urgentes em tempo real</li>
              <li>Aprovações críticas que exigem ação imediata</li>
              <li>Pagamentos e entregas confirmadas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Notificações In-app</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Notificações aparecem no ícone de sino no topo da página</li>
              <li>Sempre habilitadas para eventos críticos</li>
              <li>Marque como lidas ou arquive notificações antigas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Horário de Silêncio</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Configure horários em que não deseja receber notificações (ex: 22h às 7h)</li>
              <li>Desative notificações em finais de semana</li>
              <li>Notificações críticas podem ser configuradas para ignorar o silêncio</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configurações de Empresa/Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="mb-3">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Disponível apenas para usuários com papel de Admin ou Manager.
            </AlertDescription>
          </Alert>
          <div>
            <h4 className="font-semibold text-sm mb-2">Logo e Branding</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Faça upload do logo da empresa (PNG com fundo transparente recomendado)</li>
              <li>Tamanho ideal: 200x50px ou proporcional</li>
              <li>O logo aparecerá no topo do sistema e em relatórios/PDFs</li>
              <li>Personalize cores primária e secundária (planos Enterprise)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Dados Cadastrais</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Nome da empresa/condomínio</li>
              <li>CNPJ ou CPF</li>
              <li>Endereço completo</li>
              <li>Telefone e e-mail corporativo</li>
              <li>Website (opcional)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Informações de Contato</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Responsável financeiro</li>
              <li>Responsável técnico</li>
              <li>Telefone de emergência</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="mb-3">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Integrações requerem chaves de API fornecidas pelos serviços externos. Disponível para Admin.
            </AlertDescription>
          </Alert>
          <div>
            <h4 className="font-semibold text-sm mb-2">WhatsApp (Twilio, Evolution API)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Configure integração com Twilio ou Evolution API</li>
              <li>Informe Account SID e Auth Token (Twilio) ou API Key (Evolution)</li>
              <li>Defina número de telefone remetente</li>
              <li>Teste o envio de mensagens antes de ativar</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">E-mail (SendGrid, SMTP)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Configure servidor SMTP ou use SendGrid</li>
              <li>Informe credenciais de e-mail remetente</li>
              <li>Configure templates de e-mail personalizados</li>
              <li>Teste o envio antes de ativar</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Pagamentos (Stripe, PagSeguro)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Integre com gateways de pagamento</li>
              <li>Informe API Key e Secret Key</li>
              <li>Configure webhook para notificações de pagamento</li>
              <li>Habilite métodos de pagamento (cartão, PIX, boleto)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">APIs Externas</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Conecte com sistemas ERP ou contábeis</li>
              <li>Configure webhooks para sincronização automática</li>
              <li>Teste a conexão antes de usar em produção</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Configurações de Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure como o fluxo de aprovação deve funcionar:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Fluxo de Aprovação Automático</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ative aprovação automática para cotações abaixo de um valor específico</li>
              <li>Configure múltiplos níveis de aprovação por faixa de valor</li>
              <li>Defina se aprovação é sequencial ou paralela</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Limites de Valor</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Até R$ 1.000: aprovação automática</li>
              <li>R$ 1.000 - R$ 10.000: 1 nível de aprovação</li>
              <li>Acima de R$ 10.000: 2 níveis de aprovação</li>
              <li>Personalize os valores conforme necessário</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Níveis de Aprovação</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Defina aprovadores para cada nível</li>
              <li>Configure substitutos automáticos (férias, ausências)</li>
              <li>Estabeleça prazo máximo para aprovação (ex: 48h)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema e Aparência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Tema Claro/Escuro</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Alterne entre modo claro e escuro</li>
              <li>Configure para seguir automaticamente as preferências do sistema operacional</li>
              <li>Agendamento automático (ex: escuro após 18h)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Customização de Cores (Branding)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Disponível apenas para planos Enterprise</li>
              <li>Personalize cor primária e secundária do sistema</li>
              <li>Aplique cores da identidade visual da empresa</li>
              <li>Pré-visualize antes de aplicar</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Autenticação de Dois Fatores (2FA)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Adicione camada extra de segurança ao login</li>
              <li>Configure com aplicativo autenticador (Google Authenticator, Authy)</li>
              <li>Escaneie o QR Code e insira o código de verificação</li>
              <li>Guarde códigos de recuperação em local seguro</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Sessões Ativas</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Visualize todos os dispositivos com sessão ativa</li>
              <li>Veja localização aproximada e dispositivo usado</li>
              <li>Encerre sessões suspeitas remotamente</li>
              <li>Configure tempo de expiração de sessão (ex: 24h de inatividade)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Logs de Acesso</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Histórico completo de logins e tentativas de acesso</li>
              <li>Identifique acessos não autorizados</li>
              <li>Exporte logs para auditoria</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Ative autenticação de dois fatores (2FA) para maior segurança, especialmente para Admin e Manager</li>
            <li>Configure notificações adequadamente para evitar sobrecarga (use horário de silêncio)</li>
            <li>Revise sessões ativas regularmente e encerre as que não reconhecer</li>
            <li>Mantenha dados de contato atualizados para facilitar comunicação em caso de emergência</li>
            <li>Teste integrações (e-mail, WhatsApp, pagamentos) após configuração inicial</li>
            <li>Configure fluxo de aprovação de acordo com a realidade da empresa para evitar gargalos</li>
            <li>Use tema escuro para reduzir cansaço visual durante uso prolongado</li>
            <li>Personalize branding para criar identidade visual consistente em relatórios e documentos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
