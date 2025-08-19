import { useState } from "react";

export interface Profile {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  active: boolean;
  createdAt: string;
}

const mockProfiles: Profile[] = [
  {
    id: "profile-admin",
    name: "Administrador",
    description: "Acesso completo ao sistema",
    permissions: ["all"],
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: "profile-manager", 
    name: "Gerente",
    description: "Gerenciamento de cotações e aprovações",
    permissions: ["quotes.manage", "approvals.manage", "users.view"],
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: "profile-collaborator",
    name: "Colaborador", 
    description: "Criação e edição de cotações",
    permissions: ["quotes.create", "quotes.edit", "quotes.view"],
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: "profile-supplier",
    name: "Fornecedor",
    description: "Resposta a cotações e gestão de produtos", 
    permissions: ["quotes.respond", "products.manage"],
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: "profile-sindico",
    name: "Síndico",
    description: "Aprovação de cotações até R$ 5.000",
    permissions: ["quotes.view", "approvals.level1"],
    active: true,
    createdAt: "2024-01-15"
  }
];

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [searchTerm, setSearchTerm] = useState("");

  const createProfile = (profileData: Omit<Profile, "id" | "createdAt">) => {
    const newProfile: Profile = {
      ...profileData,
      id: `profile-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProfiles(prev => [...prev, newProfile]);
    return newProfile;
  };

  const updateProfile = (id: string, profileData: Partial<Profile>) => {
    setProfiles(prev => prev.map(profile => 
      profile.id === id ? { ...profile, ...profileData } : profile
    ));
  };

  const deleteProfile = (id: string) => {
    setProfiles(prev => prev.filter(profile => profile.id !== id));
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    profiles,
    filteredProfiles,
    searchTerm,
    setSearchTerm,
    createProfile,
    updateProfile,
    deleteProfile
  };
}