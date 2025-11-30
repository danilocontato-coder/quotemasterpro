import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCondominioDetail } from '@/hooks/useCondominioDetail';
import { CondominioEditForm } from '@/components/administradora/CondominioEditForm';
import { CondominioDashboardTab } from '@/components/administradora/condominio-tabs/CondominioDashboardTab';
import { CondominioCotacoesTab } from '@/components/administradora/condominio-tabs/CondominioCotacoesTab';
import { CondominioFornecedoresTab } from '@/components/administradora/condominio-tabs/CondominioFornecedoresTab';
import { CondominioAprovacoesTab } from '@/components/administradora/condominio-tabs/CondominioAprovacoesTab';
import { CondominioUsuariosTab } from '@/components/administradora/condominio-tabs/CondominioUsuariosTab';
import { CondominioNiveisAprovacaoTab } from '@/components/administradora/condominio-tabs/CondominioNiveisAprovacaoTab';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Building2,
  LayoutDashboard,
  FileText,
  Package,
  CheckCircle,
  Users,
  Edit,
  RefreshCw,
  MapPin,
  Mail,
  Phone,
  Layers,
} from 'lucide-react';

export default function CondominioView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useCondominioDetail(id || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [administradoraName, setAdministradoraName] = useState('Administradora');

  // Fetch administradora name from parent_client_id
  useEffect(() => {
    const fetchAdministradoraName = async () => {
      if (data?.condominio?.parent_client_id) {
        const { data: parentClient } = await supabase
          .from('clients')
          .select('name')
          .eq('id', data.condominio.parent_client_id)
          .single();
        
        if (parentClient?.name) {
          setAdministradoraName(parentClient.name);
        }
      }
    };

    fetchAdministradoraName();
  }, [data?.condominio?.parent_client_id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data?.condominio) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Condomínio não encontrado</h2>
        <p className="text-muted-foreground">{error || 'Este condomínio não existe ou foi removido.'}</p>
        <Button variant="outline" onClick={() => navigate('/administradora/condominios')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Lista
        </Button>
      </div>
    );
  }

  const { condominio, metrics } = data;

  const handleEditSuccess = () => {
    setIsEditing(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/administradora/condominios')}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{condominio.name}</h1>
              <Badge variant={condominio.status === 'active' ? 'default' : 'secondary'}>
                {condominio.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>CNPJ: {condominio.cnpj}</span>
              {condominio.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {condominio.address}
                </span>
              )}
              {condominio.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {condominio.email}
                </span>
              )}
              {condominio.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {condominio.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Edit Form (conditionally rendered) */}
      {isEditing && (
        <div className="bg-card border rounded-lg p-6">
          <CondominioEditForm
            condominioId={condominio.id}
            initialData={{
              name: condominio.name,
              cnpj: condominio.cnpj,
              email: condominio.email || '',
              phone: condominio.phone || '',
              address: condominio.address || '',
              status: condominio.status as 'active' | 'inactive',
            }}
            onSuccess={handleEditSuccess}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {/* Tabs Navigation */}
      {!isEditing && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="cotacoes" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Cotações</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {metrics.totalQuotes}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Fornecedores</span>
            </TabsTrigger>
            <TabsTrigger value="aprovacoes" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Aprovações</span>
            </TabsTrigger>
            <TabsTrigger value="niveis" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Níveis</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {metrics.activeUsers}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <CondominioDashboardTab 
              condominio={condominio} 
              metrics={metrics} 
              quotes={data.quotes}
            />
          </TabsContent>

          <TabsContent value="cotacoes">
            <CondominioCotacoesTab 
              condominioId={condominio.id} 
              quotes={data.quotes}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="fornecedores">
            <CondominioFornecedoresTab condominioId={condominio.id} />
          </TabsContent>

          <TabsContent value="aprovacoes">
            <CondominioAprovacoesTab 
              condominioId={condominio.id}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="niveis">
            <CondominioNiveisAprovacaoTab 
              condominioId={condominio.id}
              administradoraId={condominio.parent_client_id}
            />
          </TabsContent>

          <TabsContent value="usuarios">
            <CondominioUsuariosTab 
              condominioId={condominio.id}
              condominioName={condominio.name}
              condominioEmail={condominio.email || ''}
              administradoraName={administradoraName}
              users={data.users}
              onRefresh={refetch}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
