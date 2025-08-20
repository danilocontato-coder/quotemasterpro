import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface SupplierRating {
  id: string;
  supplierId: string;
  supplierName: string;
  quoteId?: string;
  paymentId?: string;
  clientId: string;
  clientName: string;
  rating: number; // 1-5 stars
  qualityRating: number;
  deliveryRating: number;
  serviceRating: number;
  priceRating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingPrompt {
  id: string;
  type: 'payment_confirmed' | 'quote_completed' | 'delivery_received';
  supplierId: string;
  supplierName: string;
  quoteId?: string;
  paymentId?: string;
  createdAt: string;
  dismissed?: boolean;
}

// Mock data
const mockRatings: SupplierRating[] = [
  {
    id: 'RATE001',
    supplierId: '1',
    supplierName: 'Fornecedor Alpha',
    quoteId: 'RFQ001',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    rating: 4.5,
    qualityRating: 5,
    deliveryRating: 4,
    serviceRating: 5,
    priceRating: 4,
    comment: 'Excelente qualidade dos produtos, entrega no prazo acordado.',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
];

export const useSupplierRatings = () => {
  const [ratings, setRatings] = useState<SupplierRating[]>(mockRatings);
  const [ratingPrompts, setRatingPrompts] = useState<RatingPrompt[]>([]);
  const { toast } = useToast();

  const createRating = useCallback((ratingData: Omit<SupplierRating, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRating: SupplierRating = {
      ...ratingData,
      id: `RATE${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRatings(prev => [newRating, ...prev]);

    // Remove corresponding prompt
    if (ratingData.quoteId) {
      setRatingPrompts(prev => prev.filter(p => p.quoteId !== ratingData.quoteId));
    }
    if (ratingData.paymentId) {
      setRatingPrompts(prev => prev.filter(p => p.paymentId !== ratingData.paymentId));
    }

    toast({
      title: "Avaliação enviada",
      description: "Sua avaliação foi registrada com sucesso.",
    });

    return newRating.id;
  }, [toast]);

  const createRatingPrompt = useCallback((promptData: Omit<RatingPrompt, 'id' | 'createdAt'>) => {
    // Check if prompt already exists
    const existingPrompt = ratingPrompts.find(p => 
      (p.quoteId && p.quoteId === promptData.quoteId) ||
      (p.paymentId && p.paymentId === promptData.paymentId)
    );

    if (existingPrompt) return;

    const newPrompt: RatingPrompt = {
      ...promptData,
      id: `PROMPT${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setRatingPrompts(prev => [newPrompt, ...prev]);
    return newPrompt.id;
  }, [ratingPrompts]);

  const dismissPrompt = useCallback((promptId: string) => {
    setRatingPrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, dismissed: true } : p
    ));
  }, []);

  const getSupplierAverageRating = useCallback((supplierId: string) => {
    const supplierRatings = ratings.filter(r => r.supplierId === supplierId);
    if (supplierRatings.length === 0) return 0;
    
    const totalRating = supplierRatings.reduce((sum, rating) => sum + rating.rating, 0);
    return Number((totalRating / supplierRatings.length).toFixed(1));
  }, [ratings]);

  const getSupplierRatings = useCallback((supplierId: string) => {
    return ratings.filter(r => r.supplierId === supplierId);
  }, [ratings]);

  const getActivePrompts = useCallback(() => {
    return ratingPrompts.filter(p => !p.dismissed);
  }, [ratingPrompts]);

  return {
    ratings,
    ratingPrompts: getActivePrompts(),
    createRating,
    createRatingPrompt,
    dismissPrompt,
    getSupplierAverageRating,
    getSupplierRatings,
  };
};