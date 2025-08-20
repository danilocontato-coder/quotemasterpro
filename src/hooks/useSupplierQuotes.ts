import { useState, useEffect } from 'react';

interface SupplierQuote {
  id: string;
  description: string;
  clientName: string;
  status: 'open' | 'under_review' | 'approved' | 'rejected';
  sentDate: string;
  estimatedValue?: number;
  desiredDeadline?: string;
  items: QuoteItem[];
  attachments?: string[];
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax?: number;
  discount?: number;
}

interface ProposalData {
  items: QuoteItem[];
  deliveryTime: string;
  shippingCost: string;
  paymentTerms: string;
  observations: string;
  attachments: string[];
}

const mockQuotes: SupplierQuote[] = [
  {
    id: 'RFQ-2024-001',
    description: 'Material de limpeza para condomínio',
    clientName: 'Condomínio Azul',
    status: 'open',
    sentDate: '15/01/2024',
    estimatedValue: 2500.00,
    desiredDeadline: '30 dias',
    items: [
      {
        id: '1',
        description: 'Detergente neutro 5L',
        quantity: 10,
        unitPrice: 15.50,
        tax: 0,
        discount: 0
      },
      {
        id: '2',
        description: 'Desinfetante 1L',
        quantity: 20,
        unitPrice: 8.90,
        tax: 0,
        discount: 0
      }
    ],
    attachments: ['especificacoes_limpeza.pdf']
  },
  {
    id: 'RFQ-2024-002',
    description: 'Materiais elétricos - Manutenção predial',
    clientName: 'Administradora Central',
    status: 'under_review',
    sentDate: '12/01/2024',
    estimatedValue: 1800.00,
    items: [
      {
        id: '1',
        description: 'Lâmpada LED 12W',
        quantity: 50,
        unitPrice: 12.00,
        tax: 0,
        discount: 5
      }
    ]
  },
  {
    id: 'RFQ-2024-003',
    description: 'Equipamentos de segurança',
    clientName: 'Condomínio Verde',
    status: 'approved',
    sentDate: '08/01/2024',
    estimatedValue: 3200.00,
    items: [
      {
        id: '1',
        description: 'Câmera de segurança',
        quantity: 4,
        unitPrice: 450.00,
        tax: 12,
        discount: 0
      }
    ]
  }
];

export function useSupplierQuotes() {
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento das cotações
    const loadQuotes = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQuotes(mockQuotes);
      setIsLoading(false);
    };

    loadQuotes();
  }, []);

  const getQuoteById = (id: string): SupplierQuote | undefined => {
    return quotes.find(quote => quote.id === id);
  };

  const sendProposal = async (quoteId: string, proposalData: ProposalData) => {
    // Simula envio da proposta
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setQuotes(prev => prev.map(quote => 
      quote.id === quoteId 
        ? { ...quote, status: 'under_review' as const }
        : quote
    ));

    // Mock audit log
    console.log('Audit Log:', {
      action: 'PROPOSAL_SENT',
      quoteId,
      userId: 'supplier-1',
      timestamp: new Date().toISOString(),
      details: proposalData
    });
  };

  return {
    quotes,
    isLoading,
    getQuoteById,
    sendProposal
  };
}