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
  Globe
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
import { NewIntegrationModal } from '@/components/admin/NewIntegrationModal';
import { toast } from 'sonner';

// Interface para integração
interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'active' | 'inactive' | 'testing';
  lastUsed: string;
  totalCalls: number;
  settings: Record<string, any>;
  createdAt: string;
}

// Mock data with comprehensive integrations
const mockIntegrations: Integration[] = [
  {
    id: "int-1",
    name: "WhatsApp Principal",
    type: "whatsapp",
    description: "Envio de notificações via WhatsApp",
    status: "active",
    lastUsed: "2 horas atrás",
    totalCalls: 1250,
    settings: {
      twilioAccountSid: "AC*********************",
      twilioPhoneNumber: "+5511999999999"
    },
    createdAt: "2024-01-15"
  },
  {
    id: "int-2", 
    name: "E-mail SendGrid",
    type: "email_sendgrid",
    description: "Envio de e-mails transacionais",
    status: "active",
    lastUsed: "30 minutos atrás",
    totalCalls: 5420,
    settings: {
      fromEmail: "noreply@empresa.com",
      fromName: "QuoteMaster Pro"
    },
    createdAt: "2024-01-10"
  },
  {
    id: "int-3",
    name: "Pagamentos Stripe",
    type: "payment_stripe", 
    description: "Processamento de pagamentos",
    status: "active",
    lastUsed: "1 hora atrás",
    totalCalls: 890,
    settings: {
      currency: "BRL"
    },
    createdAt: "2024-01-20"
  },
  {
    id: "int-4",
    name: "Automação Zapier",
    type: "zapier",
    description: "Integração com workflows externos",
    status: "inactive",
    lastUsed: "3 dias atrás", 
    totalCalls: 45,
    settings: {
      triggerEvents: ["quote_created", "quote_approved"]
    },
    createdAt: "2024-02-01"
  },
  {
    id: "int-5",
    name: "Perplexity AI",
    type: "perplexity",
    description: "Análise inteligente de mercado",
    status: "testing",
    lastUsed: "Nunca",
    totalCalls: 0,
    settings: {
      model: "llama-3.1-sonar-small-128k-online"
    },
    createdAt: "2024-02-10"
  }
];

const getIntegrationIcon = (type: string) => {
  switch (type) {
    case 'whatsapp': return MessageSquare;
    case 'email_sendgrid': 
    case 'email_smtp': return Mail;
    case 'payment_stripe':
    case 'payment_pagseguro': return CreditCard;
    case 'zapier': return Zap;
    case 'perplexity': return Brain;
    case 'delivery_api': return Truck;
    case 'cep_api': return MapPin;
    case 'currency_api': return DollarSign;
    case 'document_validation': return FileText;
    case 'webhook_generic': return Link;
    default: return Globe;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
    case 'testing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const IntegrationsManagement = () => {
  const [integrations, setIntegrations] = useState(mockIntegrations);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    integration.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateIntegration = (newIntegration: any) => {
    const integration = {
      id: `int-${Date.now()}`,
      ...newIntegration,
      lastUsed: "Nunca",
      totalCalls: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setIntegrations(prev => [...prev, integration]);
    toast.success("Integração criada com sucesso!");
  };

  const handleToggleStatus = (id: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { 
            ...integration, 
            status: integration.status === 'active' ? 'inactive' as const : 'active' as const
          }
        : integration
    ) as Integration[]);
    toast.success("Status da integração atualizado!");
  };

  const handleDeleteIntegration = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta integração?")) {
      setIntegrations(prev => prev.filter(integration => integration.id !== id));
      toast.success("Integração excluída com sucesso!");
    }
  };

  const stats = {
    total: integrations.length,
    active: integrations.filter(i => i.status === 'active').length,
    inactive: integrations.filter(i => i.status === 'inactive').length,
    testing: integrations.filter(i => i.status === 'testing').length,
    totalCalls: integrations.reduce((sum, i) => sum + i.totalCalls, 0)
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Chamadas Total</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Lista de Integrações */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Integrações ({filteredIntegrations.length})</CardTitle>
            <CardDescription>Gerencie todas as integrações de APIs e serviços externos</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integração</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead>Chamadas</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntegrations.map((integration) => {
                  const Icon = getIntegrationIcon(integration.type);
                  return (
                    <TableRow key={integration.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{integration.name}</p>
                            <p className="text-sm text-muted-foreground">{integration.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {integration.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(integration.status)}>
                          {integration.status === 'active' ? 'Ativa' : 
                           integration.status === 'inactive' ? 'Inativa' : 'Testando'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{integration.lastUsed}</span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm font-medium">{integration.totalCalls.toLocaleString()}</span>
                      </TableCell>

                      <TableCell>
                        <Switch
                          checked={integration.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(integration.id)}
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
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <TestTube className="h-4 w-4 mr-2" />
                              Testar Conexão
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings className="h-4 w-4 mr-2" />
                              Configurações
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
          </CardContent>
        </Card>
      </div>

      {/* Modal de Nova Integração */}
      <NewIntegrationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onIntegrationCreate={handleCreateIntegration}
      />
    </div>
  );
};