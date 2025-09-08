import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAINegotiation } from '@/hooks/useAINegotiation';
import { AINegotiationCard } from './AINegotiationCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  DollarSign, 
  TrendingDown,
  Package,
  Calendar,
  MessageSquare,
  Download,
  Send,
  BarChart3,
  Brain
} from 'lucide-react';
import { Quote } from '@/hooks/useSupabaseQuotes';
import { useToast } from '@/hooks/use-toast';
import { QuoteComparison } from './QuoteComparison';
import { ItemAnalysisModal } from './ItemAnalysisModal';
import { QuoteMarkAsReceivedButton } from './QuoteMarkAsReceivedButton';
import { QuoteItemsList } from './QuoteItemsList';
import { getStatusText } from "@/utils/statusUtils";
import { ItemAnalysisData } from '@/hooks/useItemAnalysis';
import { supabase } from '@/integrations/supabase/client';

export interface QuoteProposal {
  id: string;
  quoteId: string;
  supplierId: string;
  supplierName: string;
  items: ProposalItem[];
  totalPrice: number;
  price: number; // Alias para compatibilidade
  deliveryTime: number;
  shippingCost: number;
  sla: number;
  warrantyMonths: number;
  reputation: number;
  observations?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ProposalItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  brand?: string;
  specifications?: string;
}

interface QuoteDetailModalProps {
  open: boolean;
  onClose: () => void;
  quote: Quote | null;
  onStatusChange?: (quoteId: string, newStatus: Quote['status']) => void;
  onApprove?: (proposal: QuoteProposal) => void;
}

// Interface para os itens da cotação
interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total?: number;
}

