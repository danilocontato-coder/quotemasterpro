import { useState, useCallback } from "react";

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  userCount: number;
  createdAt: string;
  isSystem?: boolean; // Grupos do sistema não podem ser editados/excluídos
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "collaborator" | "supplier";
  status: "active" | "inactive";
  avatar?: string;
  lastAccess: string;
  createdAt: string;
  client?: string;
  supplier?: string;
  groupIds: string[]; // IDs dos grupos aos quais o usuário pertence
  temporaryPassword?: string;
  mustChangePassword?: boolean;
  loginCredentials?: {
    username: string;
    password: string;
    lastPasswordChange: string;
  };
}

// Grupos padrão do sistema
const systemGroups: UserGroup[] = [
  {
    id: "group-admins",
    name: "Administradores",
    description: "Acesso total ao sistema - podem gerenciar usuários, configurações e todos os módulos",
    permissions: ["*"], // Wildcard para todas as permissões
    color: "#dc2626", // red-600
    userCount: 2,
    createdAt: "2024-01-01",
    isSystem: true
  },
  {
    id: "group-managers", 
    name: "Gestores",
    description: "Podem aprovar cotações, gerenciar fornecedores e visualizar relatórios de sua unidade",
    permissions: ["quotes.approve", "suppliers.manage", "reports.view", "payments.view"],
    color: "#2563eb", // blue-600
    userCount: 5,
    createdAt: "2024-01-01",
    isSystem: true
  },
  {
    id: "group-collaborators",
    name: "Colaboradores", 
    description: "Podem criar e editar cotações, consultar fornecedores de sua unidade",
    permissions: ["quotes.create", "quotes.edit", "suppliers.view", "products.view"],
    color: "#16a34a", // green-600
    userCount: 12,
    createdAt: "2024-01-01",
    isSystem: true
  },
  {
    id: "group-suppliers",
    name: "Fornecedores",
    description: "Podem responder cotações, gerenciar produtos e consultar histórico de propostas",
    permissions: ["quotes.respond", "products.manage", "proposals.view", "profile.edit"],
    color: "#ea580c", // orange-600
    userCount: 23,
    createdAt: "2024-01-01",
    isSystem: true
  }
];

// Grupos customizados de exemplo
const customGroups: UserGroup[] = [
  {
    id: "group-finance",
    name: "Financeiro",
    description: "Equipe responsável pela aprovação de pagamentos e controle orçamentário",
    permissions: ["payments.approve", "budget.manage", "reports.financial", "quotes.view"],
    color: "#7c3aed", // violet-600
    userCount: 3,
    createdAt: "2024-02-15"
  },
  {
    id: "group-purchasing",
    name: "Compras",
    description: "Equipe especializada em cotações e negociação com fornecedores",
    permissions: ["quotes.create", "quotes.edit", "suppliers.negotiate", "products.research"],
    color: "#0891b2", // cyan-600
    userCount: 4,
    createdAt: "2024-03-01"
  }
];

const mockUsers: User[] = [
  {
    id: "user-1",
    name: "João Silva",
    email: "joao.silva@empresa.com",
    phone: "+55 11 99999-0000",
    role: "manager",
    status: "active",
    lastAccess: "Hoje às 14:30",
    createdAt: "2024-01-15",
    client: "Condomínio Azul",
    groupIds: ["group-managers", "group-finance"],
    loginCredentials: {
      username: "joao.silva",
      password: "temp123",
      lastPasswordChange: "2024-01-15"
    },
    mustChangePassword: false
  },
  {
    id: "user-2", 
    name: "Maria Santos",
    email: "maria.santos@empresa.com",
    phone: "+55 11 98888-0000",
    role: "collaborator",
    status: "active",
    lastAccess: "Ontem às 16:45",
    createdAt: "2024-02-10",
    client: "Condomínio Azul",
    groupIds: ["group-collaborators", "group-purchasing"],
    loginCredentials: {
      username: "maria.santos",
      password: "temp456",
      lastPasswordChange: "2024-02-10"
    },
    mustChangePassword: true
  },
  {
    id: "user-3",
    name: "Carlos Oliveira", 
    email: "carlos@fornecedor.com",
    phone: "+55 11 97777-0000",
    role: "supplier",
    status: "active",
    lastAccess: "2 dias atrás",
    createdAt: "2024-01-20",
    supplier: "Fornecedor Alpha",
    groupIds: ["group-suppliers"],
    loginCredentials: {
      username: "carlos.oliveira",
      password: "sup789",
      lastPasswordChange: "2024-01-20"
    },
    mustChangePassword: false
  },
  {
    id: "user-4",
    name: "Ana Costa",
    email: "ana.costa@admin.com",
    phone: "+55 11 96666-0000", 
    role: "admin",
    status: "active",
    lastAccess: "Hoje às 09:15",
    createdAt: "2024-01-01",
    groupIds: ["group-admins"],
    loginCredentials: {
      username: "ana.costa",
      password: "admin2024",
      lastPasswordChange: "2024-01-01"
    },
    mustChangePassword: false
  },
  {
    id: "user-5",
    name: "Pedro Lima",
    email: "pedro.lima@empresa.com",
    role: "collaborator", 
    status: "inactive",
    lastAccess: "1 semana atrás",
    createdAt: "2024-03-05",
    client: "Condomínio Verde",
    groupIds: ["group-collaborators"],
    temporaryPassword: "TEMP1234",
    mustChangePassword: true
  }
];

