import React, { useState, useMemo, useEffect } from 'react';
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
  BarChart3
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
}

// Mock proposals for demonstration
const mockProposals: QuoteProposal[] = [
  {
    id: '1',
    quoteId: 'RFQ009',
    supplierId: '1',
    supplierName: 'Materiais Santos Ltda',
    items: [
      {
        productId: '1',
        productName: 'Cimento Portland 50kg',
        quantity: 10,
        unitPrice: 32.50,
        total: 325.00,
        brand: 'Votorantim',
        specifications: 'CP II-E-32'
      },
      {
        productId: '8',
        productName: 'Lâmpada LED 12W',
        quantity: 20,
        unitPrice: 15.90,
        total: 318.00,
        brand: 'Philips',
        specifications: 'Luz branca 6500K'
      }
    ],
    totalPrice: 643.00,
    deliveryTime: 7,
    shippingCost: 45.00,
    sla: 24,
    warrantyMonths: 12,
    reputation: 4.5,
    observations: 'Proposta com desconto por volume. Entrega programada.',
    submittedAt: '2025-08-19T10:30:00Z',
    status: 'pending'
  },
  {
    id: '2',
    quoteId: 'RFQ009',
    supplierId: '3',
    supplierName: 'Elétrica Silva & Cia',
    items: [
      {
        productId: '1',
        productName: 'Cimento Portland 50kg',
        quantity: 10,
        unitPrice: 35.00,
        total: 350.00,
        brand: 'Cauê',
        specifications: 'CP II-F-32'
      },
      {
        productId: '8',
        productName: 'Lâmpada LED 12W',
        quantity: 20,
        unitPrice: 12.50,
        total: 250.00,
        brand: 'Osram',
        specifications: 'Luz branca 6000K'
      }
    ],
    totalPrice: 600.00,
    deliveryTime: 10,
    shippingCost: 38.00,
    sla: 48,
    warrantyMonths: 18,
    reputation: 4.8,
    observations: 'Melhor garantia do mercado. Instalação técnica disponível.',
    submittedAt: '2025-08-19T14:15:00Z',
    status: 'pending'
  },
  {
    id: '3',
    quoteId: 'RFQ009',
    supplierId: '5',
    supplierName: 'Hidráulica Rápida',
    items: [
      {
        productId: '1',
        productName: 'Cimento Portland 50kg',
        quantity: 10,
        unitPrice: 31.00,
        total: 310.00,
        brand: 'InterCement',
        specifications: 'CP II-E-32'
      },
      {
        productId: '8',
        productName: 'Lâmpada LED 12W',
        quantity: 20,
        unitPrice: 16.50,
        total: 330.00,
        brand: 'Philips',
        specifications: 'Luz branca 6500K, dimmerizável'
      }
    ],
    totalPrice: 640.00,
    deliveryTime: 5,
    shippingCost: 32.00,
    sla: 12,
    warrantyMonths: 24,
    reputation: 4.2,
    observations: 'Entrega expressa. Produto premium com dimmerização.',
    submittedAt: '2025-08-19T16:45:00Z',
    status: 'pending'
  }
];

