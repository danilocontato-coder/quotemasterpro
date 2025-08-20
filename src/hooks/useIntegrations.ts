import { useState } from "react";

export interface IntegrationEndpoint {
  id: string;
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  description: string;
  lastTested?: string;
  status: "working" | "error" | "untested";
  responseTime?: number;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  integrationId: string;
  action: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
  responseTime?: number;
  endpoint?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: "email" | "whatsapp" | "sms" | "payment" | "crm" | "erp" | "storage" | "analytics" | "other";
  provider: string;
  description: string;
  status: "active" | "inactive" | "error" | "configuring";
  config: {
    apiKey?: string;
    secretKey?: string;
    webhookUrl?: string;
    baseUrl?: string;
    accountId?: string;
    customFields?: Record<string, any>;
  };
  endpoints: IntegrationEndpoint[];
  features: string[];
  limits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    currentUsage: number;
  };
  healthCheck: {
    lastCheck: string;
    status: "healthy" | "degraded" | "down";
    uptime: number; // percentage
    avgResponseTime: number;
  };
  logs: IntegrationLog[];
  metadata: {
    version: string;
    documentation: string;
    supportEmail: string;
    createdAt: string;
    updatedAt: string;
    lastUsed?: string;
  };
  notifications: {
    onError: boolean;
    onLimitReached: boolean;
    onStatusChange: boolean;
    recipients: string[];
  };
}

