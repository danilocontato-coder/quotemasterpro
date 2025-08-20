import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Quote } from '@/data/mockData';
import { notificationService, NotificationData } from './NotificationSystem';
import { ExtractedData } from './PDFUploadModal';

export interface StatusChangeResult {
  success: boolean;
  newStatus: Quote['status'];
  notifications?: NotificationData[];
  message?: string;
}

class QuoteStatusManager {
  private static instance: QuoteStatusManager;
  private statusHistory: Array<{
    quoteId: string;
    fromStatus: Quote['status'];
    toStatus: Quote['status'];
    timestamp: string;
    reason?: string;
    triggeredBy?: string;
  }> = [];

  static getInstance() {
    if (!QuoteStatusManager.instance) {
      QuoteStatusManager.instance = new QuoteStatusManager();
    }
    return QuoteStatusManager.instance;
  }

  async approveQuote(
    quote: Quote, 
    approvedBy: string,
    supplierEmail: string,
    supplierPhone?: string
  ): Promise<StatusChangeResult> {
    
    // Change status to approved
    const newStatus: Quote['status'] = 'approved';
    
    // Record status change
    this.recordStatusChange(quote.id, quote.status, newStatus, 'Cotação aprovada', approvedBy);

    try {
      // Send notifications to supplier
      const notifications = await notificationService.sendApprovalNotification(
        quote.id,
        quote.title,
        supplierEmail,
        supplierPhone
      );

      return {
        success: true,
        newStatus,
        notifications,
        message: `Cotação aprovada. ${notifications.length} notificação(ões) enviada(s) para o fornecedor.`
      };
    } catch (error) {
      return {
        success: false,
        newStatus: quote.status,
        message: 'Erro ao enviar notificações para o fornecedor'
      };
    }
  }

  async receiveQuoteDocument(
    quote: Quote,
    extractedData: ExtractedData,
    receivedBy: string
  ): Promise<StatusChangeResult> {
    
    // Validate extracted data
    if (!this.validateExtractedData(extractedData)) {
      return {
        success: false,
        newStatus: quote.status,
        message: 'Dados extraídos do PDF são inválidos'
      };
    }

    // Change status to finalized
    const newStatus: Quote['status'] = 'finalized';
    
    // Record status change
    this.recordStatusChange(
      quote.id, 
      quote.status, 
      newStatus, 
      'Orçamento recebido e processado automaticamente', 
      receivedBy
    );

    // Update quote with extracted data (in real implementation, this would update the database)
    this.updateQuoteWithExtractedData(quote, extractedData);

    return {
      success: true,
      newStatus,
      message: 'Cotação finalizada automaticamente com dados do orçamento recebido'
    };
  }

  private validateExtractedData(data: ExtractedData): boolean {
    return Boolean(
      data.items && data.items.length > 0 &&
      data.total > 0 &&
      data.supplier && data.supplier.name
    );
  }

  private updateQuoteWithExtractedData(quote: Quote, data: ExtractedData) {
    // In real implementation, this would update the database
    console.log('Updating quote with extracted data:', {
      quoteId: quote.id,
      originalTotal: quote.total,
      extractedTotal: data.total,
      itemsCount: data.items.length,
      supplier: data.supplier
    });
  }

  private recordStatusChange(
    quoteId: string,
    fromStatus: Quote['status'],
    toStatus: Quote['status'],
    reason?: string,
    triggeredBy?: string
  ) {
    this.statusHistory.push({
      quoteId,
      fromStatus,
      toStatus,
      timestamp: new Date().toISOString(),
      reason,
      triggeredBy
    });
  }

  getStatusHistory(quoteId?: string) {
    if (quoteId) {
      return this.statusHistory.filter(h => h.quoteId === quoteId);
    }
    return this.statusHistory;
  }

  getQuoteStatusFlow(currentStatus: Quote['status']): Array<{
    status: Quote['status'];
    label: string;
    description: string;
    automated: boolean;
  }> {
    const flows = {
      draft: [
        { status: 'active' as const, label: 'Enviar', description: 'Enviar cotação para fornecedores', automated: false }
      ],
      active: [
        { status: 'receiving' as const, label: 'Recebendo', description: 'Aguardando propostas', automated: true },
        { status: 'approved' as const, label: 'Aprovar', description: 'Aprovar cotação específica', automated: false }
      ],
      receiving: [
        { status: 'approved' as const, label: 'Aprovar', description: 'Aprovar proposta selecionada', automated: false }
      ],
      approved: [
        { status: 'finalized' as const, label: 'Finalizar', description: 'Receber orçamento em PDF', automated: true }
      ],
      finalized: [],
      trash: []
    };

    return flows[currentStatus] || [];
  }

  canTransitionTo(fromStatus: Quote['status'], toStatus: Quote['status']): boolean {
    const allowedTransitions = {
      draft: ['active', 'trash'],
      active: ['receiving', 'approved', 'trash'],
      receiving: ['approved', 'trash'],
      approved: ['finalized', 'trash'],
      finalized: ['trash'],
      trash: []
    };

    return allowedTransitions[fromStatus]?.includes(toStatus) || false;
  }
}

export const quoteStatusManager = QuoteStatusManager.getInstance();

// Hook for using quote status management
export function useQuoteStatusManager() {
  const { toast } = useToast();

  const approveQuote = async (
    quote: Quote,
    approvedBy: string,
    supplierEmail: string,
    supplierPhone?: string
  ) => {
    const result = await quoteStatusManager.approveQuote(quote, approvedBy, supplierEmail, supplierPhone);
    
    if (result.success && result.message) {
      toast({
        title: "Cotação Aprovada",
        description: result.message,
      });
    } else if (!result.success && result.message) {
      toast({
        title: "Erro",
        description: result.message,
        variant: "destructive",
      });
    }

    return result;
  };

  const finalizeQuote = async (
    quote: Quote,
    extractedData: ExtractedData,
    receivedBy: string
  ) => {
    const result = await quoteStatusManager.receiveQuoteDocument(quote, extractedData, receivedBy);
    
    if (result.success && result.message) {
      toast({
        title: "Cotação Finalizada",
        description: result.message,
      });
    } else if (!result.success && result.message) {
      toast({
        title: "Erro",
        description: result.message,
        variant: "destructive",
      });
    }

    return result;
  };

  return {
    approveQuote,
    finalizeQuote,
    getStatusHistory: quoteStatusManager.getStatusHistory,
    getQuoteStatusFlow: quoteStatusManager.getQuoteStatusFlow,
    canTransitionTo: quoteStatusManager.canTransitionTo
  };
}