import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, Building2, DollarSign, TrendingUp, FileText, BarChart3, AlertTriangle } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function CostCentersHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Centro de Custos permite organizar e rastrear gastos por departamento, projeto ou área da organização.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            O que é um Centro de Custo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Centro de Custo é uma unidade organizacional que permite rastrear e controlar gastos de forma segmentada.
          </p>
          
          <div>
            <h4 className="font-semibold text-sm mb-2">Definição e Importância</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Permite identificar onde os recursos estão sendo gastos</li>
              <li>Facilita análise de rentabilidade por departamento ou projeto</li>
              <li>Ajuda no planejamento orçamentário e controle de custos</li>
              <li>Essencial para auditoria e prestação de contas</li>
              <li>Permite comparar eficiência entre diferentes áreas</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Exemplos de Centros de Custo</h4>
            <div className="space-y-2 mt-2">
              <div>
                <p className="font-medium text-sm">Por Departamento:</p>
                <p className="text-xs text-muted-foreground ml-4">RH, TI, Marketing, Financeiro, Operações, Comercial</p>
              </div>
              <div>
                <p className="font-medium text-sm">Por Projeto:</p>
                <p className="text-xs text-muted-foreground ml-4">Reforma do Salão, Implementação ERP, Campanha Verão 2025</p>
              </div>
              <div>
                <p className="font-medium text-sm">Por Obra/Unidade:</p>
                <p className="text-xs text-muted-foreground ml-4">Condomínio Torre A, Condomínio Torre B, Edifício Comercial</p>
              </div>
              <div>
                <p className="font-medium text-sm">Por Cliente/Contrato:</p>
                <p className="text-xs text-muted-foreground ml-4">Cliente Alfa, Contrato Serviços Mensais, Projeto Beta</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Como Criar um Centro de Custo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Siga estes passos para criar um novo centro de custo:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li><strong>Acesse o módulo:</strong> Clique em "Centro de Custos" no menu lateral</li>
            <li><strong>Criar novo centro de custo:</strong> Clique no botão "Novo Centro de Custo"</li>
            <li><strong>Informar dados básicos:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Nome do centro de custo (ex: "Marketing Digital")</li>
                <li>Código único (ex: "MKT-001")</li>
                <li>Responsável (usuário gestor do centro de custo)</li>
                <li>Descrição (opcional, mas recomendado)</li>
              </ul>
            </li>
            <li><strong>Definir orçamento (opcional):</strong> Estabeleça um limite de gastos mensal ou anual</li>
            <li><strong>Configurar hierarquia (opcional):</strong> Vincule a um centro de custo pai se aplicável</li>
            <li><strong>Salvar:</strong> Clique em "Salvar" para criar o centro de custo</li>
          </ol>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              O código do centro de custo não pode ser alterado após criação. Escolha um padrão consistente desde o início.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Como Vincular Cotações a Centros de Custo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Associe cada cotação a um centro de custo para rastreamento preciso:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Ao Criar uma Nova Cotação</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>No formulário de criação, localize o campo "Centro de Custo"</li>
              <li>Selecione o centro de custo apropriado no dropdown</li>
              <li>O campo pode ser obrigatório dependendo das configurações da empresa</li>
              <li>Uma cotação só pode ser vinculada a um centro de custo por vez</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Editar Centro de Custo de Cotação Existente</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Abra a cotação que deseja editar</li>
              <li>Clique em "Editar"</li>
              <li>Altere o centro de custo no dropdown</li>
              <li>Salve as alterações</li>
              <li>O histórico registra a mudança para auditoria</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatórios por Centro de Custo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Analise gastos e performance de cada centro de custo:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Gastos por centro de custo:</strong> Veja quanto cada departamento/projeto gastou no período</li>
            <li><strong>Comparação de consumo:</strong> Compare gastos entre diferentes centros de custo</li>
            <li><strong>Orçamento vs. Realizado:</strong> Visualize se está dentro do orçamento estabelecido</li>
            <li><strong>Tendências ao longo do tempo:</strong> Gráfico de linha mostrando evolução dos gastos</li>
            <li><strong>Top centros de custo:</strong> Ranking dos que mais consomem recursos</li>
            <li><strong>Gastos por categoria:</strong> Detalhe de onde cada centro de custo está gastando (produtos, serviços, fornecedores)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Gestão de Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Controle de orçamento para cada centro de custo:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Definir Limite de Gastos</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Configure um orçamento mensal ou anual para cada centro de custo</li>
              <li>Defina períodos específicos (trimestral, anual)</li>
              <li>Atualize orçamentos conforme necessário</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas de Estouro de Orçamento
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Receba notificações quando atingir 80%, 90% e 100% do orçamento</li>
              <li>Configure alertas personalizados por centro de custo</li>
              <li>E-mail automático para o responsável do centro de custo</li>
              <li>Dashboard mostra status visual (verde, amarelo, vermelho)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Aprovações Baseadas em Orçamento</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Configure regras para aprovar automaticamente cotações dentro do orçamento</li>
              <li>Exija aprovação adicional para cotações que estouram o orçamento</li>
              <li>Bloqueie novas cotações quando orçamento for totalmente consumido (configurável)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Hierarquia de Centros de Custo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Organize centros de custo em estrutura hierárquica para consolidação de gastos:
          </p>
          <div>
            <h4 className="font-semibold text-sm mb-2">Centros de Custo Pai e Filhos</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Crie centros de custo "pai" (ex: "Marketing")</li>
              <li>Crie centros de custo "filho" vinculados (ex: "Marketing Digital", "Marketing Offline")</li>
              <li>Estruture até 3 níveis de hierarquia</li>
            </ul>
            <div className="bg-muted/50 p-3 rounded-md mt-2 text-xs">
              <p className="font-semibold mb-1">Exemplo de Hierarquia:</p>
              <div className="ml-2">
                <p>📁 Operações (Pai)</p>
                <div className="ml-4">
                  <p>└─ 📄 Manutenção (Filho)</p>
                  <p>└─ 📄 Limpeza (Filho)</p>
                  <p>└─ 📄 Segurança (Filho)</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Consolidação de Gastos</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Os gastos dos centros de custo "filho" são automaticamente somados ao "pai"</li>
              <li>Relatórios mostram visão consolidada e detalhada</li>
              <li>Útil para análise por diretoria ou grande área</li>
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
            <li>Use códigos padronizados e consistentes para facilitar relatórios (ex: DEP-001, PRJ-001)</li>
            <li>Defina responsáveis claros para cada centro de custo</li>
            <li>Revise orçamentos trimestralmente e ajuste conforme necessário</li>
            <li>Configure alertas para evitar surpresas com estouros de orçamento</li>
            <li>Use hierarquia quando há múltiplos níveis de gestão (diretoria, gerência, supervisão)</li>
            <li>Vincule SEMPRE as cotações a um centro de custo para rastreabilidade completa</li>
            <li>Desative centros de custo de projetos finalizados em vez de excluí-los (mantém histórico)</li>
            <li>Exporte relatórios mensalmente para análise com equipe financeira</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