const generateMockLogs = (integrationId: string, count: number = 5): IntegrationLog[] => {
  const actions = ["send_email", "send_whatsapp", "process_payment", "sync_data", "webhook_received"];
  const statuses: Array<"success" | "error" | "warning"> = ["success", "success", "success", "error", "warning"];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${integrationId}-${i}`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    integrationId,
    action: actions[Math.floor(Math.random() * actions.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    message: `Action completed ${statuses[Math.floor(Math.random() * statuses.length)] === "success" ? "successfully" : "with errors"}`,
    responseTime: Math.floor(Math.random() * 2000) + 100,
    endpoint: "/api/v1/action"
  }));
};

const mockIntegrations: Integration[] = [
  {
    id: "int-sendgrid",
    name: "SendGrid",
    type: "email",
    provider: "SendGrid",
    description: "Serviço de e-mail transacional para notificações e campanhas",
    status: "active",
    config: {
      apiKey: "SG.***************",
      baseUrl: "https://api.sendgrid.com/v3"
    },
    endpoints: [
      {
        id: "ep-1",
        name: "Send Email",
        url: "/mail/send",
        method: "POST",
        headers: { "Authorization": "Bearer {apiKey}", "Content-Type": "application/json" },
        description: "Enviar e-mail transacional",
        lastTested: "2024-03-15T10:30:00Z",
        status: "working",
        responseTime: 245
      },
      {
        id: "ep-2",
        name: "Get Stats",
        url: "/stats",
        method: "GET",
        headers: { "Authorization": "Bearer {apiKey}" },
        description: "Obter estatísticas de envio",
        lastTested: "2024-03-15T09:15:00Z",
        status: "working",
        responseTime: 156
      }
    ],
    features: ["Templates", "Analytics", "Webhook Events", "Bounce Management"],
    limits: {
      requestsPerMinute: 600,
      requestsPerDay: 100000,
      currentUsage: 15420
    },
    healthCheck: {
      lastCheck: "2024-03-15T10:30:00Z",
      status: "healthy",
      uptime: 99.9,
      avgResponseTime: 201
    },
    logs: generateMockLogs("int-sendgrid"),
    metadata: {
      version: "v3",
      documentation: "https://docs.sendgrid.com",
      supportEmail: "support@sendgrid.com",
      createdAt: "2024-01-15",
      updatedAt: "2024-03-15",
      lastUsed: "2024-03-15T10:25:00Z"
    },
    notifications: {
      onError: true,
      onLimitReached: true,
      onStatusChange: true,
      recipients: ["admin@quotemaster.com"]
    }
  },
  {
    id: "int-twilio",
    name: "Twilio WhatsApp",
    type: "whatsapp",
    provider: "Twilio",
    description: "Envio de mensagens via WhatsApp Business API",
    status: "configuring",
    config: {
      accountId: "AC***************",
      apiKey: "SK***************",
      secretKey: "***************",
      baseUrl: "https://api.twilio.com/2010-04-01",
      webhookUrl: "https://app.quotemaster.com/webhooks/twilio"
    },
    endpoints: [
      {
        id: "ep-3",
        name: "Send Message",
        url: "/Accounts/{AccountSid}/Messages.json",
        method: "POST",
        headers: { "Authorization": "Basic {encoded_credentials}", "Content-Type": "application/x-www-form-urlencoded" },
        description: "Enviar mensagem WhatsApp",
        status: "untested"
      },
      {
        id: "ep-4",
        name: "Get Message Status",
        url: "/Accounts/{AccountSid}/Messages/{MessageSid}.json",
        method: "GET",
        headers: { "Authorization": "Basic {encoded_credentials}" },
        description: "Verificar status da mensagem",
        status: "untested"
      }
    ],
    features: ["Text Messages", "Media Messages", "Templates", "Delivery Status"],
    limits: {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      currentUsage: 0
    },
    healthCheck: {
      lastCheck: "2024-03-15T08:00:00Z",
      status: "degraded",
      uptime: 95.2,
      avgResponseTime: 890
    },
    logs: [],
    metadata: {
      version: "2010-04-01",
      documentation: "https://www.twilio.com/docs",
      supportEmail: "support@twilio.com",
      createdAt: "2024-03-10",
      updatedAt: "2024-03-15"
    },
    notifications: {
      onError: true,
      onLimitReached: false,
      onStatusChange: true,
      recipients: ["admin@quotemaster.com"]
    }
  },
  {
    id: "int-stripe",
    name: "Stripe",
    type: "payment",
    provider: "Stripe",
    description: "Processamento de pagamentos e assinaturas",
    status: "active",
    config: {
      apiKey: "pk_***************",
      secretKey: "sk_***************",
      webhookUrl: "https://app.quotemaster.com/webhooks/stripe",
      baseUrl: "https://api.stripe.com/v1"
    },
    endpoints: [
      {
        id: "ep-5",
        name: "Create Payment Intent",
        url: "/payment_intents",
        method: "POST",
        headers: { "Authorization": "Bearer {secretKey}", "Content-Type": "application/x-www-form-urlencoded" },
        description: "Criar intenção de pagamento",
        lastTested: "2024-03-15T11:45:00Z",
        status: "working",
        responseTime: 189
      },
      {
        id: "ep-6",
        name: "Create Subscription",
        url: "/subscriptions",
        method: "POST",
        headers: { "Authorization": "Bearer {secretKey}", "Content-Type": "application/x-www-form-urlencoded" },
        description: "Criar assinatura",
        lastTested: "2024-03-15T11:30:00Z",
        status: "working",
        responseTime: 234
      }
    ],
    features: ["Payment Processing", "Subscriptions", "Invoicing", "Webhooks", "Connect"],
    limits: {
      requestsPerMinute: 100,
      requestsPerDay: 100000,
      currentUsage: 8947
    },
    healthCheck: {
      lastCheck: "2024-03-15T11:45:00Z",
      status: "healthy",
      uptime: 99.95,
      avgResponseTime: 212
    },
    logs: generateMockLogs("int-stripe", 8),
    metadata: {
      version: "2022-11-15",
      documentation: "https://stripe.com/docs",
      supportEmail: "support@stripe.com",
      createdAt: "2024-01-01",
      updatedAt: "2024-03-15",
      lastUsed: "2024-03-15T11:40:00Z"
    },
    notifications: {
      onError: true,
      onLimitReached: true,
      onStatusChange: true,
      recipients: ["admin@quotemaster.com", "finance@quotemaster.com"]
    }
  },
  {
    id: "int-zapier",
    name: "Zapier",
    type: "other",
    provider: "Zapier",
    description: "Automação e integração com milhares de aplicativos",
    status: "inactive",
    config: {
      webhookUrl: "https://hooks.zapier.com/hooks/catch/xxx/xxx/"
    },
    endpoints: [
      {
        id: "ep-7",
        name: "Trigger Zap",
        url: "",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        description: "Disparar automação Zapier",
        status: "untested"
      }
    ],
    features: ["Workflow Automation", "Multi-App Integration", "Conditional Logic"],
    limits: {
      requestsPerMinute: 100,
      requestsPerDay: 1000,
      currentUsage: 0
    },
    healthCheck: {
      lastCheck: "2024-03-10T15:00:00Z",
      status: "down",
      uptime: 0,
      avgResponseTime: 0
    },
    logs: [],
    metadata: {
      version: "v1",
      documentation: "https://zapier.com/help",
      supportEmail: "contact@zapier.com",
      createdAt: "2024-02-01",
      updatedAt: "2024-03-10"
    },
    notifications: {
      onError: false,
      onLimitReached: false,
      onStatusChange: false,
      recipients: []
    }
  }
];

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || integration.type === filterType;
    const matchesStatus = filterStatus === "all" || integration.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const createIntegration = (integrationData: Omit<Integration, "id" | "logs" | "metadata">) => {
    const newIntegration: Integration = {
      ...integrationData,
      id: `int-${Date.now()}`,
      logs: [],
      metadata: {
        version: "v1",
        documentation: "",
        supportEmail: "",
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      }
    };
    
    setIntegrations(prev => [...prev, newIntegration]);
    return newIntegration;
  };

  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id ? { 
        ...integration, 
        ...updates,
        metadata: {
          ...integration.metadata,
          updatedAt: new Date().toISOString().split('T')[0]
        }
      } : integration
    ));
  };

  const deleteIntegration = (id: string) => {
    setIntegrations(prev => prev.filter(integration => integration.id !== id));
  };

  const testIntegration = async (id: string, endpointId?: string): Promise<boolean> => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return false;

    // Simulate API test
    const success = Math.random() > 0.2; // 80% success rate
    const responseTime = Math.floor(Math.random() * 1000) + 100;
    
    const logEntry: IntegrationLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      integrationId: id,
      action: "test_connection",
      status: success ? "success" : "error",
      message: success ? "Connection test successful" : "Connection test failed",
      responseTime,
      endpoint: endpointId
    };

    // Update integration
    updateIntegration(id, {
      logs: [logEntry, ...integration.logs.slice(0, 9)], // Keep last 10 logs
      healthCheck: {
        ...integration.healthCheck,
        lastCheck: new Date().toISOString(),
        status: success ? "healthy" : "degraded",
        avgResponseTime: (integration.healthCheck.avgResponseTime + responseTime) / 2
      }
    });

    return success;
  };

  const addLog = (integrationId: string, log: Omit<IntegrationLog, "id" | "timestamp">) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    const logEntry: IntegrationLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    updateIntegration(integrationId, {
      logs: [logEntry, ...integration.logs.slice(0, 9)],
      metadata: {
        ...integration.metadata,
        lastUsed: new Date().toISOString()
      }
    });
  };

  const getIntegrationStats = () => {
    const totalRequests = integrations.reduce((sum, int) => sum + int.limits.currentUsage, 0);
    const healthyCount = integrations.filter(i => i.healthCheck.status === "healthy").length;
    const activeCount = integrations.filter(i => i.status === "active").length;
    
    return {
      total: integrations.length,
      active: activeCount,
      healthy: healthyCount,
      totalRequests,
      avgUptime: integrations.reduce((sum, int) => sum + int.healthCheck.uptime, 0) / integrations.length,
      avgResponseTime: integrations.reduce((sum, int) => sum + int.healthCheck.avgResponseTime, 0) / integrations.length,
      byType: {
        email: integrations.filter(i => i.type === "email").length,
        whatsapp: integrations.filter(i => i.type === "whatsapp").length,
        payment: integrations.filter(i => i.type === "payment").length,
        other: integrations.filter(i => !["email", "whatsapp", "payment"].includes(i.type)).length
      },
      recentErrors: integrations
        .flatMap(i => i.logs)
        .filter(log => log.status === "error")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
    };
  };

  return {
    integrations: filteredIntegrations,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    testIntegration,
    addLog,
    stats: getIntegrationStats()
  };
}