import { useState } from "react";

export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Permissions {
  [roleId: string]: {
    [module: string]: Permission;
  };
}

const mockRoles: Role[] = [
  {
    id: "admin",
    name: "Administrador",
    description: "Acesso completo ao sistema",
    userCount: 2
  },
  {
    id: "manager", 
    name: "Gerente",
    description: "Gerenciamento de cotações e aprovações",
    userCount: 5
  },
  {
    id: "collaborator",
    name: "Colaborador",
    description: "Criação e edição de cotações",
    userCount: 8
  },
  {
    id: "supplier",
    name: "Fornecedor", 
    description: "Resposta a cotações e gestão de produtos",
    userCount: 15
  }
];

const defaultPermissions: Permissions = {
  admin: {
    quotes: { view: true, create: true, edit: true, delete: true },
    items: { view: true, create: true, edit: true, delete: true },
    suppliers: { view: true, create: true, edit: true, delete: true },
    approvals: { view: true, create: true, edit: true, delete: true },
    payments: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true }
  },
  manager: {
    quotes: { view: true, create: true, edit: true, delete: false },
    items: { view: true, create: true, edit: true, delete: false },
    suppliers: { view: true, create: true, edit: true, delete: false },
    approvals: { view: true, create: false, edit: true, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    users: { view: true, create: true, edit: true, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    reports: { view: true, create: true, edit: false, delete: false }
  },
  collaborator: {
    quotes: { view: true, create: true, edit: true, delete: false },
    items: { view: true, create: false, edit: false, delete: false },
    suppliers: { view: true, create: false, edit: false, delete: false },
    approvals: { view: true, create: false, edit: false, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false }
  },
  supplier: {
    quotes: { view: true, create: false, edit: true, delete: false },
    items: { view: true, create: true, edit: true, delete: false },
    suppliers: { view: false, create: false, edit: true, delete: false },
    approvals: { view: false, create: false, edit: false, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false }
  }
};

export function usePermissions() {
  const [roles] = useState<Role[]>(mockRoles);
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);

  const updatePermission = (roleId: string, module: string, action: keyof Permission, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [module]: {
          ...prev[roleId][module],
          [action]: value
        }
      }
    }));
  };

  const hasPermission = (roleId: string, module: string, action: keyof Permission): boolean => {
    return permissions[roleId]?.[module]?.[action] || false;
  };

  const getRolePermissions = (roleId: string) => {
    return permissions[roleId] || {};
  };

  const createRole = (roleData: Omit<Role, "id" | "userCount">) => {
    const newRole: Role = {
      ...roleData,
      id: roleData.name.toLowerCase().replace(/\s+/g, '-'),
      userCount: 0
    };
    
    // Initialize with basic permissions
    const basicPermissions = {
      quotes: { view: false, create: false, edit: false, delete: false },
      items: { view: false, create: false, edit: false, delete: false },
      suppliers: { view: false, create: false, edit: false, delete: false },
      approvals: { view: false, create: false, edit: false, delete: false },
      payments: { view: false, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, create: false, edit: false, delete: false }
    };

    setPermissions(prev => ({
      ...prev,
      [newRole.id]: basicPermissions
    }));

    return newRole;
  };

  return {
    roles,
    permissions,
    updatePermission,
    hasPermission,
    getRolePermissions,
    createRole
  };
}