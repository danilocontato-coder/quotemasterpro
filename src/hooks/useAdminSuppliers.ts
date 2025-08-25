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

export function useAdminSuppliers() {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([]);
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