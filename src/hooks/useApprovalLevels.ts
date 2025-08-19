import { useState } from "react";

export interface ApprovalLevel {
  id: string;
  name: string;
  description: string;
  minValue: number;
  maxValue: number;
  approvers: string[];
  approvalType: "all" | "any" | "majority";
  requiredApprovals?: number;
  active: boolean;
  createdAt: string;
}

const mockApprovalLevels: ApprovalLevel[] = [
  {
    id: "level-1",
    name: "Nível 1 - Básico",
    description: "Aprovações para compras até R$ 1.000",
    minValue: 0,
    maxValue: 1000,
    approvers: ["João Silva", "Maria Santos"],
    approvalType: "any",
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: "level-2", 
    name: "Nível 2 - Intermediário",
    description: "Aprovações para compras de R$ 1.001 até R$ 5.000",
    minValue: 1001,
    maxValue: 5000,
    approvers: ["João Silva", "Ana Costa"],
    approvalType: "all",
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: "level-3",
    name: "Nível 3 - Alto",
    description: "Aprovações para compras de R$ 5.001 até R$ 20.000",
    minValue: 5001,
    maxValue: 20000,
    approvers: ["João Silva", "Ana Costa", "Carlos Manager"],
    approvalType: "majority",
    requiredApprovals: 2,
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: "level-4",
    name: "Nível 4 - Crítico", 
    description: "Aprovações para compras acima de R$ 20.000",
    minValue: 20001,
    maxValue: 999999,
    approvers: ["Ana Costa", "Diretor Financeiro"],
    approvalType: "all",
    active: true,
    createdAt: "2024-01-15"
  }
];

export function useApprovalLevels() {
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>(mockApprovalLevels);
  const [searchTerm, setSearchTerm] = useState("");

  const createApprovalLevel = (levelData: Omit<ApprovalLevel, "id" | "createdAt">) => {
    const newLevel: ApprovalLevel = {
      ...levelData,
      id: `level-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setApprovalLevels(prev => [...prev, newLevel]);
    return newLevel;
  };

  const updateApprovalLevel = (id: string, levelData: Partial<ApprovalLevel>) => {
    setApprovalLevels(prev => prev.map(level => 
      level.id === id ? { ...level, ...levelData } : level
    ));
  };

  const deleteApprovalLevel = (id: string) => {
    setApprovalLevels(prev => prev.filter(level => level.id !== id));
  };

  const getApprovalLevelForValue = (value: number) => {
    return approvalLevels.find(level => 
      level.active && value >= level.minValue && value <= level.maxValue
    );
  };

  return {
    approvalLevels,
    searchTerm,
    setSearchTerm,
    createApprovalLevel,
    updateApprovalLevel,
    deleteApprovalLevel,
    getApprovalLevelForValue
  };
}