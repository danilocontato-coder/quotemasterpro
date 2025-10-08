import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileText, DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useAdministradora } from '@/contexts/AdministradoraContext';
import { Badge } from '@/components/ui/badge';

export const AdministradoraDashboard = () => {
  const { currentClientId, condominios } = useAdministradora();

  // Mock data - será substituído por dados reais
  const mockMetrics = {
    totalQuotes: 47,
    totalSpent: 156780.50,
    activeSuppliers: 23,
    pendingApprovals: 8
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-green-900">
          {currentClientId === 'all' ? 'Visão Geral Consolidada' : 'Dashboard do Condomínio'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {currentClientId === 'all' 
            ? `Gerenciando ${condominios.length} condomínios`
            : 'Análise detalhada do condomínio selecionado'
          }
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cotações</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{mockMetrics.totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              R$ {mockMetrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              -8% economia via consolidação
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fornecedores Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{mockMetrics.activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Em {condominios.length} condomínios
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovações Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mockMetrics.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards por Condomínio (quando visão geral) */}
      {currentClientId === 'all' && (
        <div>
          <h2 className="text-xl font-semibold text-green-900 mb-4">Condomínios Gerenciados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {condominios.map((condo) => (
              <Card key={condo.id} className="border-green-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-base">{condo.name}</CardTitle>
                    </div>
                    <Badge variant={condo.status === 'active' ? 'default' : 'secondary'} className="bg-green-100 text-green-800">
                      {condo.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{condo.cnpj}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cotações Ativas:</span>
                      <span className="font-medium">{condo.activeQuotes}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gasto Mensal:</span>
                      <span className="font-medium">R$ 12.500,00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {condominios.length === 0 && (
              <Card className="col-span-full border-dashed border-2 border-green-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-green-400 mb-4" />
                  <p className="text-muted-foreground">Nenhum condomínio vinculado ainda</p>
                  <p className="text-sm text-muted-foreground">Vincule condomínios para começar a gerenciá-los</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Insights de IA (placeholder) */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle>Insights de IA</CardTitle>
          </div>
          <CardDescription>
            Análises automáticas baseadas em seus dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Funcionalidade em desenvolvimento - aqui serão exibidos insights gerados automaticamente pela IA
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdministradoraDashboard;
