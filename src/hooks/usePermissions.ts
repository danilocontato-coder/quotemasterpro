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
  const { profiles } = useProfiles();
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);

  // Convert profiles to roles format and include default roles
  const roles: Role[] = [
    ...profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      userCount: 0 // This would come from actual user data
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