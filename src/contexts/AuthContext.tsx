import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'client' | 'supplier' | 'support';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  companyName?: string;
  active: boolean;
}

export const getRoleBasedRoute = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin/superadmin';
    case 'client':
      return '/dashboard';
    case 'supplier':
      return '/supplier';
    case 'support':
      return '/support';
    default:
      return '/dashboard';
  }
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string, role: UserRole, companyName?: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock users for development
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@quotemaster.com',
    name: 'Administrador',
    role: 'admin',
    active: true,
  },
  {
    id: '2',
    email: 'cliente@condominio.com',
    name: 'João Silva',
    role: 'client',
    companyName: 'Condomínio Residencial Vista Verde',
    active: true,
  },
  {
    id: '3',
    email: 'fornecedor@empresa.com',
    name: 'Maria Santos',
    role: 'supplier',
    companyName: 'Fornecedora Alpha Ltda',
    active: true,
  },
  {
    id: '4',
    email: 'suporte@quotemaster.com',
    name: 'Carlos Oliveira',
    role: 'support',
    active: true,
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular verificação de token armazenado
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email);
    
    if (!foundUser) {
      setIsLoading(false);
      throw new Error('Usuário não encontrado');
    }
    
    if (!foundUser.active) {
      setIsLoading(false);
      throw new Error('Conta desativada. Entre em contato com o suporte.');
    }
    
    // Em produção, verificar password hash
    if (password.length === 0) {
      setIsLoading(false);
      throw new Error('Senha é obrigatória');
    }
    
    setUser(foundUser);
    localStorage.setItem('currentUser', JSON.stringify(foundUser));
    setIsLoading(false);
  };

  const register = async (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole,
    companyName?: string
  ): Promise<void> => {
    setIsLoading(true);
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      setIsLoading(false);
      throw new Error('Email já está em uso');
    }
    
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name,
      role,
      companyName,
      active: true,
    };
    
    mockUsers.push(newUser);
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setIsLoading(false);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};