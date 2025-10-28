import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, MessageSquare, Send, Users, Bell, Paperclip, MessageCircle } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function CommunicationHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Comunicação centraliza interações com fornecedores, tickets de suporte e anúncios do sistema.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sistema de Tickets de Suporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use o sistema de tickets para obter suporte técnico ou tirar dúvidas sobre o sistema:
          </p>

          <div>
            <h4 className="font-semibold text-sm mb-2">Como Criar um Ticket</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Acesse "Comunicação" no menu lateral e clique em "Novo Ticket"</li>
              <li>Escolha a categoria do problema:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li><strong>Técnico:</strong> Erros, bugs ou problemas no sistema</li>
                  <li><strong>Dúvida:</strong> Perguntas sobre funcionalidades</li>
                  <li><strong>Financeiro:</strong> Questões sobre pagamentos ou planos</li>
                  <li><strong>Sugestão:</strong> Ideias de melhorias ou novas funcionalidades</li>
                </ul>
              </li>
              <li>Defina a prioridade (Baixa, Média, Alta, Urgente)</li>
              <li>Escreva um título claro e objetivo</li>
              <li>Descreva o problema em detalhes na mensagem</li>
              <li>Anexe capturas de tela ou documentos relevantes (opcional)</li>
              <li>Clique em "Criar Ticket"</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Como Enviar Mensagens</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Abra o ticket existente na lista</li>
              <li>Digite sua mensagem no campo de texto na parte inferior</li>
              <li>Anexe arquivos se necessário (até 10MB por arquivo)</li>
              <li>Clique em "Enviar" ou pressione Enter</li>
              <li>Você receberá notificação quando a equipe responder</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Status do Ticket</h4>
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-blue-500 text-blue-700">Novo</Badge>
                <span className="text-xs text-muted-foreground">Ticket criado, aguardando atribuição</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">Aberto</Badge>
                <span className="text-xs text-muted-foreground">Ticket atribuído, aguardando resposta</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Em Andamento</Badge>
                <span className="text-xs text-muted-foreground">Equipe trabalhando na solução</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-green-500 text-green-700">Resolvido</Badge>
                <span className="text-xs text-muted-foreground">Problema solucionado, aguardando confirmação</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Fechado</Badge>
                <span className="text-xs text-muted-foreground">Ticket finalizado</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anexar Arquivos
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Tipos aceitos: PDF, imagens (JPG, PNG), documentos (DOC, XLS)</li>
              <li>Tamanho máximo: 10MB por arquivo</li>
              <li>Múltiplos arquivos podem ser anexados</li>
              <li>Arquivos ficam armazenados de forma privada e segura</li>
            </ul>
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Dica:</strong> Seja específico ao descrever o problema. Inclua passos para reproduzir erros e capturas de tela quando possível. Isso acelera a resolução.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mensagens para Fornecedores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Comunique-se diretamente com fornecedores através do sistema:
          </p>

          <div>
            <h4 className="font-semibold text-sm mb-2">Mensagens Individuais</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Acesse o perfil do fornecedor</li>
              <li>Clique em "Enviar Mensagem"</li>
              <li>Escreva sua mensagem e clique em "Enviar"</li>
              <li>O fornecedor recebe notificação por e-mail e no sistema</li>
              <li>Acompanhe o histórico de conversas</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Mensagens em Massa (Broadcast)
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Envie mensagens para múltiplos fornecedores de uma vez</li>
              <li>Útil para comunicados gerais, mudanças de política ou eventos</li>
              <li>Selecione fornecedores por categoria ou status</li>
              <li>Personalize a mensagem com variáveis (nome do fornecedor, etc.)</li>
            </ul>
            <Alert className="mt-2">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Use mensagens em massa com moderação para não sobrecarregar fornecedores.
              </AlertDescription>
            </Alert>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Histórico de Comunicações</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Veja todas as mensagens trocadas com cada fornecedor</li>
              <li>Busque mensagens por palavra-chave ou data</li>
              <li>Exporte histórico em PDF para documentação</li>
              <li>Filtre por tipo de mensagem (individual, broadcast, notificação de sistema)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Anúncios do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Fique informado sobre atualizações e eventos importantes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Notificações de manutenção:</strong> Avisos sobre paradas programadas ou atualizações do sistema</li>
            <li><strong>Novidades e recursos:</strong> Anúncios sobre novas funcionalidades disponíveis</li>
            <li><strong>Comunicados importantes:</strong> Mudanças em políticas, termos de uso ou preços</li>
            <li><strong>Dicas e tutoriais:</strong> Conteúdos educativos para aproveitar melhor o sistema</li>
            <li><strong>Central de anúncios:</strong> Acesse todos os anúncios anteriores na seção dedicada</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Receba alertas sobre eventos importantes através de múltiplos canais:
          </p>

          <div>
            <h4 className="font-semibold text-sm mb-2">Por E-mail</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Notificações de respostas em tickets</li>
              <li>Novas mensagens de fornecedores</li>
              <li>Cotações aprovadas ou rejeitadas</li>
              <li>Resumos diários ou semanais (configurável)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Por WhatsApp (se configurado)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Alertas urgentes em tempo real</li>
              <li>Aprovações pendentes</li>
              <li>Pagamentos processados</li>
              <li>Entregas realizadas</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">In-app (no sistema)</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Notificações aparecem no ícone de sino no topo da página</li>
              <li>Clique para visualizar detalhes e tomar ação</li>
              <li>Marque como lidas ou arquive notificações antigas</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Personalize como e quando deseja receber notificações:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Acesse "Configurações" → "Notificações"</li>
            <li><strong>Ativar/desativar por tipo:</strong> Escolha quais eventos deseja ser notificado (cotações, pagamentos, mensagens, etc.)</li>
            <li><strong>Escolher canais preferidos:</strong> E-mail, WhatsApp, in-app ou combinação</li>
            <li><strong>Horário de silêncio:</strong> Desative notificações em horários específicos (ex: noturno, finais de semana)</li>
            <li><strong>Frequência de resumos:</strong> Opte por receber resumos em vez de notificações individuais</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Verifique tickets pendentes diariamente para não perder prazos de suporte</li>
            <li>Sempre forneça contexto completo ao criar tickets (capturas de tela, logs, passos para reproduzir)</li>
            <li>Use mensagens diretas para comunicações específicas e broadcast apenas para avisos gerais</li>
            <li>Configure notificações WhatsApp apenas para eventos urgentes que requerem ação imediata</li>
            <li>Revise e atualize preferências de notificação periodicamente para evitar sobrecarga</li>
            <li>Mantenha um tom profissional em todas as comunicações com fornecedores</li>
            <li>Archive anúncios lidos para manter a central organizada</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
