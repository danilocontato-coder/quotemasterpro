import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAINegotiation } from '@/hooks/useAINegotiation';
import { useSmartCombination } from '@/hooks/useSmartCombination';
import { AINegotiationCard } from '../quotes/AINegotiationCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, CheckCircle, XCircle, Clock, Users, DollarSign, TrendingDown, Package, Calendar, 
  MessageSquare, Download, Send, BarChart3, Brain, AlertTriangle, ShoppingCart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConsultantAnalysisCard } from '../quotes/ConsultantAnalysisCard';
import { ConsultantAnalysisModal } from '../quotes/ConsultantAnalysisModal';
import { useAdministradoraProposalConsultant } from '@/hooks/useAdministradoraProposalConsultant';
import { AIAnalysesTab } from '../quotes/AIAnalysesTab';
import { ItemAnalysisModal } from '../quotes/ItemAnalysisModal';
import { QuoteItemsList } from '../quotes/QuoteItemsList';
import { VisitSection } from '../quotes/VisitSection';
import { VisitsTab } from '../quotes/VisitsTab';
import { SupplierStatusCard } from '../quotes/SupplierStatusCard';
import { ProposalComparisonTable } from '../quotes/ProposalComparisonTable';
import { ProposalDashboardMetrics } from '../quotes/ProposalDashboardMetrics';
import { DecisionMatrixWidget } from '../quotes/DecisionMatrixWidget';
import { SendQuoteToSuppliersModal } from '../quotes/SendQuoteToSuppliersModal';
import { getStatusText } from "@/utils/statusUtils";
import { formatLocalDateTime, formatLocalDate, formatRelativeTime } from "@/utils/dateUtils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdministradoraQuoteDetail } from '@/types/administradoraQuotes';

export interface QuoteProposal {
  id: string;
  quoteId: string;
  supplierId: string;
  supplierName: string;
  items: ProposalItem[];
  totalPrice: number;
  price: number;
  deliveryTime: number;
  shippingCost: number;
  deliveryScore: number;
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

interface AdministradoraQuoteDetailModalProps {
  open: boolean;
  onClose: () => void;
  quote: AdministradoraQuoteDetail | null;
  onStatusChange?: (quoteId: string, newStatus: string) => void;
  onApprove?: (proposal: QuoteProposal) => void;
  defaultTab?: string;
}

export interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total?: number;
}

