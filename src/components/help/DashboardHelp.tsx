import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";

interface HelpProps {
  searchQuery?: string;
}

export function DashboardHelp({ searchQuery }: HelpProps) {
  const { settings } = useBranding();
  
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O Dashboard é a página inicial do sistema, onde você visualiza um resumo de todas as atividades e métricas importantes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>O que é o Dashboard?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O Dashboard é a página principal do sistema {settings.companyName}. Ele oferece uma visão geral de todas as suas operações, incluindo cotações ativas, aprovações pendentes, pagamentos e estatísticas importantes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métricas Principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">1. Cotações Ativas</h4>
            <p className="text-muted-foreground">
              Mostra o número total de cotações em andamento. Clique no card para ver a lista completa de cotações.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">2. Aprovações Pendentes</h4>
            <p className="text-muted-foreground">
              Exibe quantas aprovações estão aguardando sua análise. Útil para gestores que precisam acompanhar o fluxo de aprovação.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">3. Total Investido</h4>
            <p className="text-muted-foreground">
              Valor total gasto em cotações aprovadas e pagas no período selecionado.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">4. Fornecedores Ativos</h4>
            <p className="text-muted-foreground">
              Número de fornecedores cadastrados e ativos no sistema.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gráficos e Análises</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Gráfico de Status das Cotações</h4>
            <p className="text-muted-foreground">
              Visualização em pizza mostrando a distribuição das cotações por status (rascunho, enviada, em análise, aprovada, etc.).
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Tendência de Gastos</h4>
            <p className="text-muted-foreground">
              Gráfico de linhas mostrando a evolução dos gastos ao longo do tempo, permitindo identificar tendências e picos de consumo.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Top Fornecedores</h4>
            <p className="text-muted-foreground">
              Lista dos fornecedores com maior volume de negócios, ajudando a identificar parcerias estratégicas.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Na parte superior do Dashboard, você encontra botões de acesso rápido para:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Criar nova cotação</li>
            <li>Ver aprovações pendentes</li>
            <li>Gerenciar fornecedores</li>
            <li>Acessar relatórios</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            No canto superior direito, você verá o ícone de notificações. Clique nele para ver:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Novas respostas de fornecedores</li>
            <li>Aprovações que aguardam sua decisão</li>
            <li>Atualizações de status de cotações</li>
            <li>Lembretes de prazos</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dicas Úteis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Personalize o período de visualização dos dados usando os filtros de data no topo da página para análises mais específicas.
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              <strong>Dica:</strong> Clique nos cards de métricas para navegar diretamente para a página detalhada do módulo correspondente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
