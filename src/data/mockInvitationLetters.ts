/**
 * Mock data para Cartas Convite
 * Fase 1: UI + Mock Data
 */

export type InvitationLetterStatus = 'draft' | 'sent' | 'cancelled';

export interface InvitationLetter {
  id: string;
  letter_number: string; // Ex: "CC-2025-001"
  quote_id: string;
  quote_title: string;
  client_id: string;
  client_name: string;
  supplier_ids: string[];
  supplier_names: string[];
  title: string;
  description: string;
  deadline: string; // ISO date string
  status: InvitationLetterStatus;
  attachments: InvitationLetterAttachment[];
  created_at: string;
  sent_at?: string;
  created_by: string;
  responses_count: number;
  viewed_count: number;
}

export interface InvitationLetterAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface InvitationLetterSupplier {
  id: string;
  invitation_letter_id: string;
  supplier_id: string;
  supplier_name: string;
  sent_at?: string;
  viewed_at?: string;
  response_status: 'pending' | 'accepted' | 'declined';
  response_date?: string;
  response_notes?: string;
}

// Mock data
export const mockInvitationLetters: InvitationLetter[] = [
  {
    id: 'inv-001',
    letter_number: 'CC-2025-001',
    quote_id: 'RFQ011',
    quote_title: 'Materiais de Construção',
    client_id: '1',
    client_name: 'Condomínio Jardim das Flores',
    supplier_ids: ['sup-1', 'sup-2', 'sup-3'],
    supplier_names: ['Construtora Silva', 'Materials Express', 'BuildPro'],
    title: 'Carta Convite - Materiais de Construção - Bloco A',
    description: 'Solicitação de proposta para fornecimento de materiais de construção para reforma do bloco A do condomínio.',
    deadline: '2025-09-15T23:59:59Z',
    status: 'sent',
    attachments: [
      {
        id: 'att-1',
        name: 'edital-reforma-bloco-a.pdf',
        url: '/attachments/edital-reforma-bloco-a.pdf',
        size: 245600,
        type: 'application/pdf'
      },
      {
        id: 'att-2',
        name: 'especificacoes-tecnicas.pdf',
        url: '/attachments/especificacoes-tecnicas.pdf',
        size: 512000,
        type: 'application/pdf'
      }
    ],
    created_at: '2025-08-18T10:30:00Z',
    sent_at: '2025-08-18T14:00:00Z',
    created_by: 'user-001',
    responses_count: 2,
    viewed_count: 3
  },
  {
    id: 'inv-002',
    letter_number: 'CC-2025-002',
    quote_id: 'RFQ009',
    quote_title: 'Manutenção Elétrica',
    client_id: '1',
    client_name: 'Condomínio Jardim das Flores',
    supplier_ids: ['sup-4', 'sup-5'],
    supplier_names: ['Elétrica Luz', 'Power Solutions'],
    title: 'Carta Convite - Manutenção Sistema Elétrico',
    description: 'Convite para participação em processo de cotação para manutenção e atualização do sistema elétrico predial.',
    deadline: '2025-09-10T23:59:59Z',
    status: 'sent',
    attachments: [
      {
        id: 'att-3',
        name: 'projeto-eletrico.pdf',
        url: '/attachments/projeto-eletrico.pdf',
        size: 1024000,
        type: 'application/pdf'
      }
    ],
    created_at: '2025-08-16T16:45:00Z',
    sent_at: '2025-08-17T09:00:00Z',
    created_by: 'user-001',
    responses_count: 1,
    viewed_count: 2
  },
  {
    id: 'inv-003',
    letter_number: 'CC-2025-003',
    quote_id: 'RFQ010',
    quote_title: 'Equipamentos de Limpeza',
    client_id: '1',
    client_name: 'Condomínio Jardim das Flores',
    supplier_ids: ['sup-6', 'sup-7', 'sup-8'],
    supplier_names: ['Clean Pro', 'Higieniza+', 'EcoClean'],
    title: 'Carta Convite - Equipamentos de Limpeza',
    description: 'Solicitação de propostas para fornecimento de equipamentos e produtos de limpeza para áreas comuns.',
    deadline: '2025-09-20T23:59:59Z',
    status: 'draft',
    attachments: [],
    created_at: '2025-08-18T14:20:00Z',
    created_by: 'user-001',
    responses_count: 0,
    viewed_count: 0
  }
];

export const mockInvitationLetterSuppliers: InvitationLetterSupplier[] = [
  // Carta 1 - Materiais de Construção
  {
    id: 'invs-001',
    invitation_letter_id: 'inv-001',
    supplier_id: 'sup-1',
    supplier_name: 'Construtora Silva',
    sent_at: '2025-08-18T14:00:00Z',
    viewed_at: '2025-08-18T15:30:00Z',
    response_status: 'accepted',
    response_date: '2025-08-19T10:00:00Z',
    response_notes: 'Proposta enviada conforme solicitado'
  },
  {
    id: 'invs-002',
    invitation_letter_id: 'inv-001',
    supplier_id: 'sup-2',
    supplier_name: 'Materials Express',
    sent_at: '2025-08-18T14:00:00Z',
    viewed_at: '2025-08-18T16:00:00Z',
    response_status: 'accepted',
    response_date: '2025-08-19T14:30:00Z',
    response_notes: 'Proposta comercial anexada'
  },
  {
    id: 'invs-003',
    invitation_letter_id: 'inv-001',
    supplier_id: 'sup-3',
    supplier_name: 'BuildPro',
    sent_at: '2025-08-18T14:00:00Z',
    viewed_at: '2025-08-19T09:00:00Z',
    response_status: 'pending'
  },
  // Carta 2 - Manutenção Elétrica
  {
    id: 'invs-004',
    invitation_letter_id: 'inv-002',
    supplier_id: 'sup-4',
    supplier_name: 'Elétrica Luz',
    sent_at: '2025-08-17T09:00:00Z',
    viewed_at: '2025-08-17T10:30:00Z',
    response_status: 'accepted',
    response_date: '2025-08-18T11:00:00Z',
    response_notes: 'Enviamos nossa melhor proposta técnica'
  },
  {
    id: 'invs-005',
    invitation_letter_id: 'inv-002',
    supplier_id: 'sup-5',
    supplier_name: 'Power Solutions',
    sent_at: '2025-08-17T09:00:00Z',
    viewed_at: '2025-08-17T11:00:00Z',
    response_status: 'pending'
  }
];

// Helper functions
export const getLetterStatusText = (status: InvitationLetterStatus): string => {
  const statusMap: Record<InvitationLetterStatus, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    cancelled: 'Cancelada'
  };
  return statusMap[status];
};

export const getLetterStatusColor = (status: InvitationLetterStatus): string => {
  const colorMap: Record<InvitationLetterStatus, string> = {
    draft: 'text-gray-600 bg-gray-50 border-gray-200',
    sent: 'text-blue-600 bg-blue-50 border-blue-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200'
  };
  return colorMap[status];
};

export const getResponseStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    accepted: 'Aceita',
    declined: 'Recusada'
  };
  return statusMap[status] || status;
};

export const getResponseStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    accepted: 'text-green-600 bg-green-50 border-green-200',
    declined: 'text-red-600 bg-red-50 border-red-200'
  };
  return colorMap[status] || 'text-gray-600 bg-gray-50 border-gray-200';
};
