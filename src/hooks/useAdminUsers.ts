import { useState } from "react";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "manager" | "collaborator" | "supplier" | "support";
  status: "active" | "inactive" | "pending" | "suspended";
  avatar?: string;
  lastAccess: string;
  createdAt: string;
  permissions: string[];
  clientId?: string;
  supplierId?: string;
  phone?: string;
  department?: string;
  loginCount: number;
  lastLoginIp?: string;
}

const mockAdminUsers: AdminUser[] = [
  {
    id: "admin-1",
    name: "Carlos SuperAdmin",
    email: "carlos@quotemaster.com",
    role: "superadmin",
    status: "active",
    lastAccess: "Hoje às 15:30",
    createdAt: "2024-01-01",
    permissions: ["ALL"],
    department: "TI",
    loginCount: 1247,
    lastLoginIp: "192.168.1.100"
  },
  {
    id: "admin-2",
    name: "Ana Admin",
    email: "ana@quotemaster.com",
    role: "admin",
    status: "active",
    lastAccess: "Hoje às 14:15",
    createdAt: "2024-01-15",
    permissions: ["USER_MANAGEMENT", "SYSTEM_CONFIG", "REPORTS"],
    department: "Administração",
    loginCount: 892,
    lastLoginIp: "192.168.1.101"
  },
  {
    id: "mgr-1",
    name: "João Manager",
    email: "joao@vistaverde.com.br",
    role: "manager",
    status: "active",
    lastAccess: "Hoje às 13:45",
    createdAt: "2024-02-01",
    permissions: ["QUOTES_MANAGE", "SUPPLIERS_MANAGE", "APPROVALS"],
    clientId: "client-1",
    phone: "+55 11 99999-0001",
    loginCount: 543,
    lastLoginIp: "192.168.1.50"
  },
  {
    id: "col-1",
    name: "Maria Colaboradora",
    email: "maria@vistaverde.com.br",
    role: "collaborator",
    status: "active",
    lastAccess: "Hoje às 12:30",
    createdAt: "2024-02-15",
    permissions: ["QUOTES_CREATE", "QUOTES_EDIT"],
    clientId: "client-1",
    phone: "+55 11 99999-0002",
    loginCount: 234,
    lastLoginIp: "192.168.1.51"
  },
  {
    id: "sup-1",
    name: "Pedro Fornecedor",
    email: "pedro@techflow.com",
    role: "supplier",
    status: "active",
    lastAccess: "Ontem às 18:20",
    createdAt: "2024-02-20",
    permissions: ["QUOTES_RESPOND", "PRODUCTS_MANAGE"],
    supplierId: "supplier-1",
    phone: "+55 11 99999-0003",
    loginCount: 167,
    lastLoginIp: "192.168.1.200"
  },
  {
    id: "sup-2",
    name: "Luisa Suporte",
    email: "luisa@quotemaster.com",
    role: "support",
    status: "active",
    lastAccess: "2 horas atrás",
    createdAt: "2024-01-30",
    permissions: ["TICKETS_MANAGE", "USERS_SUPPORT"],
    department: "Suporte",
    phone: "+55 11 99999-0004",
    loginCount: 445,
    lastLoginIp: "192.168.1.102"
  },
  {
    id: "mgr-2",
    name: "Roberto Inativo",
    email: "roberto@empresa.com",
    role: "manager",
    status: "inactive",
    lastAccess: "1 semana atrás",
    createdAt: "2024-01-10",
    permissions: ["QUOTES_MANAGE"],
    clientId: "client-2",
    phone: "+55 11 99999-0005",
    loginCount: 89,
    lastLoginIp: "192.168.1.52"
  }
];

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const createUser = (userData: Omit<AdminUser, "id" | "createdAt" | "lastAccess" | "loginCount">) => {
    const newUser: AdminUser = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastAccess: "Nunca",
      loginCount: 0
    };
    
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, userData: Partial<AdminUser>) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, ...userData } : user
    ));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
  };

  const suspendUser = (id: string) => {
    updateUser(id, { status: "suspended" });
  };

  const activateUser = (id: string) => {
    updateUser(id, { status: "active" });
  };

  const resetPassword = (id: string) => {
    // Em produção, enviaria email de reset
    return Math.random().toString(36).slice(-8).toUpperCase();
  };

  const getUserStats = () => {
    return {
      total: users.length,
      active: users.filter(u => u.status === "active").length,
      inactive: users.filter(u => u.status === "inactive").length,
      pending: users.filter(u => u.status === "pending").length,
      suspended: users.filter(u => u.status === "suspended").length,
      byRole: {
        superadmin: users.filter(u => u.role === "superadmin").length,
        admin: users.filter(u => u.role === "admin").length,
        manager: users.filter(u => u.role === "manager").length,
        collaborator: users.filter(u => u.role === "collaborator").length,
        supplier: users.filter(u => u.role === "supplier").length,
        support: users.filter(u => u.role === "support").length,
      }
    };
  };

  return {
    users: filteredUsers,
    searchTerm,
    setSearchTerm,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    createUser,
    updateUser,
    deleteUser,
    suspendUser,
    activateUser,
    resetPassword,
    stats: getUserStats()
  };
}