export function QuoteDetailModal({ open, onClose, quote, onStatusChange }: QuoteDetailModalProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [showItemAnalysis, setShowItemAnalysis] = useState(false);
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const { toast } = useToast();
  const { getNegotiationByQuoteId, startNegotiation, approveNegotiation, rejectNegotiation } = useAINegotiation();

  // Fetch real proposals from Supabase
  const fetchProposals = async () => {
    if (!quote?.id) return;
    
    setIsLoadingProposals(true);
    try {
      const { data: responses, error } = await supabase
        .from('quote_responses')
        .select(`
          *,
          suppliers!inner(name, cnpj, email, phone)
        `)
        .eq('quote_id', quote.id);

      if (error) {
        console.error('Error fetching proposals:', error);
        return;
      }

      console.log('📋 Proposals fetched for quote detail:', responses?.length || 0);

      const transformedProposals: QuoteProposal[] = (responses || []).map(response => ({
        id: response.id,
        quoteId: response.quote_id,
        supplierId: response.supplier_id,
        supplierName: response.suppliers.name,
        items: [], // Will be populated if needed
        totalPrice: response.total_amount,
        deliveryTime: response.delivery_time || 7,
        shippingCost: 0, // Default shipping cost
        sla: 24, // Default SLA in hours
        warrantyMonths: 12, // Default warranty
        reputation: 4.5, // Default rating
        observations: response.notes || '',
        submittedAt: response.created_at,
        status: 'pending'
      }));

      setProposals(transformedProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  useEffect(() => {
    if (open && quote?.id) {
      fetchProposals();
    }
  }, [open, quote?.id]);

  const negotiation = quote ? getNegotiationByQuoteId(quote.id) : null;

  // Calculate best combination (multi-supplier optimization)
  const bestCombination = useMemo(() => {
    if (proposals.length === 0) return null;

    // Since we don't have items from the Quote interface, we'll use a simplified approach
    const mockItems = [
      { id: '1', productId: '1', productName: 'Item 1', quantity: 1 },
      { id: '2', productId: '2', productName: 'Item 2', quantity: 1 }
    ];

    const itemAnalysis = mockItems.map(quoteItem => {
      const itemProposals = proposals.map(proposal => {
        const proposalItem = proposal.items.find(item => item.productId === quoteItem.productId);
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
        ...quoteItem,
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
  }, [proposals]);

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
    
    handleStatusChange('sent');
    toast({
      title: "Cotação enviada!",
      description: "Fornecedores foram notificados e podem enviar propostas.",
    });
  };

  const handleApproveOptimal = () => {
    if (!quote || !bestCombination) return;
    
    handleStatusChange('approved');
    toast({
      title: "Combinação aprovada!",
      description: `Economia de R$ ${bestCombination?.totalSavings?.toFixed(2) || '0.00'} (${bestCombination?.savingsPercentage?.toFixed(1) || '0.0'}%) confirmada.`,
    });
  };

  // getStatusText is now imported from utils

  if (!quote) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{quote.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  ID: {quote.id} • {quote.client_name}
                </p>
              </div>
              <Badge className="text-sm px-3 py-1">
                {getStatusText(quote.status)}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="proposals">
                Propostas ({proposals.length})
              </TabsTrigger>
              <TabsTrigger value="analysis">Análise Inteligente</TabsTrigger>
              <TabsTrigger value="timeline">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Itens Solicitados</p>
                        <p className="text-2xl font-bold">{quote.items_count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Propostas Recebidas</p>
                        <p className="text-2xl font-bold">{proposals.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Prazo</p>
                        <p className="text-sm font-semibold">
                          {quote.deadline ? new Date(quote.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Descrição da Cotação</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{quote.description}</p>
                </CardContent>
              </Card>

              {/* Items Display */}
              <QuoteItemsList quoteId={quote.id} />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {quote.status === 'draft' && (
                  <Button onClick={handleSendToSuppliers} className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Enviar para Fornecedores
                  </Button>
                )}

                {/* Mark as Received Button */}
                <QuoteMarkAsReceivedButton 
                  quoteId={quote.id} 
                  currentStatus={quote.status} 
                />

                {quote.status === 'under_review' && (
                  <>
                    <Button 
                      onClick={() => handleStatusChange('approved')} 
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aprovar Cotação
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange('rejected')} 
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeitar Cotação
                    </Button>
                  </>
                )}

                {quote.status === 'approved' && (
                  <Button 
                    onClick={() => handleStatusChange('finalized')} 
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Finalizar Cotação
                  </Button>
                )}

                {/* Análise de Mercado - Simplified since items are not in Quote interface */}
                {proposals.length > 0 && 
                 ['receiving', 'received', 'under_review', 'approved', 'finalized'].includes(quote.status) && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowItemAnalysis(true)}
                    className="flex items-center gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analisar Mercado dos Itens
                  </Button>
                )}

                {/* Mensagem explicativa quando análise não está disponível */}
                {proposals.length === 0 && quote.status !== 'draft' && (
                  <Button 
                    variant="outline"
                    disabled
                    className="flex items-center gap-2 border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                    title="Aguardando propostas dos fornecedores para análise"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analisar Mercado dos Itens
                  </Button>
                )}
                
                {proposals.length >= 2 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowComparison(true)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Comparar Propostas
                  </Button>
                )}

                {bestCombination && (quote.status === 'receiving' || quote.status === 'received') && (
                  <Button 
                    onClick={handleApproveOptimal}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar Combinação Ótima
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="proposals" className="space-y-4">
              {/* Negociação IA */}
              {negotiation && (
                <div className="mb-6">
                  <AINegotiationCard 
                    negotiation={negotiation}
                    onStartNegotiation={startNegotiation}
                    onApproveNegotiation={approveNegotiation}
                    onRejectNegotiation={rejectNegotiation}
                  />
                </div>
              )}

              {isLoadingProposals ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <h3 className="text-lg font-semibold mb-2">Carregando Propostas</h3>
                    <p className="text-muted-foreground">
                      Buscando propostas dos fornecedores...
                    </p>
                  </CardContent>
                </Card>
              ) : proposals.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aguardando Propostas</h3>
                    <p className="text-muted-foreground">
                      As propostas dos fornecedores aparecerão aqui quando enviadas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{proposal.supplierName}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {proposal.reputation}/5 ⭐
                            </Badge>
                            <Badge>
                               R$ {proposal.totalPrice.toLocaleString('pt-BR', { 
                                 minimumFractionDigits: 2, 
                                 maximumFractionDigits: 2 
                               })}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                            <p className="font-semibold">{proposal.deliveryTime} dias</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Frete</p>
                            <p className="font-semibold">R$ {proposal.shippingCost.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">SLA</p>
                            <p className="font-semibold">{proposal.sla}h</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Garantia</p>
                            <p className="font-semibold">{proposal.warrantyMonths} meses</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-semibold">Itens:</h5>
                          {proposal.items.map((item) => (
                            <div key={item.productId} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-muted-foreground">
                                  {item.brand && `${item.brand} • `}
                                  Qtd: {item.quantity} • R$ {(item.unitPrice || 0).toFixed(2)}/un
                                </p>
                              </div>
                              <p className="font-semibold">R$ {(item.total || 0).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>

                        {proposal.observations && (
                          <div className="mt-4">
                            <h5 className="font-semibold">Observações:</h5>
                            <p className="text-sm text-muted-foreground mt-1">{proposal.observations}</p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-4">
                          Enviado em: {new Date(proposal.submittedAt).toLocaleString('pt-BR')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              {bestCombination ? (
                <div className="space-y-4">
                  {/* Economy Summary */}
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        Análise de Economia Inteligente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-green-600">Economia Total</p>
                          <p className="text-2xl font-bold text-green-800">
                            R$ {(bestCombination?.totalSavings || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-green-600">Percentual</p>
                          <p className="text-2xl font-bold text-green-800">
                            {(bestCombination?.savingsPercentage || 0).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-green-600">Custo Final</p>
                          <p className="text-2xl font-bold text-green-800">
                            R$ {(bestCombination?.totalCost || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-green-600">Fornecedores</p>
                          <p className="text-2xl font-bold text-green-800">
                            {bestCombination.uniqueSuppliers.length}
                          </p>
                        </div>
                      </div>

                      {bestCombination.isMultiSupplier && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800 font-medium">
                            💡 Recomendação: Compra Multi-fornecedor otimizada para máxima economia
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
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Análise Indisponível</h3>
                    <p className="text-muted-foreground">
                      Aguardando propostas dos fornecedores para realizar a análise inteligente.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico da Cotação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Cotação criada</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(quote.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {quote.status !== 'draft' && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">Enviada para fornecedores</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(quote.updated_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )}

                    {proposals.map((proposal) => (
                      <div key={proposal.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">Proposta recebida - {proposal.supplierName}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {(proposal.totalPrice || 0).toFixed(2)} • {new Date(proposal.submittedAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}

                    {quote.status === 'approved' && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium text-green-800">Cotação aprovada</p>
                          <p className="text-sm text-green-600">
                            Combinação ótima selecionada
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

      <QuoteComparison
        open={showComparison}
        onClose={() => setShowComparison(false)}
        proposals={proposals.map(p => ({
          id: p.id,
          quoteId: p.quoteId,
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          price: p.totalPrice,
          deliveryTime: p.deliveryTime,
          shippingCost: p.shippingCost,
          sla: p.sla,
          warrantyMonths: p.warrantyMonths,
          reputation: p.reputation,
          observations: p.observations,
          submittedAt: p.submittedAt,
        }))}
        quoteTitle={quote.title}
      />

      {/* Item Analysis Modal */}
      <ItemAnalysisModal
        open={showItemAnalysis}
        onClose={() => setShowItemAnalysis(false)}
        items={[
          {
            productName: 'Item de exemplo',
            category: 'Produtos Gerais',
            specifications: 'Especificações do produto',
            quantity: 1,
            supplierPrice: quote.total || 0
          }
        ]}
        title={`Análise de Mercado - ${quote?.title || 'Cotação'}`}
      />
    </>
  );
}