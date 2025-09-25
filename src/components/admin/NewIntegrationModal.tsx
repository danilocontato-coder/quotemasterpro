import { useState } from "react";
import { Plus, Save, TestTube, Eye, EyeOff, AlertCircle, CheckCircle, MessageSquare, Mail, CreditCard, Zap, Brain, Truck, Globe, MapPin, DollarSign, FileText, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'testing';
  apiKey?: string;
  webhookUrl?: string;
  settings: Record<string, any>;
  createdAt: string;
  lastTested?: string;
}

interface NewIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIntegrationCreate: (integration: Omit<Integration, "id" | "createdAt">) => void;
  editingIntegration?: Integration | null;
}

const integrationTypes = [
  {
    id: 'whatsapp',
    name: 'WhatsApp (Twilio)',
    description: 'Envio de mensagens via WhatsApp usando Twilio',
    icon: MessageSquare,
    category: 'Comunicação',
    color: 'hsl(142, 71%, 45%)'
  },
  {
    id: 'email_sendgrid',
    name: 'E-mail (SendGrid)',
    description: 'Envio de e-mails transacionais via SendGrid',
    icon: Mail,
    category: 'Comunicação',
    color: 'hsl(220, 70%, 50%)'
  },
  {
    id: 'email_smtp',
    name: 'E-mail (SMTP)',
    description: 'Envio de e-mails via servidor SMTP personalizado',
    icon: Mail,
    category: 'Comunicação',
    color: 'hsl(239, 84%, 67%)'
  },
  {
    id: 'payment_stripe',
    name: 'Pagamentos (Stripe)',
    description: 'Processamento de pagamentos via Stripe',
    icon: CreditCard,
    category: 'Pagamentos',
    color: 'hsl(271, 91%, 65%)'
  },
  {
    id: 'payment_pagseguro',
    name: 'Pagamentos (PagSeguro)',
    description: 'Processamento de pagamentos via PagSeguro',
    icon: CreditCard,
    category: 'Pagamentos',
    color: 'hsl(38, 92%, 50%)'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automação de workflows via Zapier',
    icon: Zap,
    category: 'Automação',
    color: 'hsl(25, 95%, 53%)'
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    description: 'Análise inteligente de mercado e preços',
    icon: Brain,
    category: 'Inteligência Artificial',
    color: 'hsl(328, 86%, 70%)'
  },
  {
    id: 'delivery_api',
    name: 'API de Entrega',
    description: 'Integração com transportadoras e logística',
    icon: Truck,
    category: 'Logística',
    color: 'hsl(160, 84%, 39%)'
  },
  {
    id: 'cep_api',
    name: 'API de CEP',
    description: 'Consulta de endereços por CEP',
    icon: MapPin,
    category: 'Validação',
    color: 'hsl(200, 98%, 39%)'
  },
  {
    id: 'currency_api',
    name: 'API de Cotação',
    description: 'Cotação de moedas e câmbio',
    icon: DollarSign,
    category: 'Financeiro',
    color: 'hsl(142, 71%, 45%)'
  },
  {
    id: 'document_validation',
    name: 'Validação de Documentos',
    description: 'Validação de CPF, CNPJ e outros documentos',
    icon: FileText,
    category: 'Validação',
    color: 'hsl(0, 72%, 51%)'
  },
  {
    id: 'webhook_generic',
    name: 'Webhook Genérico',
    description: 'Webhook personalizado para integrações customizadas',
    icon: Link,
    category: 'Personalizado',
    color: 'hsl(343, 84%, 58%)'
  }
];

