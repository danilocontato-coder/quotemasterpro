import { useState } from "react";

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
}

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
    client: "Condomínio Azul"
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
    client: "Condomínio Azul"
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
    supplier: "Fornecedor Alpha"
  },
  {
    id: "user-4",
    name: "Ana Costa",
    email: "ana.costa@admin.com",
    phone: "+55 11 96666-0000", 
    role: "admin",
    status: "active",
    lastAccess: "Hoje às 09:15",
    createdAt: "2024-01-01"
  },
  {
    id: "user-5",
    name: "Pedro Lima",
    email: "pedro.lima@empresa.com",
    role: "collaborator", 
    status: "inactive",
    lastAccess: "1 semana atrás",
    createdAt: "2024-03-05",
    client: "Condomínio Verde"
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

  return {
    users,
    searchTerm,
    setSearchTerm,
    createUser,
    updateUser,
    deleteUser,
    generateTemporaryPassword
  };
}