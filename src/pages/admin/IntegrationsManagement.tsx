import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Plus, 
  Settings, 
  MessageSquare, 
  Mail, 
  CreditCard,
  Zap,
  Brain,
  Truck,
  MapPin,
  DollarSign,
  FileText,
  Link,
  MoreHorizontal,
  Edit,
  Trash2,
  TestTube,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader2,
  Building,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegrationFormModal } from '@/components/admin/IntegrationFormModal';
import { IntegrationDetailsModal } from '@/components/admin/IntegrationDetailsModal';
import { StripeIntegrationPanel } from '@/components/admin/StripeIntegrationPanel';
import { useSupabaseIntegrations, Integration } from '@/hooks/useSupabaseIntegrations';
import { toast } from 'sonner';


const getIntegrationIcon = (type: string) => {
  switch (type) {
    case 'whatsapp_twilio': return MessageSquare;
    case 'whatsapp_evolution': return MessageSquare;
    case 'email_sendgrid': 
    case 'email_smtp': return Mail;
    case 'payment_stripe':
    case 'payment_pagseguro': return CreditCard;
    case 'zapier_webhook':
    case 'n8n_webhook': return Zap;
    case 'perplexity': return Brain;
    case 'delivery_api': return Truck;
    case 'cep_api': return MapPin;
    case 'currency_api': return DollarSign;
    case 'document_validation': return FileText;
    case 'generic_webhook': return Link;
    default: return Globe;
  }
};

const getStatusBadge = (active: boolean) => {
  return active 
    ? <Badge className="bg-green-100 text-green-800 border-green-200">Ativa</Badge>
    : <Badge className="bg-red-100 text-red-800 border-red-200">Inativa</Badge>;
};

const getScopeBadge = (integration: Integration) => {
  if (integration.client_id) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <Building className="h-3 w-3 mr-1" />
        Cliente Específico
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
      <Users className="h-3 w-3 mr-1" />
      Global
    </Badge>
  );
};

export const IntegrationsManagement = () => {
  const {
    integrations,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    toggleIntegrationStatus,
    testIntegration,
    stats
  } = useSupabaseIntegrations();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  const handleCreateIntegration = async (data: any) => {
    await createIntegration(data);
  };

  const handleEditIntegration = async (data: any) => {
    if (editingIntegration) {
      await updateIntegration(editingIntegration.id, data);
      setEditingIntegration(null);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta integração?")) {
      await deleteIntegration(id);
    }
  };

  const handleTestIntegration = async (id: string) => {
    setTestingId(id);
    try {
      await testIntegration(id);
    } finally {
      setTestingId(null);
    }
  };

  const handleViewDetails = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowDetailsModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integrações e APIs</h1>
            <p className="text-muted-foreground">Configure e monitore todas as integrações externas</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Integração
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Settings className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Integrações</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground">Inativas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TestTube className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.testing}</p>
              <p className="text-xs text-muted-foreground">Em Teste</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Pesquisa */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros e Pesquisa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar integrações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="whatsapp_twilio">WhatsApp (Twilio)</SelectItem>
                    <SelectItem value="whatsapp_evolution">WhatsApp (Evolution API)</SelectItem>
                    <SelectItem value="email_sendgrid">E-mail SendGrid</SelectItem>
                    <SelectItem value="email_smtp">E-mail SMTP</SelectItem>
                    <SelectItem value="payment_stripe">Stripe</SelectItem>
                    <SelectItem value="zapier_webhook">Zapier</SelectItem>
                    <SelectItem value="n8n_webhook">N8N</SelectItem>
                    <SelectItem value="generic_webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Integrações */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Integrações ({integrations.length})</CardTitle>
            <CardDescription>Gerencie todas as integrações de APIs e serviços externos</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando integrações...</span>
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhuma integração encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira integração para conectar APIs e serviços externos.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Integração
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integração</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Ativa</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((integration) => {
                    const Icon = getIntegrationIcon(integration.integration_type);
                    return (
                      <TableRow key={integration.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-muted">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{integration.integration_type.replace('_', ' ')}</p>
                              <p className="text-sm text-muted-foreground">
                                {Object.keys(integration.configuration).length} configurações
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {integration.integration_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          {getScopeBadge(integration)}
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(integration.active)}
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(integration.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Switch
                            checked={integration.active}
                            onCheckedChange={() => toggleIntegrationStatus(integration.id)}
                          />
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border z-50">
                              <DropdownMenuItem onClick={() => setEditingIntegration(integration)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDetails(integration)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleTestIntegration(integration.id)}
                                disabled={testingId === integration.id}
                              >
                                {testingId === integration.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <TestTube className="h-4 w-4 mr-2" />
                                )}
                                Testar Conexão
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteIntegration(integration.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Nova Integração */}
      <IntegrationFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreateIntegration}
      />

      {/* Modal de Edição */}
      <IntegrationFormModal
        open={!!editingIntegration}
        onOpenChange={(open) => !open && setEditingIntegration(null)}
        onSubmit={handleEditIntegration}
        editingIntegration={editingIntegration}
      />

      {/* Modal de Detalhes */}
      <IntegrationDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        integration={selectedIntegration}
      />
    </div>
  );
};

export default IntegrationsManagement;