export function NewIntegrationModal({ open, onOpenChange, onIntegrationCreate, editingIntegration }: NewIntegrationModalProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    status: 'inactive' as 'active' | 'inactive' | 'testing',
    apiKey: "",
    webhookUrl: "",
    settings: {} as Record<string, any>
  });

  const handleTypeSelect = (typeId: string) => {
    const integrationType = integrationTypes.find(t => t.id === typeId);
    if (!integrationType) return;

    setSelectedType(typeId);
    setFormData(prev => ({
      ...prev,
      type: typeId,
      name: integrationType.name,
      settings: getDefaultSettings(typeId)
    }));
  };

  const getDefaultSettings = (typeId: string): Record<string, any> => {
    switch (typeId) {
      case 'whatsapp':
        return {
          twilioAccountSid: "",
          twilioAuthToken: "",
          twilioPhoneNumber: "",
          webhookUrl: ""
        };
      case 'email_sendgrid':
        return {
          apiKey: "",
          fromEmail: "",
          fromName: "",
          replyTo: ""
        };
      case 'email_smtp':
        return {
          host: "",
          port: 587,
          username: "",
          password: "",
          secure: true,
          fromEmail: "",
          fromName: ""
        };
      case 'payment_stripe':
        return {
          publicKey: "",
          secretKey: "",
          webhookSecret: "",
          currency: "BRL"
        };
      case 'payment_pagseguro':
        return {
          email: "",
          token: "",
          appId: "",
          appKey: "",
          sandbox: true
        };
      case 'zapier':
        return {
          webhookUrl: "",
          triggerEvents: ["quote_created", "quote_approved", "payment_received"]
        };
      case 'perplexity':
        return {
          apiKey: "",
          model: "llama-3.1-sonar-small-128k-online",
          maxTokens: 1000
        };
      case 'delivery_api':
        return {
          apiKey: "",
          baseUrl: "",
          provider: "correios"
        };
      case 'cep_api':
        return {
          apiKey: "",
          provider: "viacep"
        };
      case 'currency_api':
        return {
          apiKey: "",
          baseCurrency: "USD",
          provider: "exchangerate-api"
        };
      case 'document_validation':
        return {
          apiKey: "",
          provider: "receitaws"
        };
      case 'webhook_generic':
        return {
          webhookUrl: "",
          method: "POST",
          headers: {},
          authType: "none"
        };
      default:
        return {};
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      // Simulate API test - replace with actual test logic per integration type
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock test result based on integration type
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      if (success) {
        setTestResult('success');
        toast.success("Conexão testada com sucesso!");
      } else {
        setTestResult('error');
        toast.error("Falha na conexão. Verifique as credenciais.");
      }
    } catch (error) {
      setTestResult('error');
      toast.error("Erro ao testar a conexão");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type) {
      toast.error("Nome e tipo são obrigatórios");
      return;
    }

    const integration = {
      name: formData.name,
      type: formData.type,
      status: formData.status,
      apiKey: formData.apiKey,
      webhookUrl: formData.webhookUrl,
      settings: formData.settings
    };

    onIntegrationCreate(integration);
    handleReset();
    onOpenChange(false);
    toast.success("Integração criada com sucesso!");
  };

  const handleReset = () => {
    setFormData({
      name: "",
      type: "",
      status: 'inactive',
      apiKey: "",
      webhookUrl: "",
      settings: {}
    });
    setSelectedType("");
    setTestResult(null);
  };

  const renderIntegrationForm = () => {
    const integrationType = integrationTypes.find(t => t.id === selectedType);
    if (!integrationType) return null;

    switch (selectedType) {
      case 'whatsapp':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Twilio Account SID *</label>
                <Input
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.settings.twilioAccountSid || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, twilioAccountSid: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Auth Token *</label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="Token de autenticação"
                    value={formData.settings.twilioAuthToken || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, twilioAuthToken: e.target.value }
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Número do WhatsApp *</label>
                <Input
                  placeholder="+5511999999999"
                  value={formData.settings.twilioPhoneNumber || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, twilioPhoneNumber: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                <Input
                  placeholder="https://seu-app.com/webhooks/whatsapp"
                  value={formData.settings.webhookUrl || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, webhookUrl: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      case 'email_sendgrid':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">API Key *</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.settings.apiKey || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, apiKey: e.target.value }
                  }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">E-mail Remetente *</label>
                <Input
                  type="email"
                  placeholder="noreply@empresa.com"
                  value={formData.settings.fromEmail || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, fromEmail: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Nome Remetente *</label>
                <Input
                  placeholder="Sistema de Cotações"
                  value={formData.settings.fromName || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, fromName: e.target.value }
                  }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">E-mail para Respostas</label>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={formData.settings.replyTo || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, replyTo: e.target.value }
                }))}
              />
            </div>
          </div>
        );

      case 'payment_stripe':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Chave Pública *</label>
                <Input
                  placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.settings.publicKey || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, publicKey: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Chave Secreta *</label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formData.settings.secretKey || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, secretKey: e.target.value }
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Webhook Secret</label>
                <Input
                  type="password"
                  placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.settings.webhookSecret || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, webhookSecret: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Moeda</label>
                <Select 
                  value={formData.settings.currency || "BRL"} 
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, currency: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">Real (BRL)</SelectItem>
                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'zapier':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Webhook URL *</label>
              <Input
                placeholder="https://hooks.zapier.com/hooks/catch/xxxxxx/xxxxxx/"
                value={formData.settings.webhookUrl || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, webhookUrl: e.target.value }
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL do webhook do seu Zap no Zapier
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Eventos que Disparam o Webhook</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { id: 'quote_created', label: 'Cotação Criada' },
                  { id: 'quote_approved', label: 'Cotação Aprovada' },
                  { id: 'quote_rejected', label: 'Cotação Rejeitada' },
                  { id: 'payment_received', label: 'Pagamento Recebido' },
                  { id: 'supplier_registered', label: 'Fornecedor Cadastrado' },
                  { id: 'user_registered', label: 'Usuário Cadastrado' }
                ].map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={event.id}
                      checked={formData.settings.triggerEvents?.includes(event.id) || false}
                      onChange={(e) => {
                        const events = formData.settings.triggerEvents || [];
                        const newEvents = e.target.checked 
                          ? [...events, event.id]
                          : events.filter((ev: string) => ev !== event.id);
                        setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, triggerEvents: newEvents }
                        }));
                      }}
                      className="rounded border-border"
                    />
                    <label htmlFor={event.id} className="text-xs font-medium cursor-pointer">
                      {event.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'perplexity':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">API Key *</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder="pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.settings.apiKey || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, apiKey: e.target.value }
                  }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Modelo</label>
                <Select 
                  value={formData.settings.model || "llama-3.1-sonar-small-128k-online"} 
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, model: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama-3.1-sonar-small-128k-online">Sonar Small (8B)</SelectItem>
                    <SelectItem value="llama-3.1-sonar-large-128k-online">Sonar Large (70B)</SelectItem>
                    <SelectItem value="llama-3.1-sonar-huge-128k-online">Sonar Huge (405B)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Tokens</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={formData.settings.maxTokens || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, maxTokens: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      case 'webhook_generic':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Webhook URL *</label>
              <Input
                placeholder="https://api.exemplo.com/webhook"
                value={formData.settings.webhookUrl || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, webhookUrl: e.target.value }
                }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Método HTTP</label>
                <Select 
                  value={formData.settings.method || "POST"} 
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, method: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Autenticação</label>
                <Select 
                  value={formData.settings.authType || "none"} 
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, authType: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Headers Personalizados (JSON)</label>
              <Textarea
                placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                value={JSON.stringify(formData.settings.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, headers }
                    }));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder="Sua chave de API"
                  value={formData.settings.apiKey || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, apiKey: e.target.value }
                  }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Base URL</label>
              <Input
                placeholder="https://api.exemplo.com"
                value={formData.settings.baseUrl || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, baseUrl: e.target.value }
                }))}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Integração
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="select" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="select">Selecionar Tipo</TabsTrigger>
            <TabsTrigger value="configure" disabled={!selectedType}>Configurar</TabsTrigger>
            <TabsTrigger value="test" disabled={!selectedType}>Testar</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="select" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrationTypes.map((integration) => {
                  const Icon = integration.icon;
                  return (
                    <Card 
                      key={integration.id}
                      className={`cursor-pointer transition-all hover:scale-105 ${
                        selectedType === integration.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleTypeSelect(integration.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: integration.color + '20', color: integration.color }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm">{integration.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {integration.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          {integration.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="configure" className="space-y-6">
              {selectedType && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nome da Integração *</label>
                        <Input
                          placeholder="Ex: WhatsApp Principal"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Status Inicial</label>
                          <p className="text-xs text-muted-foreground">
                            A integração será criada como inativa. Ative após testar.
                          </p>
                        </div>
                        <Switch
                          checked={formData.status === 'active'}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Configurações da API</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderIntegrationForm()}
                    </CardContent>
                  </Card>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Importante:</strong> As chaves de API serão armazenadas de forma segura no Supabase 
                      utilizando criptografia. Nunca compartilhe suas credenciais.
                    </AlertDescription>
                  </Alert>
                </form>
              )}
            </TabsContent>

            <TabsContent value="test" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Testar Conexão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Teste a conexão com a API para verificar se as credenciais estão corretas.
                  </p>
                  
                  <Button
                    type="button"
                    onClick={testConnection}
                    disabled={testingConnection}
                    className="w-full"
                  >
                    {testingConnection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Testando Conexão...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Testar Conexão
                      </>
                    )}
                  </Button>

                  {testResult === 'success' && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Conexão estabelecida com sucesso! A integração está funcionando corretamente.
                      </AlertDescription>
                    </Alert>
                  )}

                  {testResult === 'error' && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Falha na conexão. Verifique suas credenciais e tente novamente.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        handleReset();
                        onOpenChange(false);
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="flex-1"
                      disabled={!formData.name || !selectedType}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Integração
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}