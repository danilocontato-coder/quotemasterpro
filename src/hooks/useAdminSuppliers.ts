import { useState } from "react";

export interface SupplierGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  supplierCount: number;
  createdAt: string;
}

export interface SupplierContact {
  name: string;
  email: string;
  phone: string;
  position: string;
  isPrimary: boolean;
}

export interface SupplierDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface SupplierRating {
  id: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
  quoteId?: string;
}

export interface AdminSupplier {
  id: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  website?: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contacts: SupplierContact[];
  groupId?: string;
  groupName?: string;
  status: "active" | "inactive" | "pending" | "suspended";
  plan: string;
  createdAt: string;
  lastAccess?: string;
  loginCredentials: {
    username: string;
    password?: string;
    temporaryPassword: boolean;
    lastPasswordChange?: string;
  };
  documents: SupplierDocument[];
  businessInfo: {
    categories: string[];
    specialties: string[];
    servicesOffered: string[];
    coverage: string[]; // Areas of service coverage
    businessHours: string;
    languages: string[];
  };
  financialInfo: {
    revenue: number;
    quotesReceived: number;
    quotesAccepted: number;
    avgResponseTime: number; // in hours
    completionRate: number; // percentage
  };
  ratings: SupplierRating[];
  avgRating: number;
  notes?: string;
  certifications: string[];
  insurance?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
    coverage: number;
  };
}

const mockSupplierGroups: SupplierGroup[] = [
  {
    id: "group-1",
    name: "Materiais de Construção",
    description: "Fornecedores de materiais de construção e acabamento",
    color: "orange",
    supplierCount: 15,
    createdAt: "2024-01-15"
  },
  {
    id: "group-2", 
    name: "Serviços de Limpeza",
    description: "Empresas especializadas em limpeza e conservação",
    color: "blue",
    supplierCount: 8,
    createdAt: "2024-01-20"
  },
  {
    id: "group-3",
    name: "Manutenção Predial",
    description: "Serviços de manutenção e reparos prediais",
    color: "green",
    supplierCount: 12,
    createdAt: "2024-02-01"
  },
  {
    id: "group-4",
    name: "Segurança",
    description: "Empresas de segurança e monitoramento",
    color: "red",
    supplierCount: 6,
    createdAt: "2024-02-05"
  }
];

const mockSuppliers: AdminSupplier[] = [
  {
    id: "supplier-1",
    companyName: "TechFlow Solutions Ltda",
    cnpj: "98.765.432/0001-10",
    email: "comercial@techflow.com",
    phone: "+55 11 99888-7777",
    website: "https://techflow.com.br",
    address: {
      street: "Av. Paulista",
      number: "1500",
      complement: "Sala 1205",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100"
    },
    contacts: [
      {
        name: "Pedro Santos",
        email: "pedro@techflow.com",
        phone: "+55 11 99888-7777",
        position: "Diretor Comercial",
        isPrimary: true
      },
      {
        name: "Ana Costa",
        email: "ana@techflow.com", 
        phone: "+55 11 99888-7778",
        position: "Gerente de Projetos",
        isPrimary: false
      }
    ],
    groupId: "group-1",
    groupName: "Materiais de Construção",
    status: "active",
    plan: "Pro",
    createdAt: "2024-01-20",
    lastAccess: "Hoje às 16:30",
    loginCredentials: {
      username: "techflow",
      temporaryPassword: false,
      lastPasswordChange: "2024-01-20"
    },
    documents: [
      {
        id: "doc-1",
        name: "Alvará de Funcionamento.pdf",
        type: "application/pdf",
        size: 1024000,
        uploadedAt: "2024-01-20",
        url: "#"
      },
      {
        id: "doc-2",
        name: "Certificado ISO 9001.pdf",
        type: "application/pdf", 
        size: 2048000,
        uploadedAt: "2024-01-20",
        url: "#"
      }
    ],
    businessInfo: {
      categories: ["Materiais de Construção", "Ferramentas"],
      specialties: ["Materiais hidráulicos", "Ferragens", "Tintas"],
      servicesOffered: ["Entrega expressa", "Consultoria técnica", "Projeto customizado"],
      coverage: ["São Paulo", "ABC", "Guarulhos"],
      businessHours: "Segunda a Sexta: 8h às 18h | Sábado: 8h às 12h",
      languages: ["Português", "Inglês", "Espanhol"]
    },
    financialInfo: {
      revenue: 125000.00,
      quotesReceived: 89,
      quotesAccepted: 67,
      avgResponseTime: 4.2,
      completionRate: 95.5
    },
    ratings: [
      {
        id: "rating-1",
        clientId: "client-1",
        clientName: "Condomínio Vista Verde",
        rating: 5,
        comment: "Excelente qualidade dos materiais e entrega pontual.",
        date: "2024-03-10",
        quoteId: "quote-123"
      },
      {
        id: "rating-2",
        clientId: "client-2",
        clientName: "Edifício Central Plaza",
        rating: 4,
        comment: "Bom atendimento, mas poderia melhorar o prazo de entrega.",
        date: "2024-03-05"
      }
    ],
    avgRating: 4.8,
    notes: "Fornecedor premium com histórico excelente. Prioridade para projetos grandes.",
    certifications: ["ISO 9001", "PBQP-H", "INMETRO"],
    insurance: {
      provider: "Seguradora ABC",
      policyNumber: "POL-123456789",
      expiryDate: "2024-12-31",
      coverage: 1000000
    }
  },
  {
    id: "supplier-2",
    companyName: "CleanMaster Serviços",
    cnpj: "12.345.678/0001-90",
    email: "contato@cleanmaster.com",
    phone: "+55 11 97777-6666",
    address: {
      street: "Rua das Flores",
      number: "850",
      complement: "",
      neighborhood: "Vila Madalena",
      city: "São Paulo",
      state: "SP",
      zipCode: "05435-000"
    },
    contacts: [
      {
        name: "Maria Silva",
        email: "maria@cleanmaster.com",
        phone: "+55 11 97777-6666",
        position: "Diretora",
        isPrimary: true
      }
    ],
    groupId: "group-2",
    groupName: "Serviços de Limpeza",
    status: "active",
    plan: "Basic",
    createdAt: "2024-02-15",
    lastAccess: "Ontem às 14:20",
    loginCredentials: {
      username: "cleanmaster",
      temporaryPassword: true,
      lastPasswordChange: "2024-02-15"
    },
    documents: [],
    businessInfo: {
      categories: ["Limpeza", "Conservação"],
      specialties: ["Limpeza pós-obra", "Limpeza hospitalar", "Impermeabilização"],
      servicesOffered: ["Limpeza regular", "Limpeza pesada", "Desinfecção"],
      coverage: ["São Paulo", "Zona Sul", "Zona Oeste"],
      businessHours: "24 horas por dia, 7 dias por semana",
      languages: ["Português"]
    },
    financialInfo: {
      revenue: 45000.00,
      quotesReceived: 34,
      quotesAccepted: 28,
      avgResponseTime: 2.8,
      completionRate: 88.2
    },
    ratings: [
      {
        id: "rating-3",
        clientId: "client-3",
        clientName: "Condomínio Jardim",
        rating: 4,
        comment: "Serviço satisfatório, equipe educada.",
        date: "2024-03-08"
      }
    ],
    avgRating: 4.2,
    notes: "Empresa em crescimento, bom potencial.",
    certifications: ["Vigilância Sanitária"]
  }
];

