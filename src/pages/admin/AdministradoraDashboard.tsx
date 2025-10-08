import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, RefreshCw, Network } from 'lucide-react';
import { useAdministradoraData } from '@/hooks/useAdministradoraData';
import { useCondominiosVinculados } from '@/hooks/useCondominiosVinculados';
import { ConsolidatedMetrics } from '@/components/admin/ConsolidatedMetrics';
import { CondominiosList } from '@/components/admin/CondominiosList';
import { CondominioQuickCreate } from '@/components/admin/CondominioQuickCreate';
import { useNavigate } from 'react-router-dom';
import { BrandedLogo } from '@/components/branding/BrandedLogo';

export default function AdministradoraDashboard() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { 
    isAdministradora, 
    metrics, 
    clientId,
    clientName,
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useAdministradoraData();

  const {
    condominios,
    isLoading: condominiosLoading,
    refetch: refetchCondominios
  } = useCondominiosVinculados(clientId || undefined);

  console.log('🏢 AdministradoraDashboard: Renderizando dashboard', {
    isAdministradora,
    clientId,
    totalCondominios: metrics?.totalCondominios
  });

  // Se não é administradora, redirecionar
  React.useEffect(() => {
    if (!metricsLoading && !isAdministradora) {
      console.log('⚠️ AdministradoraDashboard: Não é administradora, redirecionando...');
      navigate('/dashboard');
    }
  }, [isAdministradora, metricsLoading, navigate]);

  const handleRefresh = async () => {
    console.log('🔄 AdministradoraDashboard: Atualizando dados');
    await Promise.all([refetchMetrics(), refetchCondominios()]);
  };

  const handleCondominioCreated = () => {
    console.log('✅ AdministradoraDashboard: Condomínio criado, atualizando lista');
    refetchCondominios();
    refetchMetrics();
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Carregando dados da administradora...</p>
        </div>
      </div>
    );
  }

  if (!isAdministradora) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BrandedLogo variant="header" size="lg" />
          </div>
          <h1 className="text-3xl font-bold">Painel da Administradora</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus condomínios e visualize métricas consolidadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Condomínio
          </Button>
        </div>
      </div>

      {/* Métricas Consolidadas */}
      {metrics && (
        <ConsolidatedMetrics
          totalCondominios={metrics.totalCondominios}
          totalCotacoes={metrics.totalCotacoes}
          economiaTotal={metrics.economiaTotal}
          fornecedoresUnicos={metrics.fornecedoresUnicos}
          usuariosTotais={metrics.usuariosTotais}
          cotacoesMesAtual={metrics.cotacoesMesAtual}
          isLoading={metricsLoading}
        />
      )}

      {/* Visão Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Visão Geral da Rede
          </CardTitle>
          <CardDescription>
            Sua administradora gerencia {metrics?.totalCondominios || 0} condomínio(s) vinculado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Atividade Mensal</p>
              <p className="text-2xl font-bold text-blue-600">
                {metrics?.cotacoesMesAtual || 0} cotações
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Economia Total</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(metrics?.economiaTotal || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Usuários Totais</p>
              <p className="text-2xl font-bold text-purple-600">
                {metrics?.usuariosTotais || 0} ativos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Condomínios */}
      <CondominiosList
        condominios={condominios}
        isLoading={condominiosLoading}
        onView={(cond) => {
          console.log('👁️ Ver detalhes do condomínio:', cond.name);
          // TODO: Implementar modal de detalhes
        }}
        onEdit={(cond) => {
          console.log('✏️ Editar condomínio:', cond.name);
          // TODO: Implementar modal de edição
        }}
      />

      {/* Modal de Criação Rápida */}
      <CondominioQuickCreate
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        administradoraId={clientId || ''}
        onSuccess={handleCondominioCreated}
      />
    </div>
  );
}
