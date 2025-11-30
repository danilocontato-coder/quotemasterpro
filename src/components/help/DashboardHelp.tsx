import { 
  BarChart3, 
  Bell, 
  Zap, 
  LineChart, 
  Users, 
  FileText,
  TrendingUp,
  Clock
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { AnnotatedScreenshot, Hotspot } from "./AnnotatedScreenshot";
import { FeatureCard, FeatureCardGrid } from "./FeatureCard";
import { QuoteFlowDiagram } from "./FlowDiagram";
import { HelpTourButton, RestartTourButton } from "./HelpTourButton";
import { LocationIndicator, QuickLocation } from "./LocationIndicator";
import { DashboardScreenMockup } from "./screens/DashboardScreenMockup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface HelpProps {
  searchQuery?: string;
}

const dashboardHotspots: Hotspot[] = [
  {
    id: "header",
    x: 85,
    y: 8,
    label: "Notificações e Perfil",
    description: "Acesse suas notificações em tempo real e configurações do perfil. O ícone de sino mostra alertas sobre cotações, aprovações e entregas.",
  },
  {
    id: "metrics",
    x: 50,
    y: 28,
    label: "Cards de Métricas",
    description: "Visão rápida dos números mais importantes: cotações ativas, aprovações pendentes, valor total investido e fornecedores ativos. Clique em cada card para ver detalhes.",
  },
  {
    id: "actions",
    x: 20,
    y: 48,
    label: "Ações Rápidas",
    description: "Botões de acesso direto às funções mais usadas. Crie uma nova cotação ou acesse aprovações pendentes com um clique.",
  },
  {
    id: "charts",
    x: 50,
    y: 75,
    label: "Gráficos e Análises",
    description: "Visualize a distribuição de status das cotações e a tendência de gastos ao longo do tempo para tomar decisões informadas.",
  },
];

export function DashboardHelp({ searchQuery }: HelpProps) {
  const { settings } = useBranding();

  return (
    <div className="space-y-8">
      {/* Intro Alert */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O Dashboard é a página inicial do sistema {settings.companyName}, onde você visualiza um resumo de todas as atividades e métricas importantes.
        </AlertDescription>
      </Alert>

      {/* Tour Buttons */}
      <div className="flex flex-wrap gap-3">
        <HelpTourButton 
          module="dashboard" 
          targetRoute="/dashboard"
          label="Ver Dashboard em Ação"
        />
        <RestartTourButton />
      </div>

      {/* Annotated Screenshot */}
      <AnnotatedScreenshot
        title="Visão Geral do Dashboard"
        description="Clique nos números para explorar cada área da interface"
        hotspots={dashboardHotspots}
        aspectRatio="16/9"
      >
        <DashboardScreenMockup />
      </AnnotatedScreenshot>

      <Separator />

      {/* Feature Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">📊 Métricas Principais</h3>
        <FeatureCardGrid columns={2}>
          <FeatureCard
            icon={FileText}
            title="Cotações Ativas"
            description="Número total de cotações em andamento. Mostra quantas solicitações estão abertas ou aguardando respostas de fornecedores."
            location="Dashboard → Card superior esquerdo"
            tip="Clique no card para ir direto à lista de cotações"
            variant="highlight"
          />
          <FeatureCard
            icon={Clock}
            title="Aprovações Pendentes"
            description="Cotações que aguardam sua decisão. Útil para gestores que precisam aprovar ou rejeitar solicitações."
            location="Dashboard → Segundo card"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Total Investido"
            description="Soma de todos os valores das cotações aprovadas e pagas no período atual."
            location="Dashboard → Terceiro card"
          />
          <FeatureCard
            icon={Users}
            title="Fornecedores Ativos"
            description="Quantidade de fornecedores cadastrados e disponíveis para receber cotações."
            location="Dashboard → Quarto card"
          />
        </FeatureCardGrid>
      </div>

      <Separator />

      {/* Flow Diagram */}
      <QuoteFlowDiagram 
        title="🔄 Fluxo Completo de uma Cotação"
        description="Entenda o ciclo de vida de uma cotação do início ao fim"
      />

      <Separator />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Na parte superior do Dashboard, você encontra botões de acesso rápido para as funções mais utilizadas:
          </p>
          
          <div className="grid gap-3">
            <QuickLocation 
              icon="➕" 
              label="Nova Cotação" 
              location="Dashboard → Botão azul principal" 
            />
            <QuickLocation 
              icon="📋" 
              label="Ver Aprovações" 
              location="Dashboard → Botão secundário" 
            />
            <QuickLocation 
              icon="🏢" 
              label="Fornecedores" 
              location="Menu lateral → Fornecedores" 
            />
            <QuickLocation 
              icon="📊" 
              label="Relatórios" 
              location="Menu lateral → Relatórios" 
            />
          </div>

          <LocationIndicator
            path={["Sidebar", "Dashboard", "Ações Rápidas"]}
            description="Os botões de ação rápida ficam logo abaixo dos cards de métricas"
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Charts Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">📈 Gráficos e Análises</h3>
        <FeatureCardGrid columns={2}>
          <FeatureCard
            icon={BarChart3}
            title="Status das Cotações"
            description="Gráfico em pizza mostrando a distribuição das cotações por status: rascunho, enviada, em análise, aprovada, etc."
            tip="Passe o mouse sobre cada fatia para ver os valores exatos"
          />
          <FeatureCard
            icon={LineChart}
            title="Tendência de Gastos"
            description="Gráfico de linhas mostrando a evolução dos gastos ao longo do tempo. Identifique tendências e picos de consumo."
            tip="Use os filtros de data para analisar períodos específicos"
          />
        </FeatureCardGrid>
      </div>

      <Separator />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Sistema de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No canto superior direito, o ícone de sino mostra suas notificações em tempo real:
          </p>
          
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Novas respostas de fornecedores</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Aprovações aguardando sua decisão</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Atualizações de status de cotações</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Lembretes de prazos importantes</span>
            </li>
          </ul>

          <LocationIndicator
            path={["Header", "Ícone de Sino", "🔔"]}
            description="Clique no sino para ver todas as notificações não lidas"
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Pro Tips */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">💡 Dicas de Produtividade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-primary font-bold">1.</span>
            <p><strong>Filtros de período:</strong> Use os filtros de data no topo para análises específicas por semana, mês ou trimestre.</p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-primary font-bold">2.</span>
            <p><strong>Cards clicáveis:</strong> Todos os cards de métricas são clicáveis e levam diretamente ao módulo correspondente.</p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-primary font-bold">3.</span>
            <p><strong>Atualização automática:</strong> Os dados do dashboard são atualizados em tempo real conforme novas ações acontecem.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