export function useUsers() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");

  const createUser = (userData: Omit<User, "id" | "createdAt" | "lastAccess">) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastAccess: "Nunca"
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, ...userData } : user
    ));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
  };

  const generateTemporaryPassword = () => {
    return Math.random().toString(36).slice(-8).toUpperCase();
  };

  const generateUsername = (name: string, email: string) => {
    // Gerar username baseado no nome ou email
    const nameSlug = name.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '.')
      .substring(0, 20);
    
    if (nameSlug.length > 0) {
      return nameSlug;
    }
    
    return email.split('@')[0];
  };

  const resetPassword = (userId: string) => {
    const newPassword = generateTemporaryPassword();
    updateUser(userId, {
      temporaryPassword: newPassword,
      mustChangePassword: true,
      loginCredentials: {
        username: users.find(u => u.id === userId)?.loginCredentials?.username || '',
        password: newPassword,
        lastPasswordChange: new Date().toISOString()
      }
    });
    return newPassword;
  };

  const toggleUserStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      updateUser(userId, {
        status: user.status === 'active' ? 'inactive' : 'active'
      });
    }
  };

  const addUserToGroup = (userId: string, groupId: string) => {
    const user = users.find(u => u.id === userId);
    if (user && !user.groupIds.includes(groupId)) {
      updateUser(userId, {
        groupIds: [...user.groupIds, groupId]
      });
    }
  };

  const removeUserFromGroup = (userId: string, groupId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      updateUser(userId, {
        groupIds: user.groupIds.filter(id => id !== groupId)
      });
    }
  };

  return {
    users,
    searchTerm,
    setSearchTerm,
    createUser,
    updateUser,
    deleteUser,
    generateTemporaryPassword,
    generateUsername,
    resetPassword,
    toggleUserStatus,
    addUserToGroup,
    removeUserFromGroup
  };
}

export function useUserGroups() {
  const [groups, setGroups] = useState<UserGroup[]>([...systemGroups, ...customGroups]);

  const createGroup = (groupData: Omit<UserGroup, "id" | "createdAt" | "userCount">) => {
    const newGroup: UserGroup = {
      ...groupData,
      id: `group-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      userCount: 0
    };
    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = (id: string, groupData: Partial<UserGroup>) => {
    setGroups(prev => prev.map(group => 
      group.id === id && !group.isSystem ? { ...group, ...groupData } : group
    ));
  };

  const deleteGroup = (id: string) => {
    const group = groups.find(g => g.id === id);
    if (group && !group.isSystem) {
      setGroups(prev => prev.filter(group => group.id !== id));
    }
  };

  const getGroupsByIds = (groupIds: string[]) => {
    return groups.filter(group => groupIds.includes(group.id));
  };

  const getSystemGroups = () => {
    return groups.filter(group => group.isSystem);
  };

  const getCustomGroups = () => {
    return groups.filter(group => !group.isSystem);
  };

  // Função para atualizar contagem de usuários nos grupos
  const updateGroupUserCounts = useCallback((users: User[]) => {
    if (!users || users.length === 0) return;
    
    setGroups(prev => prev.map(group => ({
      ...group,
      userCount: users.filter(user => user.groupIds?.includes(group.id)).length
    })));
  }, []);

  return {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupsByIds,
    getSystemGroups,
    getCustomGroups,
    updateGroupUserCounts
  };
}