const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  open,
  onClose,
  quote,
  onStatusChange,
  onApprove
}) => {
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showItemAnalysis, setShowItemAnalysis] = useState(false);
  const [itemAnalysisData, setItemAnalysisData] = useState<ItemAnalysisData[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const { toast } = useToast();
  const { getNegotiationByQuoteId, startAnalysis, startNegotiation, approveNegotiation, rejectNegotiation } = useAINegotiation();

  // Fetch quote items from Supabase
  const fetchQuoteItems = useCallback(async () => {
    if (!quote?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id);
      
      if (error) {
        console.error('Error fetching quote items:', error);
        return;
      }
      
      setQuoteItems(data || []);
    } catch (error) {
      console.error('Error fetching quote items:', error);
    }
  }, [quote?.id]);

  // Fetch proposals from Supabase
  const fetchProposals = useCallback(async () => {
    if (!quote?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote_responses')
        .select(`
          *,
          suppliers (
            id,
            name
          )
        `)
        .eq('quote_id', quote.id);
      
      if (error) {
        console.error('Error fetching proposals:', error);
        return;
      }

      // Transform data to match QuoteProposal interface
      const transformedProposals: QuoteProposal[] = (data || []).map(response => ({
        id: response.id,
        quoteId: response.quote_id,
        supplierId: response.supplier_id,
        supplierName: response.supplier_name || response.suppliers?.name || 'Fornecedor',
        items: quoteItems.map(quoteItem => ({
          productId: quoteItem.id,
          productName: quoteItem.product_name,
          quantity: quoteItem.quantity,
          unitPrice: (quoteItem.unit_price || response.total_amount / (quoteItems.reduce((sum, item) => sum + item.quantity, 0) || 1)),
          total: (quoteItem.total || quoteItem.quantity * (quoteItem.unit_price || 0)),
          brand: 'N/A',
          specifications: ''
        })),
        totalPrice: response.total_amount,
        price: response.total_amount, // Para compatibilidade
        deliveryTime: response.delivery_time || 7,
        shippingCost: 0,
        sla: 24,
        warrantyMonths: 12,
        reputation: 4.0,
        observations: response.notes || '',
        submittedAt: response.created_at,
        status: 'pending'
      }));

      setProposals(transformedProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [quote?.id, quoteItems]);

  useEffect(() => {
    if (open && quote?.id) {
      fetchQuoteItems();
    }
  }, [open, quote?.id, fetchQuoteItems]);

  useEffect(() => {
    if (quoteItems.length > 0) {
      fetchProposals();
    }
  }, [quoteItems, fetchProposals]);

  const negotiation = quote ? getNegotiationByQuoteId(quote.id) : null;

  // Calculate best combination (multi-supplier optimization)
  const bestCombination = useMemo(() => {
    if (proposals.length === 0 || quoteItems.length === 0) return null;

    const itemAnalysis = quoteItems.map(quoteItem => {
      const itemProposals = proposals.map(proposal => {
        const proposalItem = proposal.items.find(item => item.productId === quoteItem.id);
        return {
          supplierId: proposal.supplierId,
          supplierName: proposal.supplierName,
          item: proposalItem,
          reputation: proposal.reputation,
          deliveryTime: proposal.deliveryTime,
          shippingCost: proposal.shippingCost
        };
      }).filter(p => p.item);

      // Find best price for this item
      const bestProposal = itemProposals.reduce((best, current) => {
        if (!current.item || !best.item) return current.item ? current : best;
        
        // Score considering price, reputation, and delivery
        const currentScore = (current.item.unitPrice * -1) + (current.reputation * 2) + (current.deliveryTime * -0.5);
        const bestScore = (best.item.unitPrice * -1) + (best.reputation * 2) + (best.deliveryTime * -0.5);
        
        return currentScore > bestScore ? current : best;
      }, itemProposals[0]);

      return {
        id: quoteItem.id,
        productId: quoteItem.id,
        productName: quoteItem.product_name,
        quantity: quoteItem.quantity,
        bestProposal,
        allProposals: itemProposals,
        savings: itemProposals.length > 0 ? 
          Math.max(...itemProposals.map(p => p.item?.unitPrice || 0)) - (bestProposal?.item?.unitPrice || 0) : 0
      };
    });

    const totalSavings = itemAnalysis.reduce((sum, item) => sum + (item.savings * item.quantity), 0);
    const totalCost = itemAnalysis.reduce((sum, item) => sum + ((item.bestProposal?.item?.unitPrice || 0) * item.quantity), 0);
    const originalCost = totalCost + totalSavings;

    return {
      items: itemAnalysis,
      totalSavings,
      totalCost,
      originalCost,
      savingsPercentage: originalCost > 0 ? (totalSavings / originalCost) * 100 : 0,
      uniqueSuppliers: [...new Set(itemAnalysis.map(item => item.bestProposal?.supplierId).filter(Boolean))],
      isMultiSupplier: [...new Set(itemAnalysis.map(item => item.bestProposal?.supplierId).filter(Boolean))].length > 1
    };
  }, [proposals, quoteItems]);

  const handleStatusChange = (newStatus: Quote['status']) => {
    if (!quote) return;
    
    onStatusChange?.(quote.id, newStatus);
    toast({
      title: "Status atualizado!",
      description: `Cotação ${quote.id} alterada para ${getStatusText(newStatus)}.`,
    });
  };

  const handleSendToSuppliers = () => {
    if (!quote) return;
    
    // Simulate sending to suppliers
    handleStatusChange('sent');
    toast({
      title: "Cotação enviada!",
      description: "A cotação foi enviada para os fornecedores selecionados.",
    });
  };

  const handleApproveOptimal = () => {
    if (!bestCombination) return;
    
    toast({
      title: "Combinação aprovada!",
      description: "A melhor combinação de fornecedores foi aprovada.",
    });
  };

  const refreshProposals = useCallback(() => {
    fetchProposals();
  }, [fetchProposals]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'receiving': return <MessageSquare className="h-4 w-4" />;
      case 'received': return <Eye className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'receiving': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!quote) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {quote.title}
                </DialogTitle>
                <p className="text-muted-foreground mt-1">
                  ID: {quote.id} • Empresa: {quote.client_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="secondary" 
                  className={`${getStatusColor(quote.status)} flex items-center gap-1`}
                >
                  {getStatusIcon(quote.status)}
                  {getStatusText(quote.status)}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="proposals">
                Propostas ({proposals.length})
              </TabsTrigger>
              <TabsTrigger value="analysis">Análise Inteligente</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Quote Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Resumo da Cotação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Itens</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{quoteItems.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Fornecedores</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{proposals.length}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Prazo</span>
                      </div>
                      <p className="text-sm font-bold text-purple-900">
                        {quote.deadline ? new Date(quote.deadline).toLocaleDateString('pt-BR') : 'Não definido'}
                      </p>
                    </div>
                  </div>

                  {quote.description && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Descrição</h4>
                      <p className="text-muted-foreground">{quote.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quote Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Itens da Cotação</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuoteItemsList quoteId={quote.id} />
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {quote.status === 'draft' && (
                      <Button onClick={handleSendToSuppliers} className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Enviar para Fornecedores
                      </Button>
                    )}
                    
                    {quote.status === 'receiving' && (
                      <QuoteMarkAsReceivedButton
                        quoteId={quote.id}
                        currentStatus={quote.status}
                      />
                    )}

                    {proposals.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowComparison(true)}
                        className="flex items-center gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Comparar Propostas
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setShowItemAnalysis(true)}
                      className="flex items-center gap-2"
                    >
                      <Brain className="h-4 w-4" />
                      Análise Detalhada
                    </Button>

                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proposals" className="space-y-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <p>Carregando propostas...</p>
                </div>
              ) : proposals.length > 0 ? (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{proposal.supplierName}</CardTitle>
                          <Badge className="bg-blue-100 text-blue-800">
                            R$ {proposal.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                            <p className="font-medium">{proposal.deliveryTime} dias</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Frete</p>
                            <p className="font-medium">R$ {proposal.shippingCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Garantia</p>
                            <p className="font-medium">{proposal.warrantyMonths} meses</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Reputação</p>
                            <p className="font-medium">{proposal.reputation}/5 ⭐</p>
                          </div>
                        </div>

                        {proposal.observations && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-1">Observações</p>
                            <p className="text-sm">{proposal.observations}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => onApprove?.(proposal)}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Negociar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma proposta recebida ainda.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {/* AI Negotiation Card */}
              {negotiation ? (
                <AINegotiationCard
                  negotiation={negotiation}
                  onStartNegotiation={startNegotiation}
                  onApproveNegotiation={approveNegotiation}
                  onRejectNegotiation={rejectNegotiation}
                  onStartAnalysis={startAnalysis}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Análise Inteligente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhuma análise foi iniciada para esta cotação.
                    </p>
                    <Button onClick={() => startAnalysis(quote.id)} className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Executar análise IA
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Smart Economy Analysis */}
              {bestCombination && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <TrendingDown className="h-5 w-5" />
                        Análise de Economia Inteligente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Economia Total</p>
                          <p className="text-2xl font-bold text-green-600">
                            R$ {bestCombination.totalSavings.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Percentual</p>
                          <p className="text-2xl font-bold text-green-600">
                            {bestCombination.savingsPercentage.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Custo Final</p>
                          <p className="text-2xl font-bold text-blue-600">
                            R$ {bestCombination.totalCost.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fornecedores</p>
                          <p className="text-2xl font-bold">
                            {bestCombination.uniqueSuppliers.length}
                          </p>
                        </div>
                      </div>
                      
                      {bestCombination.isMultiSupplier && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            💡 <strong>Estratégia Multi-fornecedor:</strong> A melhor economia é obtida comprando de diferentes fornecedores.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Item Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Análise Item por Item</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {bestCombination.items.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold">{item.productName}</h4>
                                <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">
                                  Economia: R$ {((item.savings || 0) * (item.quantity || 0)).toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  por unidade: R$ {(item.savings || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {item.bestProposal && (
                              <div className="bg-green-50 p-3 rounded">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-green-800">
                                      Melhor: {item.bestProposal.supplierName}
                                    </p>
                                    <p className="text-sm text-green-600">
                                      R$ {(item.bestProposal?.item?.unitPrice || 0).toFixed(2)}/un
                                      {item.bestProposal.item?.brand && ` • ${item.bestProposal.item.brand}`}
                                    </p>
                                  </div>
                                  <Badge variant="default">
                                    {item.bestProposal.reputation}/5 ⭐
                                  </Badge>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 text-xs text-muted-foreground">
                              <p>Outras opções: {item.allProposals.length - 1} fornecedor(es)</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {bestCombination.items.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <Button onClick={handleApproveOptimal} className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar Combinação Ótima
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Send className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Cotação criada</p>
                        <p className="text-sm text-muted-foreground">
                          {quote.created_at ? new Date(quote.created_at).toLocaleString('pt-BR') : 'Data não disponível'}
                        </p>
                      </div>
                    </div>
                    
                    {quote.status !== 'draft' && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="bg-green-100 p-2 rounded-full">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Enviada para fornecedores</p>
                          <p className="text-sm text-muted-foreground">
                            {quote.suppliers_sent_count || 0} fornecedores contatados
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <QuoteComparison
        open={showComparison}
        onClose={() => setShowComparison(false)}
        proposals={proposals}
        quoteTitle={quote?.title || ''}
      />

      <ItemAnalysisModal
        open={showItemAnalysis}
        onClose={() => setShowItemAnalysis(false)}
        items={itemAnalysisData}
      />
    </>
  );
};

export default QuoteDetailModal;
export { QuoteDetailModal };