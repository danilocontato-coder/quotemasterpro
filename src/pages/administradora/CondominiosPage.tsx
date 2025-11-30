import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, RefreshCw, Building2, Users, FileText, MapPin, ChevronRight } from 'lucide-react';
import { useCondominiosVinculados } from '@/hooks/useCondominiosVinculados';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CondominioQuickCreate } from '@/components/admin/CondominioQuickCreate';

export default function CondominiosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { condominios, isLoading, refetch } = useCondominiosVinculados();

  const handleCondominioCreated = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Condomínios Vinculados</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os condomínios da sua administradora
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Condomínio
          </Button>
        </div>
      </div>

      {/* Grid de Condomínios */}
      {condominios.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum condomínio vinculado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando o primeiro condomínio da sua rede
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Condomínio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {condominios.map((condo) => (
            <Card 
              key={condo.id} 
              className="hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate(`/administradora/condominios/${condo.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{condo.name}</CardTitle>
                  </div>
                  <Badge variant={condo.status === 'active' ? 'default' : 'secondary'}>
                    {condo.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardDescription>{condo.cnpj}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {condo.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{condo.address}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                      <FileText className="h-5 w-5" />
                      {condo.cotacoesCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Cotações</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                      <Users className="h-5 w-5" />
                      {condo.usuariosCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Usuários</p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
                    size="sm"
                  >
                    Acessar Painel
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação */}
      {user?.clientId && (
        <CondominioQuickCreate
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          administradoraId={user.clientId}
          onSuccess={handleCondominioCreated}
        />
      )}
    </div>
  );
}
