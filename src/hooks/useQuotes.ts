import { useState, useCallback } from 'react';
import { mockQuotes, Quote } from '@/data/mockData';

export interface AuditLog {
  id: string;
  action: 'DELETE' | 'CREATE' | 'UPDATE';
  entityType: 'quote';
  entityId: string;
  userId: string;
  details: Record<string, any>;
  timestamp: string;
}

let quotesStore: Quote[] = [...mockQuotes];
let auditStore: AuditLog[] = [];
let quoteCounter = 12; // Start after RFQ011

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>(quotesStore);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(auditStore);

  const generateRFQId = useCallback(() => {
    const id = `RFQ${String(quoteCounter).padStart(3, '0')}`;
    quoteCounter++;
    return id;
  }, []);

  const addQuote = useCallback((quoteData: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newQuote: Quote = {
      ...quoteData,
      id: generateRFQId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    quotesStore = [newQuote, ...quotesStore];
    setQuotes([...quotesStore]);
    
    // Add audit log
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action: 'CREATE',
      entityType: 'quote',
      entityId: newQuote.id,
      userId: 'current-user', // In real app, get from auth context
      details: { title: newQuote.title, status: newQuote.status },
      timestamp: new Date().toISOString(),
    };
    auditStore = [auditLog, ...auditStore];
    setAuditLogs([...auditStore]);
    
    return newQuote;
  }, [generateRFQId]);

  const updateQuote = useCallback((id: string, updates: Partial<Quote>) => {
    const updatedQuotes = quotesStore.map(quote => 
      quote.id === id 
        ? { ...quote, ...updates, updatedAt: new Date().toISOString() }
        : quote
    );
    quotesStore = updatedQuotes;
    setQuotes([...quotesStore]);
    
    // Add audit log
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action: 'UPDATE',
      entityType: 'quote',
      entityId: id,
      userId: 'current-user',
      details: updates,
      timestamp: new Date().toISOString(),
    };
    auditStore = [auditLog, ...auditStore];
    setAuditLogs([...auditStore]);
  }, []);

  const deleteQuote = useCallback((id: string, reason?: string) => {
    const quote = quotesStore.find(q => q.id === id);
    if (!quote) return;

    // If quote is sent (not draft), move to trash, otherwise delete permanently
    if (quote.status === 'draft') {
      quotesStore = quotesStore.filter(q => q.id !== id);
    } else {
      quotesStore = quotesStore.map(q => 
        q.id === id 
          ? { ...q, status: 'trash' as const, updatedAt: new Date().toISOString() }
          : q
      );
    }
    setQuotes([...quotesStore]);
    
    // Add audit log
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action: 'DELETE',
      entityType: 'quote',
      entityId: id,
      userId: 'current-user',
      details: { 
        title: quote.title, 
        previousStatus: quote.status,
        reason: reason || 'No reason provided',
        permanently: quote.status === 'draft'
      },
      timestamp: new Date().toISOString(),
    };
    auditStore = [auditLog, ...auditStore];
    setAuditLogs([...auditStore]);
  }, []);

  const getQuoteById = useCallback((id: string) => {
    return quotesStore.find(quote => quote.id === id);
  }, []);

  return {
    quotes,
    auditLogs,
    addQuote,
    updateQuote,
    deleteQuote,
    getQuoteById,
  };
};