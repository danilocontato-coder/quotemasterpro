import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingDown, 
  Truck,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Building2,
  Brain
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data - será substituído por dados reais do Supabase
const mockKPIs = {
  totalCotacoes: 12,
  cotacoesDoMes: 3,
  aprovacoesPendentes: 2,
  entregasAgendadas: 1,
  gastosMes: 15420.50,
  economiaGerada: 3250.00,
};

const mockCotacoesRecentes = [
  { id: '1', localCode: 'RFQ045', descricao: 'Material de Limpeza', valor: 2500, status: 'awaiting_approval', dataCriacao: '2024-01-15' },
  { id: '2', localCode: 'RFQ044', descricao: 'Manutenção Elevadores', valor: 8500, status: 'approved', dataCriacao: '2024-01-12' },
  { id: '3', localCode: 'RFQ043', descricao: 'Jardinagem Mensal', valor: 1200, status: 'finalized', dataCriacao: '2024-01-10' },
];

const mockProximasEntregas = [
  { id: '1', cotacao: 'RFQ044', fornecedor: 'TechElevadores', dataAgendada: '2024-01-20', status: 'scheduled' },
];

export default function CondominioDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_approval':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Aguardando Aprovação</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprovada</Badge>;
      case 'finalized':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Finalizada</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600" />
            Dashboard do Condomínio
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe cotações, aprovações e gastos do seu condomínio
          </p>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">{mockKPIs.totalCotacoes}</p>
                <p className="text-xs text-blue-600">Total Cotações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-900">{mockKPIs.aprovacoesPendentes}</p>
                <p className="text-xs text-yellow-600">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900">{mockKPIs.cotacoesDoMes}</p>
                <p className="text-xs text-green-600">Este Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <Truck className="h-8 w-8 text-purple-600" />
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-900">{mockKPIs.entregasAgendadas}</p>
                <p className="text-xs text-purple-600">Entregas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="text-right">
                <p className="text-lg font-bold text-orange-900">{formatCurrency(mockKPIs.gastosMes)}</p>
                <p className="text-xs text-orange-600">Gastos Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <TrendingDown className="h-8 w-8 text-emerald-600" />
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-900">{formatCurrency(mockKPIs.economiaGerada)}</p>
                <p className="text-xs text-emerald-600">Economia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Aprovações Pendentes */}
      {mockKPIs.aprovacoesPendentes > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">
                    Você tem {mockKPIs.aprovacoesPendentes} aprovações pendentes
                  </p>
                  <p className="text-sm text-yellow-700">
                    Cotações aguardando sua análise e decisão
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                onClick={() => navigate('/condominio/aprovacoes')}
              >
                Ver Aprovações
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cotações Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Cotações Recentes</CardTitle>
              <CardDescription>Últimas cotações criadas pela administradora</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/condominio/cotacoes')}
            >
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockCotacoesRecentes.map((cotacao) => (
                <div 
                  key={cotacao.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/condominio/cotacoes/${cotacao.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-100">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">#{cotacao.localCode}</p>
                      <p className="text-xs text-muted-foreground">{cotacao.descricao}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(cotacao.valor)}</p>
                    {getStatusBadge(cotacao.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximas Entregas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Próximas Entregas</CardTitle>
              <CardDescription>Entregas agendadas para seu condomínio</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/condominio/entregas')}
            >
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {mockProximasEntregas.length > 0 ? (
              <div className="space-y-3">
                {mockProximasEntregas.map((entrega) => (
                  <div 
                    key={entrega.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-purple-100">
                        <Truck className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">#{entrega.cotacao}</p>
                        <p className="text-xs text-muted-foreground">{entrega.fornecedor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{new Date(entrega.dataAgendada).toLocaleDateString('pt-BR')}</p>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                        Agendada
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma entrega agendada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card de Análise de IA */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-lg">Insights de IA</CardTitle>
          </div>
          <CardDescription>Análises automáticas para otimizar seus gastos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/70 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-900">Economia Potencial</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(1850)}</p>
              <p className="text-xs text-muted-foreground mt-1">Baseado em análise de mercado</p>
            </div>
            <div className="p-4 rounded-lg bg-white/70 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-900">Preços Acima da Média</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">2 itens</p>
              <p className="text-xs text-muted-foreground mt-1">Recomendamos renegociar</p>
            </div>
            <div className="p-4 rounded-lg bg-white/70 border border-indigo-100">
              <p className="text-sm font-medium text-indigo-900">Score de Economia</p>
              <p className="text-2xl font-bold text-green-600 mt-1">87/100</p>
              <p className="text-xs text-muted-foreground mt-1">Excelente performance</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="mt-4 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            onClick={() => navigate('/condominio/analise-ia')}
          >
            Ver Análise Completa
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
