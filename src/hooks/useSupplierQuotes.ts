// DEPRECATED: Use useSupabaseSupplierQuotes instead
import { useState, useCallback } from 'react';
import { mockQuotes, Quote } from '@/data/mockData';

export interface SupplierQuote {
  id: string;
  title: string;
  description: string;
  client: string;
  clientId: string;
  status: 'pending' | 'proposal_sent' | 'approved' | 'rejected' | 'expired';
  deadline: string;
  estimatedValue?: number;
  sentAt?: string;
  createdAt: string;
  items: SupplierQuoteItem[];
  attachments?: QuoteAttachment[];
  proposal?: QuoteProposal;
}

export interface SupplierQuoteItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export interface QuoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface QuoteProposal {
  id: string;
  quoteId: string;
  supplierId: string;
  items: ProposalItem[];
  totalValue: number;
  deliveryTime: number; // days
  paymentTerms: string;
  observations?: string;
  attachments: QuoteAttachment[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt: string;
  sentAt?: string;
}

export interface ProposalItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  brand?: string;
  specifications?: string;
}

// Convert client quotes to supplier format
const convertToSupplierQuotes = (quotes: Quote[]): SupplierQuote[] => {
  return quotes
    .filter(q => q.status === 'receiving' || q.status === 'approved' || q.status === 'finalized')
    .map(quote => ({
      id: quote.id,
      title: quote.title,
      description: quote.description,
      client: quote.clientName,
      clientId: quote.clientId,
      status: getSupplierStatus(quote.status),
      deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedValue: quote.total > 0 ? quote.total : undefined,
      createdAt: quote.createdAt,
      items: quote.items.map(item => ({
        id: item.id,
        productName: item.productName,
        description: `Produto: ${item.productName}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      attachments: [],
      proposal: mockProposals.find(p => p.quoteId === quote.id),
    }));
};

const getSupplierStatus = (clientStatus: string): SupplierQuote['status'] => {
  switch (clientStatus) {
    case 'receiving':
      return 'pending';
    case 'approved':
      return 'approved';
    case 'finalized':
      return 'approved';
    default:
      return 'pending';
  }
};

// Mock proposals data
const mockProposals: QuoteProposal[] = [
  {
    id: 'PROP001',
    quoteId: 'RFQ009',
    supplierId: 'current-supplier',
    items: [
      {
        id: '1',
        productName: 'Cimento Portland 50kg',
        description: 'Cimento Portland comum para construção civil',
        quantity: 10,
        unitPrice: 35.00,
        total: 350.00,
        brand: 'Votoran',
        specifications: 'CP II-E-32',
      },
      {
        id: '2',
        productName: 'Lâmpada LED 12W',
        description: 'Lâmpada LED bulbo 12W luz branca 6500K',
        quantity: 20,
        unitPrice: 18.50,
        total: 370.00,
        brand: 'Philips',
        specifications: '12W, 6500K, E27',
      },
    ],
    totalValue: 720.00,
    deliveryTime: 5,
    paymentTerms: '30 dias após entrega',
    observations: 'Entrega inclui transporte até o local. Instalação das lâmpadas por nossa conta.',
    attachments: [],
    status: 'sent',
    createdAt: '2025-08-20T14:30:00Z',
    sentAt: '2025-08-20T14:30:00Z',
  },
];

let supplierQuotesStore: SupplierQuote[] = convertToSupplierQuotes(mockQuotes);
let proposalsStore: QuoteProposal[] = [...mockProposals];

export const useSupplierQuotes = () => {
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>(supplierQuotesStore);
  const [proposals, setProposals] = useState<QuoteProposal[]>(proposalsStore);

  const getQuoteById = useCallback((id: string) => {
    return supplierQuotesStore.find(quote => quote.id === id);
  }, []);

  const createProposal = useCallback((quoteId: string, proposalData: Omit<QuoteProposal, 'id' | 'quoteId' | 'supplierId' | 'createdAt' | 'status'>) => {
    const newProposal: QuoteProposal = {
      ...proposalData,
      id: crypto.randomUUID(),
      quoteId,
      supplierId: 'current-supplier', // In real app, get from auth context
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    proposalsStore = [newProposal, ...proposalsStore];
    setProposals([...proposalsStore]);

    // Update quote with proposal
    supplierQuotesStore = supplierQuotesStore.map(quote =>
      quote.id === quoteId
        ? { ...quote, proposal: newProposal }
        : quote
    );
    setSupplierQuotes([...supplierQuotesStore]);

    return newProposal;
  }, []);

  const updateProposal = useCallback((proposalId: string, updates: Partial<QuoteProposal>) => {
    proposalsStore = proposalsStore.map(proposal =>
      proposal.id === proposalId
        ? { ...proposal, ...updates }
        : proposal
    );
    setProposals([...proposalsStore]);

    // Update quote with updated proposal
    const updatedProposal = proposalsStore.find(p => p.id === proposalId);
    if (updatedProposal) {
      supplierQuotesStore = supplierQuotesStore.map(quote =>
        quote.id === updatedProposal.quoteId
          ? { ...quote, proposal: updatedProposal }
          : quote
      );
      setSupplierQuotes([...supplierQuotesStore]);
    }
  }, []);

  const sendProposal = useCallback((proposalId: string) => {
    const proposal = proposalsStore.find(p => p.id === proposalId);
    if (!proposal) return;

    const updates = {
      status: 'sent' as const,
      sentAt: new Date().toISOString(),
    };

    updateProposal(proposalId, updates);

    // Update quote status
    supplierQuotesStore = supplierQuotesStore.map(quote =>
      quote.id === proposal.quoteId
        ? { ...quote, status: 'proposal_sent' as const, sentAt: new Date().toISOString() }
        : quote
    );
    setSupplierQuotes([...supplierQuotesStore]);
  }, [updateProposal]);

  const addAttachment = useCallback((quoteId: string, file: File) => {
    // Mock file upload - in real app, this would upload to Supabase Storage
    const attachment: QuoteAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file), // Mock URL
      uploadedAt: new Date().toISOString(),
    };

    supplierQuotesStore = supplierQuotesStore.map(quote =>
      quote.id === quoteId
        ? { 
            ...quote, 
            attachments: [...(quote.attachments || []), attachment]
          }
        : quote
    );
    setSupplierQuotes([...supplierQuotesStore]);

    return attachment;
  }, []);

  const removeAttachment = useCallback((quoteId: string, attachmentId: string) => {
    supplierQuotesStore = supplierQuotesStore.map(quote =>
      quote.id === quoteId
        ? { 
            ...quote, 
            attachments: quote.attachments?.filter(att => att.id !== attachmentId) || []
          }
        : quote
    );
    setSupplierQuotes([...supplierQuotesStore]);
  }, []);

  return {
    supplierQuotes,
    proposals,
    getQuoteById,
    createProposal,
    updateProposal,
    sendProposal,
    addAttachment,
    removeAttachment,
  };
};