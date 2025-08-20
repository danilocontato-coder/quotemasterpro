import { useState } from "react";
import { useProfiles } from "./useProfiles";

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

const defaultPermissions: Permissions = {
  admin: {
    quotes: { view: true, create: true, edit: true, delete: true },
    products: { view: true, create: true, edit: true, delete: true },
    suppliers: { view: true, create: true, edit: true, delete: true },
    payments: { view: true, create: true, edit: true, delete: true },
    communication: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true }
  },
  manager: {
    quotes: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    suppliers: { view: true, create: true, edit: true, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    communication: { view: true, create: true, edit: true, delete: false },
    users: { view: true, create: true, edit: true, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    reports: { view: true, create: true, edit: false, delete: false }
  },
  collaborator: {
    quotes: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: false, edit: false, delete: false },
    suppliers: { view: true, create: false, edit: false, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    communication: { view: true, create: true, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false }
  },
  supplier: {
    quotes: { view: true, create: false, edit: true, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    suppliers: { view: false, create: false, edit: true, delete: false },
    payments: { view: true, create: false, edit: false, delete: false },
    communication: { view: true, create: true, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false }
  }
};

export function usePermissions() {
  const { profiles } = useProfiles();
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);

  // Convert profiles to roles format and include default roles
  const systemRoles: Role[] = [
    { id: 'admin', name: 'Administrador', description: 'Acesso completo ao sistema', userCount: 0 },
    { id: 'manager', name: 'Gerente', description: 'Gerencia cotações, fornecedores e equipe', userCount: 0 },
    { id: 'collaborator', name: 'Colaborador', description: 'Cria e edita cotações', userCount: 0 },
    { id: 'supplier', name: 'Fornecedor', description: 'Responde cotações e gerencia catálogo', userCount: 0 },
  ];

  // Import user groups to show in roles
  let userGroups: any[] = [];
  try {
    const { useUserGroups } = require('./useUsersAndGroups');
    const { groups } = useUserGroups();
    userGroups = groups || [];
  } catch (error) {
    // Handle circular dependency gracefully
    userGroups = [];
  }

  const roles: Role[] = [
    ...systemRoles,
    ...profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      userCount: 0 // This would come from actual user data
    })),
    ...userGroups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      userCount: group.userCount || 0
    }))
  ];

  const updatePermission = (roleId: string, module: string, action: keyof Permission, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [module]: {
          ...prev[roleId]?.[module] || { view: false, create: false, edit: false, delete: false },
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

  const initializeProfilePermissions = (profileId: string) => {
    if (!permissions[profileId]) {
      const basicPermissions = {
        quotes: { view: false, create: false, edit: false, delete: false },
        products: { view: false, create: false, edit: false, delete: false },
        suppliers: { view: false, create: false, edit: false, delete: false },
        payments: { view: false, create: false, edit: false, delete: false },
        communication: { view: false, create: false, edit: false, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, create: false, edit: false, delete: false },
        reports: { view: false, create: false, edit: false, delete: false }
      };

      setPermissions(prev => ({
        ...prev,
        [profileId]: basicPermissions
      }));
    }
  };

  return {
    roles,
    permissions,
    updatePermission,
    hasPermission,
    getRolePermissions,
    initializeProfilePermissions
  };
}