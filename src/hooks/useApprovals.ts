import { useState } from "react";
import { useSupplierRatings } from '@/hooks/useSupplierRatings';

export interface Approval {
  id: string;
  quote: {
    id: string;
    title: string;
    client: string;
    total: number;
  };
  requester: string;
  approvers: string[];
  status: "pending" | "approved" | "rejected";
  priority: "low" | "medium" | "high";
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  comments?: string;
  votes: {
    approver: string;
    vote: "approved" | "rejected" | "pending";
    comment?: string;
    votedAt?: string;
  }[];
}

const mockApprovals: Approval[] = [
  {
    id: "approval-1",
    quote: {
      id: "quote-1",
      title: "Material de Limpeza",
      client: "Condomínio Azul", 
      total: 2500.00
    },
    requester: "Maria Santos",
    approvers: ["João Silva", "Ana Costa"],
    status: "pending",
    priority: "medium",
    requestedAt: "2024-08-15 14:30",
    votes: [
      { approver: "João Silva", vote: "pending" },
      { approver: "Ana Costa", vote: "pending" }
    ]
  },
  {
    id: "approval-2",
    quote: {
      id: "quote-2", 
      title: "Materiais de Construção",
      client: "Condomínio Verde",
      total: 15000.00
    },
    requester: "Pedro Lima",
    approvers: ["João Silva", "Ana Costa", "Carlos Manager"],
    status: "approved",
    priority: "high",
    requestedAt: "2024-08-14 09:15",
    decidedAt: "2024-08-14 16:30",
    decidedBy: "João Silva",
    votes: [
      { 
        approver: "João Silva", 
        vote: "approved", 
        comment: "Materiais necessários para manutenção urgente",
        votedAt: "2024-08-14 10:30"
      },
      { 
        approver: "Ana Costa", 
        vote: "approved",
        votedAt: "2024-08-14 16:30" 
      },
      { approver: "Carlos Manager", vote: "pending" }
    ]
  },
  {
    id: "approval-3",
    quote: {
      id: "quote-3",
      title: "Equipamentos de Segurança", 
      client: "Condomínio Amarelo",
      total: 800.00
    },
    requester: "Carlos Oliveira",
    approvers: ["Maria Santos"],
    status: "rejected",
    priority: "low",
    requestedAt: "2024-08-13 11:00",
    decidedAt: "2024-08-13 17:45",
    decidedBy: "Maria Santos",
    comments: "Orçamento acima do mercado, solicitar nova cotação",
    votes: [
      { 
        approver: "Maria Santos", 
        vote: "rejected",
        comment: "Preço muito alto, buscar outras opções",
        votedAt: "2024-08-13 17:45"
      }
    ]
  },
  {
    id: "approval-4",
    quote: {
      id: "quote-4",
      title: "Produtos de Jardinagem",
      client: "Condomínio Azul",
      total: 1200.00
    },
    requester: "Ana Costa",
    approvers: ["João Silva"],
    status: "pending", 
    priority: "low",
    requestedAt: "2024-08-16 08:00",
    votes: [
      { approver: "João Silva", vote: "pending" }
    ]
  }
];

export function useApprovals() {
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);
  const [searchTerm, setSearchTerm] = useState("");
  const { createRatingPrompt } = useSupplierRatings();

  // Function to mark approved quote as delivered (triggers rating)
  const markAsDelivered = (quoteId: string, supplierName: string) => {
    createRatingPrompt({
      type: 'delivery_received',
      supplierId: '1', // Mock supplier ID - in real app would come from quote
      supplierName,
      quoteId,
    });
  };

  const approveRequest = (id: string, approverId: string, comment?: string) => {
    setApprovals(prev => prev.map(approval => {
      if (approval.id === id) {
        const updatedVotes = approval.votes.map(vote => 
          vote.approver === approverId ? {
            ...vote,
            vote: "approved" as const,
            comment,
            votedAt: new Date().toLocaleString('pt-BR')
          } : vote
        );

        // Check if all required approvals are met
        const approvedVotes = updatedVotes.filter(v => v.vote === "approved");
        const isFullyApproved = approvedVotes.length >= approval.approvers.length;

        return {
          ...approval,
          votes: updatedVotes,
          status: isFullyApproved ? "approved" as const : approval.status,
          decidedAt: isFullyApproved ? new Date().toLocaleString('pt-BR') : approval.decidedAt,
          decidedBy: isFullyApproved ? approverId : approval.decidedBy
        };
      }
      return approval;
    }));
  };

  const rejectRequest = (id: string, approverId: string, comment: string) => {
    setApprovals(prev => prev.map(approval => {
      if (approval.id === id) {
        const updatedVotes = approval.votes.map(vote => 
          vote.approver === approverId ? {
            ...vote,
            vote: "rejected" as const,
            comment,
            votedAt: new Date().toLocaleString('pt-BR')
          } : vote
        );

        return {
          ...approval,
          votes: updatedVotes,
          status: "rejected",
          decidedAt: new Date().toLocaleString('pt-BR'),
          decidedBy: approverId,
          comments: comment
        };
      }
      return approval;
    }));
  };

  const createApproval = (approvalData: Omit<Approval, "id" | "requestedAt" | "votes">) => {
    const newApproval: Approval = {
      ...approvalData,
      id: `approval-${Date.now()}`,
      requestedAt: new Date().toLocaleString('pt-BR'),
      votes: approvalData.approvers.map(approver => ({
        approver,
        vote: "pending" as const
      }))
    };
    setApprovals(prev => [...prev, newApproval]);
    return newApproval;
  };

  return {
    approvals,
    searchTerm,
    setSearchTerm,
    approveRequest,
    rejectRequest,
    createApproval,
    markAsDelivered,
  };
}