export function useAdminSuppliers() {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>(mockSuppliers);
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>(mockSupplierGroups);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.cnpj.includes(searchTerm) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.businessInfo.categories.some(cat => 
                           cat.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesGroup = filterGroup === "all" || supplier.groupId === filterGroup;
    const matchesStatus = filterStatus === "all" || supplier.status === filterStatus;
    
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const createSupplier = (supplierData: Omit<AdminSupplier, "id" | "createdAt" | "financialInfo" | "ratings" | "avgRating">) => {
    const newSupplier: AdminSupplier = {
      ...supplierData,
      id: `supplier-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      financialInfo: {
        revenue: 0,
        quotesReceived: 0,
        quotesAccepted: 0,
        avgResponseTime: 0,
        completionRate: 0
      },
      ratings: [],
      avgRating: 0
    };
    
    setSuppliers(prev => [...prev, newSupplier]);
    return newSupplier;
  };

  const updateSupplier = (id: string, supplierData: Partial<AdminSupplier>) => {
    setSuppliers(prev => prev.map(supplier => 
      supplier.id === id ? { ...supplier, ...supplierData } : supplier
    ));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
  };

  const createGroup = (groupData: Omit<SupplierGroup, "id" | "createdAt" | "supplierCount">) => {
    const newGroup: SupplierGroup = {
      ...groupData,
      id: `group-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      supplierCount: 0
    };
    
    setSupplierGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = (id: string, groupData: Partial<SupplierGroup>) => {
    setSupplierGroups(prev => prev.map(group => 
      group.id === id ? { ...group, ...groupData } : group
    ));
  };

  const deleteGroup = (id: string) => {
    setSupplierGroups(prev => prev.filter(group => group.id !== id));
    // Remove group association from suppliers
    setSuppliers(prev => prev.map(supplier => 
      supplier.groupId === id ? { ...supplier, groupId: undefined, groupName: undefined } : supplier
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

  const getSupplierStats = () => {
    return {
      total: suppliers.length,
      active: suppliers.filter(s => s.status === "active").length,
      inactive: suppliers.filter(s => s.status === "inactive").length,
      pending: suppliers.filter(s => s.status === "pending").length,
      suspended: suppliers.filter(s => s.status === "suspended").length,
      totalRevenue: suppliers.reduce((sum, supplier) => sum + supplier.financialInfo.revenue, 0),
      avgRating: suppliers.reduce((sum, supplier) => sum + supplier.avgRating, 0) / suppliers.length,
      avgResponseTime: suppliers.reduce((sum, supplier) => sum + supplier.financialInfo.avgResponseTime, 0) / suppliers.length,
      byGroup: supplierGroups.map(group => ({
        name: group.name,
        count: suppliers.filter(s => s.groupId === group.id).length,
        color: group.color
      })),
      topRated: suppliers
        .filter(s => s.avgRating > 0)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 5)
    };
  };

  return {
    suppliers: filteredSuppliers,
    supplierGroups,
    searchTerm,
    setSearchTerm,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    createGroup,
    updateGroup,
    deleteGroup,
    generateTemporaryPassword,
    generateUsername,
    stats: getSupplierStats()
  };
}