export const AdministradoraQuoteDetailModal: React.FC<AdministradoraQuoteDetailModalProps> = ({
  open,
  onClose,
  quote,
  onStatusChange,
  onApprove,
  defaultTab = "overview"
}) => {
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConsultantAnalysis, setShowConsultantAnalysis] = useState(false);
  const [showItemAnalysis, setShowItemAnalysis] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [manualOverride, setManualOverride] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { getNegotiationByQuoteId, startAnalysis, startNegotiation, approveNegotiation, rejectNegotiation } = useAINegotiation();
  const { calculateBestCombination } = useSmartCombination();
  const { analyzeIndividual, analyzeComparative, isAnalyzing } = useAdministradoraProposalConsultant(quote?.client_id || '');

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // Transform proposals from quote data
  useEffect(() => {
    if (!quote) return;

    const transformedProposals: QuoteProposal[] = (quote.proposals || []).map(p => {
      // ✅ USAR ITENS DA PROPOSTA (p.items), não da cotação (quote.items)
      const proposalItems = Array.isArray(p.items) ? p.items : [];
      
      // 💰 Calcular soma dos itens e total normalizado
      const itemsSum = proposalItems.reduce((s: number, it: any) => 
        s + (it.total ?? (it.quantity * (it.unit_price ?? 0))), 0
      );
      const shipping = Number(p.shipping_cost ?? 0);
      const dbTotal = Number(p.total_amount ?? 0);
      const computedWithShipping = itemsSum + shipping;
      const normalizedTotal = Math.abs(dbTotal - computedWithShipping) <= 0.01 ? dbTotal : computedWithShipping;

      console.log('💰 [TOTAL-NORMALIZE]', { 
        supplier: p.supplier_name, 
        itemsSum, 
        shipping, 
        dbTotal, 
        computedWithShipping, 
        used: normalizedTotal 
      });
      console.log('🛡️ [WARRANTY]', { 
        supplier: p.supplier_name, 
        value: p.warranty_months 
      });
      
      return {
        id: p.id,
        quoteId: quote.id,
        supplierId: p.supplier_id,
        supplierName: p.supplier_name,
        items: proposalItems.map((responseItem: any) => ({
          productId: responseItem.product_name, // Use product_name as ID if no specific ID
          productName: responseItem.product_name,
          quantity: responseItem.quantity,
          unitPrice: responseItem.unit_price || 0, // ✅ Preço da PROPOSTA
          total: responseItem.total || (responseItem.quantity * (responseItem.unit_price || 0)),
          brand: responseItem.brand || 'N/A',
          specifications: responseItem.specifications || ''
        })),
        totalPrice: normalizedTotal,
        price: normalizedTotal,
        deliveryTime: p.delivery_time,
        shippingCost: shipping,
        deliveryScore: 50,
        warrantyMonths: p.warranty_months ?? 12,
        reputation: 3.0,
        observations: p.notes || '',
        submittedAt: p.created_at,
        status: 'pending'
      };
    });

    setProposals(transformedProposals);
  }, [quote]);

  const negotiation = quote ? getNegotiationByQuoteId(quote.id) : null;

  const isDeadlineExpired = useMemo(() => {
    if (!quote?.deadline) return false;
    return new Date(quote.deadline) < new Date();
  }, [quote?.deadline]);

  const shouldShowMatrix = useMemo(() => {
    const totalInvited = quote?.responses_count || 0;
    
    if (totalInvited === 1 || proposals.length === 1) return false;
    if (proposals.length < 2) return false;
    if (proposals.length === totalInvited) return true;
    if (isDeadlineExpired) return true;
    if (manualOverride) return true;
    
    return false;
  }, [proposals.length, quote?.responses_count, isDeadlineExpired, manualOverride]);

  const bestCombination = useMemo(() => {
    if (proposals.length === 0) return null;
    return calculateBestCombination(proposals);
  }, [proposals, calculateBestCombination]);

  const handleStatusChange = (newStatus: string) => {
    if (!quote) return;
    
    onStatusChange?.(quote.id, newStatus);
    toast({
      title: "Status atualizado!",
      description: `Cotação ${quote.local_code} alterada para ${getStatusText(newStatus)}.`,
    });
  };

  const handleSendToSuppliers = () => {
    setShowSendModal(true);
  };

  const handleApproveOptimal = () => {
    if (!bestCombination) return;
    
    toast({
      title: "Combinação aprovada!",
      description: "A melhor combinação de fornecedores foi aprovada.",
    });
  };

  const runAIAnalysis = async () => {
    if (!quote || proposals.length === 0) {
      toast({
        title: 'Não há propostas',
        description: 'Aguarde o recebimento de propostas para analisar.',
        variant: 'destructive'
      });
      return;
    }

    // Análise individual de cada proposta
    for (const proposal of proposals) {
      await analyzeIndividual(proposal.id);
    }

    // Análise comparativa
    if (proposals.length >= 2) {
      await analyzeComparative(proposals.map(p => p.id));
    }

    setShowConsultantAnalysis(true);
  };

  const handleResendInvite = async (supplierId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-quote-to-suppliers', {
        body: { 
          quoteId: quote?.id, 
          supplierIds: [supplierId]
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Convite reenviado!",
        description: "O fornecedor receberá um novo link por WhatsApp.",
      });
    } catch (error) {
      console.error('Error resending invite:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reenviar o convite.",
        variant: "destructive"
      });
    }
  };

  const handleSendWhatsApp = (supplier: { name: string; whatsapp?: string }) => {
    if (!supplier.whatsapp) {
      toast({
        title: "WhatsApp não disponível",
        description: `${supplier.name} não possui WhatsApp cadastrado.`,
        variant: "destructive"
      });
      return;
    }
    
    const message = encodeURIComponent(
      `Olá ${supplier.name}, gostaria de conversar sobre a cotação ${quote?.local_code} - ${quote?.title}. Podemos negociar?`
    );
    
    const whatsappNumber = supplier.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${whatsappNumber}?text=${message}`, '_blank');
  };

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
                  #{quote.local_code} • {quote.on_behalf_of_client_name || quote.client_name}
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${quote.requires_visit ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="proposals">
                Propostas ({proposals.length})
              </TabsTrigger>
              <TabsTrigger value="analysis">🧩 Combinação Inteligente</TabsTrigger>
              {quote.requires_visit && (
                <TabsTrigger value="visits">
                  <Calendar className="h-4 w-4 mr-1" />
                  Visitas
                </TabsTrigger>
              )}
              <TabsTrigger value="ai-history" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Análises IA
                {quote.analyses && quote.analyses.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{quote.analyses.length}</Badge>
                )}
              </TabsTrigger>
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
                      <p className="text-2xl font-bold text-blue-900">{quote.items_count}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Propostas Recebidas</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{proposals.length}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Prazo</span>
                      </div>
                      <p className="text-sm font-bold text-purple-900">
                        {quote.deadline ? formatLocalDate(quote.deadline) : 'Não definido'}
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
              <QuoteItemsList quoteId={quote.id} />

              {/* Visit Section */}
              {quote.requires_visit && user && (
                <VisitSection 
                  quote={quote} 
                  userRole={user.role || 'administradora'} 
                  onVisitUpdate={() => {}}
                />
              )}

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

                    <Button
                      variant="outline"
                      onClick={() => setShowItemAnalysis(true)}
                      disabled={proposals.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      🧩 Combinação Inteligente
                    </Button>

                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proposals" className="space-y-6">
              {/* Dashboard Metrics */}
              {proposals.length > 0 && (
                <ProposalDashboardMetrics
                  totalProposals={proposals.length}
                  bestPrice={Math.min(...proposals.map(p => p.totalPrice))}
                  averageDeliveryTime={proposals.reduce((sum, p) => sum + p.deliveryTime, 0) / proposals.length}
                  potentialSavings={Math.max(...proposals.map(p => p.totalPrice)) - Math.min(...proposals.map(p => p.totalPrice))}
                />
              )}

              {/* Decision Matrix Widget */}
              {shouldShowMatrix && (
                <DecisionMatrixWidget
                  proposals={proposals}
                  quoteItems={quote.items}
                  quoteId={quote.id}
                  quoteName={quote.title}
                  defaultOpen={true}
                  onApprove={onApprove}
                  quoteStatus={quote.status}
                />
              )}

              {/* Proposal Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparação de Propostas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProposalComparisonTable proposals={proposals} quoteItems={quote.items} />
                </CardContent>
              </Card>

              {/* AI Analysis Button */}
              {proposals.length >= 2 && (
                <div className="flex justify-center">
                  <Button 
                    size="lg"
                    onClick={runAIAnalysis}
                    disabled={isAnalyzing}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Brain className="h-5 w-5 mr-2" />
                    {isAnalyzing ? 'Analisando com IA...' : 'Analisar Propostas com IA'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {bestCombination && bestCombination.items.length > 0 ? (
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      🧩 Combinação Inteligente - Melhor Preço por Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">Economia Total</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {bestCombination.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          {bestCombination.savingsPercentage.toFixed(1)}% de economia
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Custo Otimizado</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          R$ {bestCombination.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">Fornecedores</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">
                          {bestCombination.uniqueSuppliers}
                        </p>
                        <p className="text-xs text-purple-700 mt-1">
                          {bestCombination.isMultiSupplier ? 'Múltiplos fornecedores' : 'Fornecedor único'}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleApproveOptimal}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar Combinação Otimizada
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Combinação Inteligente não disponível</h3>
                    <p className="text-sm text-muted-foreground">
                      Aguarde o recebimento de pelo menos 2 propostas para calcular a melhor combinação.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {quote.requires_visit && (
              <TabsContent value="visits" className="space-y-6">
                <VisitsTab 
                  quoteId={quote.id} 
                  totalSuppliers={quote.responses_count || proposals.length || 0}
                />
              </TabsContent>
            )}

            <TabsContent value="ai-history" className="space-y-6">
              <AIAnalysesTab 
                quoteId={quote.id} 
                onReanalyze={runAIAnalysis}
              />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium">Cotação criada</p>
                        <p className="text-sm text-muted-foreground">
                          {formatLocalDateTime(quote.created_at)}
                        </p>
                      </div>
                    </div>
                    {proposals.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="font-medium">Proposta recebida de {p.supplierName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatLocalDateTime(p.submittedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Item Analysis Modal */}
      {showItemAnalysis && bestCombination && (
        <ItemAnalysisModal
          open={showItemAnalysis}
          onClose={() => setShowItemAnalysis(false)}
          items={bestCombination.items.map(item => ({
            id: item.itemId,
            productId: item.itemId,
            productName: item.itemName, // SmartCombinationItem usa 'itemName'
            quantity: item.quantity,
            category: 'product',
            bestProposal: {
              supplierId: item.bestSupplierId,
              supplierName: item.bestSupplierName,
              item: {
                unitPrice: item.bestPrice,
                brand: undefined
              },
              reputation: 0,
              deliveryTime: 0
            },
            allProposals: [
              {
                supplierId: item.bestSupplierId,
                supplierName: item.bestSupplierName,
                item: {
                  unitPrice: item.bestPrice
                },
                reputation: 0
              },
              ...item.otherOptions.map(opt => ({
                supplierId: opt.supplierId,
                supplierName: opt.supplierName,
                item: {
                  unitPrice: opt.unitPrice
                },
                reputation: 0
              }))
            ],
            savings: item.savings / item.quantity
          }))}
          title="🧩 Análise Inteligente - Melhores Preços por Item"
        />
      )}

      {/* Modal de Envio para Fornecedores */}
      <SendQuoteToSuppliersModal 
        quote={quote}
        open={showSendModal}
        onOpenChange={setShowSendModal}
        onSuccess={() => {
          setShowSendModal(false);
          handleStatusChange('sent');
          toast({
            title: "Cotação enviada!",
            description: "A cotação foi enviada com sucesso para os fornecedores.",
          });
        }}
      />
    </>
  );
};
