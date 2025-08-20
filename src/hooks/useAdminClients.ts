import { useState } from "react";

export interface ClientGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  clientCount: number;
  createdAt: string;
}

export interface ClientContact {
  name: string;
  email: string;
  phone: string;
  position: string;
  isPrimary: boolean;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface AdminClient {
  id: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contacts: ClientContact[];
  groupId?: string;
  groupName?: string;
  status: "active" | "inactive" | "pending";
  plan: string;
  createdAt: string;
  lastAccess?: string;
  loginCredentials: {
    username: string;
    password?: string;
    temporaryPassword: boolean;
    lastPasswordChange?: string;
  };
  documents: ClientDocument[];
  revenue: number;
  quotesCount: number;
  notes?: string;
}

const mockClientGroups: ClientGroup[] = [
  {
    id: "group-1",
    name: "Condomínios Residenciais",
    description: "Condomínios residenciais de médio e alto padrão",
    color: "blue",
    clientCount: 23,
    createdAt: "2024-01-15"
  },
  {
    id: "group-2", 
    name: "Condomínios Comerciais",
    description: "Edifícios comerciais e empresariais",
    color: "green",
    clientCount: 12,
    createdAt: "2024-01-20"
  },
  {
    id: "group-3",
    name: "Empresas Privadas",
    description: "Empresas privadas de diversos segmentos",
    color: "purple",
    clientCount: 8,
    createdAt: "2024-02-01"
  }
];

const mockClients: AdminClient[] = [
  {
    id: "client-1",
    companyName: "Condomínio Residencial Vista Verde",
    cnpj: "12.345.678/0001-90",
    email: "admin@vistaverde.com.br",
    phone: "+55 11 99999-0001",
    address: {
      street: "Av. das Palmeiras",
      number: "1000",
      complement: "Ed. Principal",
      neighborhood: "Jardim Botânico",
      city: "São Paulo",
      state: "SP",
      zipCode: "01234-567"
    },
    contacts: [
      {
        name: "João Silva",
        email: "joao@vistaverde.com.br",
        phone: "+55 11 99999-0001",
        position: "Síndico",
        isPrimary: true
      },
      {
        name: "Maria Santos",
        email: "maria@vistaverde.com.br", 
        phone: "+55 11 99999-0002",
        position: "Administradora",
        isPrimary: false
      }
    ],
    groupId: "group-1",
    groupName: "Condomínios Residenciais",
    status: "active",
    plan: "Premium",
    createdAt: "2024-01-15",
    lastAccess: "Hoje às 14:30",
    loginCredentials: {
      username: "vistaverde",
      temporaryPassword: false,
      lastPasswordChange: "2024-01-15"
    },
    documents: [
      {
        id: "doc-1",
        name: "Contrato Social.pdf",
        type: "application/pdf",
        size: 2048576,
        uploadedAt: "2024-01-15",
        url: "#"
      },
      {
        id: "doc-2",
        name: "CNPJ.pdf",
        type: "application/pdf", 
        size: 512000,
        uploadedAt: "2024-01-15",
        url: "#"
      }
    ],
    revenue: 15750.00,
    quotesCount: 45,
    notes: "Cliente premium com histórico excelente de pagamentos"
  },
  {
    id: "client-2",
    companyName: "Edifício Comercial Central Plaza",
    cnpj: "98.765.432/0001-10",
    email: "admin@centralplaza.com.br",
    phone: "+55 11 98888-0001",
    address: {
      street: "Rua Augusta",
      number: "2500",
      neighborhood: "Consolação",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100"
    },
    contacts: [
      {
        name: "Carlos Oliveira",
        email: "carlos@centralplaza.com.br",
        phone: "+55 11 98888-0001",
        position: "Administrador",
        isPrimary: true
      }
    ],
    groupId: "group-2",
    groupName: "Condomínios Comerciais",
    status: "active",
    plan: "Pro",
    createdAt: "2024-02-10",
    lastAccess: "Ontem às 16:20",
    loginCredentials: {
      username: "centralplaza",
      temporaryPassword: true,
      lastPasswordChange: "2024-02-10"
    },
    documents: [],
    revenue: 8900.00,
    quotesCount: 28,
    notes: "Novo cliente com potencial de crescimento"
  }
];

export function useAdminClients() {
  const [clients, setClients] = useState<AdminClient[]>(mockClients);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>(mockClientGroups);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.cnpj.includes(searchTerm) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = filterGroup === "all" || client.groupId === filterGroup;
    const matchesStatus = filterStatus === "all" || client.status === filterStatus;
    
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const createClient = (clientData: Omit<AdminClient, "id" | "createdAt" | "revenue" | "quotesCount">) => {
    const newClient: AdminClient = {
      ...clientData,
      id: `client-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      revenue: 0,
      quotesCount: 0
    };
    
    setClients(prev => [...prev, newClient]);
    return newClient;
  };

  const updateClient = (id: string, clientData: Partial<AdminClient>) => {
    setClients(prev => prev.map(client => 
      client.id === id ? { ...client, ...clientData } : client
    ));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(client => client.id !== id));
  };

  const createGroup = (groupData: Omit<ClientGroup, "id" | "createdAt" | "clientCount">) => {
    const newGroup: ClientGroup = {
      ...groupData,
      id: `group-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      clientCount: 0
    };
    
    setClientGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = (id: string, groupData: Partial<ClientGroup>) => {
    setClientGroups(prev => prev.map(group => 
      group.id === id ? { ...group, ...groupData } : group
    ));
  };

  const deleteGroup = (id: string) => {
    setClientGroups(prev => prev.filter(group => group.id !== id));
    // Remove group association from clients
    setClients(prev => prev.map(client => 
      client.groupId === id ? { ...client, groupId: undefined, groupName: undefined } : client
    ));
  };

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateUsername = (companyName: string) => {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15) + Math.floor(Math.random() * 100);
  };

  const getClientStats = () => {
    return {
      total: clients.length,
      active: clients.filter(c => c.status === "active").length,
      inactive: clients.filter(c => c.status === "inactive").length,
      pending: clients.filter(c => c.status === "pending").length,
      totalRevenue: clients.reduce((sum, client) => sum + client.revenue, 0),
      avgQuotes: Math.round(clients.reduce((sum, client) => sum + client.quotesCount, 0) / clients.length),
      byGroup: clientGroups.map(group => ({
        name: group.name,
        count: clients.filter(c => c.groupId === group.id).length,
        color: group.color
      }))
    };
  };

  return {
    clients: filteredClients,
    clientGroups,
    searchTerm,
    setSearchTerm,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    createClient,
    updateClient,
    deleteClient,
    createGroup,
    updateGroup,
    deleteGroup,
    generateTemporaryPassword,
    generateUsername,
    stats: getClientStats()
  };
}