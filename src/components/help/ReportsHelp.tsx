import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, BarChart3, TrendingUp, Users, DollarSign, Package, FileText, Calendar, Download } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function ReportsHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Relatórios oferece análises detalhadas e visualizações sobre cotações, gastos, fornecedores e eficiência operacional.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tipos de Relatórios Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Relatório de Cotações
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Cotações por status (rascunho, enviadas, aprovadas, rejeitadas)</li>
                <li>Cotações por período (diário, semanal, mensal, anual)</li>
                <li>Valor total de cotações por status</li>
                <li>Tempo médio para aprovação</li>
                <li>Taxa de conversão (enviadas vs aprovadas)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Relatório de Fornecedores
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Performance por fornecedor (tempo de resposta, qualidade)</li>
                <li>Volume de cotações por fornecedor</li>
                <li>Valor total negociado com cada fornecedor</li>
                <li>Taxa de aprovação por fornecedor</li>
                <li>Ranking de fornecedores (por preço, qualidade, pontualidade)</li>
                <li>Fornecedores mais utilizados</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Relatório Financeiro
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Gastos totais por período</li>
                <li>Economia gerada (comparação entre propostas)</li>
                <li>Gastos por centro de custo</li>
                <li>Gastos por categoria de produto</li>
                <li>Projeção de gastos futuros</li>
                <li>Análise de orçamento (realizado vs planejado)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Relatório de Aprovações</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Tempo médio de aprovação por nível</li>
                <li>Taxa de aprovação vs rejeição</li>
                <li>Gargalos no fluxo de aprovação</li>
                <li>Aprovações por aprovador</li>
                <li>Pendências de aprovação</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Relatório de Produtos
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Produtos mais cotados</li>
                <li>Preço médio por produto ao longo do tempo</li>
                <li>Variação de preços entre fornecedores</li>
                <li>Produtos com maior gasto</li>
                <li>Tendências de consumo</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Como Gerar um Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Siga estes passos para gerar relatórios personalizados:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li><strong>Selecionar tipo de relatório:</strong> Escolha entre cotações, fornecedores, financeiro, aprovações ou produtos</li>
            <li><strong>Definir filtros:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Período: hoje, semana, mês, trimestre, ano ou personalizado</li>
                <li>Status: filtre por status específico (se aplicável)</li>
                <li>Fornecedor: selecione um ou mais fornecedores</li>
                <li>Categoria: filtre por categoria de produto</li>
                <li>Centro de custo: analise gastos por departamento/projeto</li>
              </ul>
            </li>
            <li><strong>Visualizar pré-visualização:</strong> Veja os dados em gráficos e tabelas antes de exportar</li>
            <li><strong>Exportar:</strong> Baixe o relatório em formato PDF (para apresentações), Excel (para análises) ou CSV (para importar em outras ferramentas)</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gráficos e Visualizações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Visualize seus dados de forma clara e intuitiva:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Gráfico de tendências de gastos:</strong> Linha do tempo mostrando evolução dos gastos</li>
            <li><strong>Distribuição por categoria:</strong> Gráfico de pizza mostrando onde está concentrando gastos</li>
            <li><strong>Comparação entre fornecedores:</strong> Gráfico de barras comparando preços e performance</li>
            <li><strong>Evolução temporal:</strong> Visualize mudanças ao longo do tempo (preços, volume, economia)</li>
            <li><strong>Heatmaps:</strong> Identifique padrões de consumo por dia, semana ou mês</li>
            <li><strong>Dashboard interativo:</strong> Filtros dinâmicos para explorar os dados</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamento de Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure relatórios automáticos para receber por e-mail:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Frequência:</strong> Escolha entre diária, semanal (segunda-feira), mensal (dia 1) ou trimestral</li>
            <li><strong>Hora de envio:</strong> Defina o horário de preferência (padrão: 8h)</li>
            <li><strong>Destinatários:</strong> Adicione múltiplos e-mails para receber o relatório</li>
            <li><strong>Formato:</strong> Escolha PDF (para leitura) ou Excel (para análise)</li>
            <li><strong>Filtros salvos:</strong> O relatório será gerado sempre com os mesmos filtros configurados</li>
          </ul>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Ideal para gestores que precisam acompanhar métricas regularmente sem esforço manual.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Indicadores-Chave (KPIs)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-3">
            Principais indicadores para monitorar a saúde do processo de cotações:
          </p>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm">Economia Gerada</h4>
              <p className="text-xs text-muted-foreground">
                Diferença entre a proposta mais cara e a proposta aprovada. Mede quanto você economizou ao comparar fornecedores.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Tempo Médio de Aprovação</h4>
              <p className="text-xs text-muted-foreground">
                Tempo médio entre o envio da cotação e a aprovação final. Ajuda a identificar gargalos no processo.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Taxa de Resposta de Fornecedores</h4>
              <p className="text-xs text-muted-foreground">
                Percentual de cotações respondidas por fornecedores. Indica engajamento e confiabilidade da base.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Valor Total Investido</h4>
              <p className="text-xs text-muted-foreground">
                Soma de todos os pagamentos realizados no período. Fundamental para controle orçamentário.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Taxa de Aprovação</h4>
              <p className="text-xs text-muted-foreground">
                Percentual de cotações aprovadas vs rejeitadas. Indica qualidade das propostas enviadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhores Práticas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Revise relatórios semanalmente para identificar tendências e tomar decisões proativas</li>
            <li>Use filtros por centro de custo para análises departamentais precisas</li>
            <li>Compare sempre o mesmo período do ano anterior para análises sazonais</li>
            <li>Configure relatórios automáticos mensais para stakeholders e gestores</li>
            <li>Utilize gráficos de tendência para apresentações em reuniões de diretoria</li>
            <li>Exporte dados em Excel para análises mais profundas com tabelas dinâmicas</li>
            <li>Monitore KPIs de economia para demonstrar valor gerado pela ferramenta</li>
            <li>Acompanhe o tempo médio de aprovação para otimizar o fluxo de trabalho</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
