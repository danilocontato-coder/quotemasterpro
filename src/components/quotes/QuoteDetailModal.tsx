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
  Brain,
  User,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { Quote } from '@/hooks/useSupabaseQuotes';
import { useToast } from '@/hooks/use-toast';
import { ConsultantAnalysisCard } from './ConsultantAnalysisCard';
import { ConsultantAnalysisModal } from './ConsultantAnalysisModal';
import { useProposalConsultant } from '@/hooks/useProposalConsultant';
import type { ProposalForAnalysis } from '@/services/ProposalConsultantService';
import { AIAnalysesTab } from './AIAnalysesTab';
import { ItemAnalysisModal } from './ItemAnalysisModal';
// QuoteMarkAsReceivedButton removido - marcação automática implementada
import { QuoteItemsList } from './QuoteItemsList';
import { VisitSection } from './VisitSection';
import { VisitsTab } from './VisitsTab';
import { SupplierStatusCard } from './SupplierStatusCard';
import { ProposalComparisonTable } from './ProposalComparisonTable';
import { ProposalDashboardMetrics } from './ProposalDashboardMetrics';
// ProposalRecommendationBadge removido - usar apenas DecisionMatrixWidget
import { DecisionMatrixWidget } from './DecisionMatrixWidget';
import { getStatusText } from "@/utils/statusUtils";
import { formatLocalDateTime, formatLocalDate, formatRelativeTime } from "@/utils/dateUtils";
import { ItemAnalysisData } from '@/hooks/useItemAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { AuditLog } from '@/hooks/useAuditLogs';
import { useAuth } from '@/contexts/AuthContext';

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
  deliveryScore: number; // Substitui sla
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
  defaultTab?: string;
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
  onApprove,
  defaultTab = "overview"
}) => {
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConsultantAnalysis, setShowConsultantAnalysis] = useState(false);
  const { 
    individualAnalyses, 
    comparativeAnalysis, 
    isAnalyzing,
    analysisProgress,
    analyzeAllProposals,
    clearAnalyses,
    loadSavedAnalyses,
    hasAnalyses
  } = useProposalConsultant();

  const [analysesCount, setAnalysesCount] = useState(0);
  const [hasAnalysesHistory, setHasAnalysesHistory] = useState(false);
  const [showItemAnalysis, setShowItemAnalysis] = useState(false);
  const [itemAnalysisData, setItemAnalysisData] = useState<ItemAnalysisData[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [supplierNames, setSupplierNames] = useState<{ id: string; name: string; phone?: string; whatsapp?: string; status?: string }[]>([]);
  const [totalInvited, setTotalInvited] = useState<number>(0);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [manualOverride, setManualOverride] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { getNegotiationByQuoteId, startAnalysis, startNegotiation, approveNegotiation, rejectNegotiation } = useAINegotiation();

  // Reset activeTab when modal opens or defaultTab changes
  React.useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

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
        shippingCost: response.shipping_cost || 0,
        deliveryScore: 50, // TODO: calcular do histórico com calculateDeliveryScore
        warrantyMonths: response.warranty_months || 12,
        reputation: 3.0,
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

  // Fetch audit logs for this quote
  const fetchAuditLogs = useCallback(async () => {
    if (!quote?.id) {
      console.log('❌ No quote ID, skipping audit logs fetch');
      return;
    }
    
    try {
      console.log('🔍 Starting fetchAuditLogs for quote:', quote.id);
      console.log('🔍 Making Supabase query...');
      
      const { data, error, count } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          created_at,
          details,
          user_id,
          profiles:user_id (
            name,
            email
          )
        `, { count: 'exact' })
        .eq('entity_id', quote.id)
        .eq('entity_type', 'quotes')
        .order('created_at', { ascending: false });
      
      console.log('🔍 Supabase response:', { data, error, count });
      
      if (error) {
        console.error('❌ Error fetching audit logs:', error);
        return;
      }
      
      console.log('✅ Audit logs raw data:', data);
      console.log('✅ Total audit logs found:', count);
      
      const formattedLogs: AuditLog[] = (data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        panel_type: null,
        details: log.details,
        created_at: log.created_at,
        user_id: log.user_id,
        user_name: log.profiles?.name || 'Sistema',
        user_email: log.profiles?.email || null,
        user_role: null,
      }));
      
      console.log('✅ Formatted audit logs:', formattedLogs);
      setAuditLogs(formattedLogs);
    } catch (error) {
      console.error('❌ Exception fetching audit logs:', error);
    }
  }, [quote?.id]);

  const fetchSupplierNames = useCallback(async () => {
    if (!quote?.id) {
      setSupplierNames([]);
      return;
    }

    try {
      const { data: qsRows, error: qsError } = await supabase
        .from('quote_suppliers')
        .select('supplier_id')
        .eq('quote_id', quote.id);
      
      if (qsError) console.error('quote_suppliers SELECT error:', qsError);
      const idsFromQS = (qsRows || []).map((r: any) => r.supplier_id).filter(Boolean);

      const idsFromSelected = Array.isArray((quote as any).selected_supplier_ids)
        ? (quote as any).selected_supplier_ids.filter(Boolean)
        : [];

      const { data: respRows, error: respError } = await supabase
        .from('quote_responses')
        .select('supplier_id, supplier_name')
        .eq('quote_id', quote.id);
      
      if (respError) console.error('quote_responses SELECT error:', respError);
      const idsFromResponses = (respRows || []).map((r: any) => r.supplier_id).filter(Boolean);

      const allIds = Array.from(new Set<string>([...idsFromQS, ...idsFromSelected, ...idsFromResponses]));

      const invitedIds = idsFromQS.length > 0 ? idsFromQS : allIds;
      setTotalInvited(idsFromQS.length > 0 ? idsFromQS.length : (quote?.suppliers_sent_count || invitedIds.length));

      let suppliersData: any[] = [];
      if (invitedIds.length > 0) {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name, status, phone, whatsapp')
          .in('id', invitedIds);
        if (!error && data) suppliersData = data;
        else console.error('suppliers SELECT error:', error);
      }

      const suppliersMap = new Map((suppliersData || []).map((s: any) => [s.id, s]));
      const respNameMap = new Map((respRows || []).map((r: any) => [r.supplier_id, r.supplier_name]));

      const finalList = invitedIds.map((id: string) => {
        const s = suppliersMap.get(id);
        if (s) {
          return { id: s.id, name: s.name, status: s.status, phone: s.phone, whatsapp: s.whatsapp };
        }
        return { id, name: respNameMap.get(id) || 'Fornecedor convidado', status: 'invited' as const };
      });

      console.log('✅ Fornecedores (com preenchimento):', {
        totalConvites: invitedIds.length,
        invitedIds,
        encontradosSuppliers: suppliersData.length,
        finalList,
      });

      setSupplierNames(finalList);
    } catch (error) {
      console.error('Error fetching supplier names (merged flow):', error);
    }
  }, [quote?.id, (quote as any)?.selected_supplier_ids]);

  useEffect(() => {
    console.log('🔄 QuoteDetailModal useEffect - open:', open, 'quote?.id:', quote?.id);
    if (open && quote?.id) {
      console.log('✅ Calling fetchQuoteItems, fetchAuditLogs, fetchSupplierNames, and loadSavedAnalyses');
      fetchQuoteItems();
      fetchAuditLogs();
      fetchSupplierNames();
      loadSavedAnalyses(quote.id);
      
      // Verificar se há análises salvas
      supabase
        .from('ai_proposal_analyses')
        .select('id', { count: 'exact' })
        .eq('quote_id', quote.id)
        .then(({ count }) => {
          setAnalysesCount(count || 0);
          setHasAnalysesHistory((count || 0) > 0);
        });
    }
  }, [open, quote?.id, proposals.length, fetchQuoteItems, fetchAuditLogs, fetchSupplierNames, loadSavedAnalyses]);

  useEffect(() => {
    if (quoteItems.length > 0) {
      fetchProposals();
    }
  }, [quoteItems, fetchProposals]);

  // Log audit logs for debugging
  useEffect(() => {
    console.log('🔍 Audit logs state:', { 
      auditLogsLength: auditLogs.length, 
      auditLogs, 
      quoteId: quote?.id 
    });
  }, [auditLogs, quote?.id]);

  // Auto-marcar como recebida quando visualizar propostas
  const autoMarkAsReceived = useCallback(async () => {
    if (!quote?.id || quote.status !== 'receiving' || proposals.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'received' })
        .eq('id', quote.id);

      if (error) {
        console.error('❌ Erro ao marcar como recebida:', error);
        return;
      }

      // Atualização silenciosa - sem toast
      if (onStatusChange) {
        onStatusChange(quote.id, 'received');
      }
    } catch (error) {
      console.error('❌ Erro ao marcar como recebida:', error);
    }
  }, [quote?.id, quote?.status, proposals.length, onStatusChange]);

  // Trigger auto-marcação quando abrir modal com propostas
  useEffect(() => {
    if (open && proposals.length > 0 && quote?.status === 'receiving') {
      const timer = setTimeout(() => {
        autoMarkAsReceived();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [open, proposals.length, quote?.status, autoMarkAsReceived]);

  const negotiation = quote ? getNegotiationByQuoteId(quote.id) : null;

  // Verifica se o prazo da cotação expirou
  const isDeadlineExpired = useMemo(() => {
    if (!quote?.deadline) return false;
    return new Date(quote.deadline) < new Date();
  }, [quote?.deadline]);

  // Lógica híbrida para exibir a Matriz de Decisão
  const shouldShowMatrix = useMemo(() => {
    // Cotação única (1 fornecedor) -> NUNCA mostra matriz
    if (totalInvited === 1 || supplierNames.length === 1) {
      return false;
    }

    // Precisa de pelo menos 2 propostas
    if (proposals.length < 2) {
      return false;
    }

    // CENÁRIO 1: Todos os fornecedores responderam
    if (supplierNames.length > 0 && proposals.length === supplierNames.length) {
      return true;
    }

    // CENÁRIO 2: Prazo expirou
    if (isDeadlineExpired) {
      return true;
    }

    // CENÁRIO 3: Cliente forçou manualmente
    if (manualOverride) {
      return true;
    }

    return false;
  }, [proposals.length, supplierNames.length, totalInvited, isDeadlineExpired, manualOverride]);

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

  const runAIAnalysis = async () => {
    if (!quote || proposals.length === 0) {
      toast({
        title: 'Não há propostas',
        description: 'Aguarde o recebimento de propostas para analisar.',
        variant: 'destructive'
      });
      return;
    }

    const proposalsForAnalysis: ProposalForAnalysis[] = proposals.map(p => ({
      id: p.id,
      quoteId: quote.id,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      items: p.items.map(item => ({
        productName: item.productName,
        brand: item.brand,
        specifications: item.specifications,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      totalAmount: p.totalPrice,
      deliveryTime: `${p.deliveryTime} dias`,
      warranty: `${p.warrantyMonths} meses`,
      paymentTerms: 'Não especificado'
    }));

    await analyzeAllProposals(proposalsForAnalysis);
  };

  const handleResendInvite = async (supplierId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-quote-to-suppliers', {
        body: { 
          quoteId: quote.id, 
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
      `Olá ${supplier.name}, gostaria de conversar sobre a cotação ${quote.local_code} - ${quote.title}. Podemos negociar?`
    );
    
    const whatsappNumber = supplier.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${whatsappNumber}?text=${message}`, '_blank');
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
                  #{quote.local_code} • Empresa: {quote.client_name}
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

            {/* Aviso quando cotação está aguardando aprovação */}
            {quote.status === 'pending_approval' && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-semibold">Aguardando Aprovação Formal</p>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  A proposta do fornecedor <strong>{quote.supplier_name}</strong> foi selecionada e está aguardando aprovação. 
                  Não é possível fazer alterações nesta cotação até que seja aprovada ou rejeitada.
                </p>
              </div>
            )}
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
                {hasAnalysesHistory && (
                  <Badge variant="secondary" className="ml-1 text-xs">{analysesCount}</Badge>
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
                      <p className="text-2xl font-bold text-blue-900">{quoteItems.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Fornecedores Participantes</span>
                      </div>
                      
                      {supplierNames.length > 0 ? (
                        <>
                          <p className="text-2xl font-bold text-green-900">{supplierNames.length}</p>
                          
                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {supplierNames.map(supplier => (
                              <div key={supplier.id} className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                <span className="text-xs text-green-800 truncate">{supplier.name}</span>
                              </div>
                            ))}
                          </div>
                          
                          <Separator className="my-2" />
                          <p className="text-xs text-green-700">
                            Propostas recebidas: {proposals.length}/{supplierNames.length}
                          </p>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-yellow-900">Nenhum fornecedor selecionado</p>
                              <p className="text-xs text-yellow-700 mt-1">
                                {proposals.length > 0 
                                  ? `${proposals.length} proposta(s) recebida(s) via link direto`
                                  : 'É necessário selecionar fornecedores para enviar esta cotação.'}
                              </p>
                            </div>
                          </div>
                          
                          {quote.status === 'draft' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                onClose();
                                window.location.href = `/quotes/edit/${quote.id}`;
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Selecionar Fornecedores
                            </Button>
                          )}
                        </div>
                      )}
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
              <Card>
                <CardHeader>
                  <CardTitle>Itens da Cotação</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuoteItemsList quoteId={quote.id} />
                </CardContent>
              </Card>

              {/* Visit Section */}
              {quote.requires_visit && user && (
                <VisitSection 
                  quote={quote} 
                  userRole={user.role || 'collaborator'} 
                  onVisitUpdate={() => {
                    fetchAuditLogs();
                  }}
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
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      🧩 Combinação Inteligente
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
              {/* Dashboard Metrics */}
              {proposals.length > 0 && (
                <ProposalDashboardMetrics
                  totalProposals={proposals.length}
                  bestPrice={Math.min(...proposals.map(p => p.totalPrice))}
                  averageDeliveryTime={proposals.reduce((sum, p) => sum + p.deliveryTime, 0) / proposals.length}
                  potentialSavings={Math.max(...proposals.map(p => p.totalPrice)) - Math.min(...proposals.map(p => p.totalPrice))}
                />
              )}

              {/* Alert quando há 2+ propostas mas matriz ainda não deve aparecer */}
              {proposals.length >= 2 && !shouldShowMatrix && totalInvited > 1 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          Aguardando {supplierNames.length - proposals.length} fornecedor(es)
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          {quote.deadline 
                            ? `A Matriz de Decisão aparecerá automaticamente quando o prazo (${formatLocalDate(quote.deadline)}) expirar ou todos responderem.`
                            : 'A Matriz de Decisão aparecerá quando todos os fornecedores responderem.'}
                        </p>
                        <p className="text-xs text-blue-600 mb-3">
                          Você já pode prosseguir com as {proposals.length} propostas atuais se não quiser aguardar.
                        </p>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setManualOverride(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Prosseguir com Propostas Atuais
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Decision Matrix Widget */}
              {shouldShowMatrix && (
                <DecisionMatrixWidget
                  proposals={proposals}
                  quoteId={quote.id}
                  quoteName={quote.title}
                  defaultOpen={true}
                  onApprove={onApprove}
                />
              )}

              {/* AI Consultant Analysis Button */}
              {proposals.length >= 2 && !hasAnalyses && (
                <div className="flex justify-center">
                  <Button 
                    size="lg"
                    onClick={() => analyzeAllProposals(proposals.map(p => ({
                      id: p.id,
                      quoteId: quote.id,
                      supplierId: p.supplierId,
                      supplierName: p.supplierName,
                      items: p.items.map(item => ({
                        productName: item.productName,
                        brand: item.brand,
                        specifications: item.specifications,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                      })),
                      totalAmount: p.totalPrice,
                      deliveryTime: `${p.deliveryTime} dias`,
                      warranty: `${p.warrantyMonths} meses`,
                      paymentTerms: 'Não especificado'
                    })))}
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                  >
                    <Brain className="h-5 w-5 mr-2" />
                    {isAnalyzing ? `Analisando... (${analysisProgress.current}/${analysisProgress.total})` : '🧠 Análise Completa do Consultor IA'}
                  </Button>
                </div>
              )}

              {/* Consultant Analysis Card */}
              {hasAnalyses && comparativeAnalysis && (
                <ConsultantAnalysisCard
                  analysis={comparativeAnalysis}
                  proposals={proposals}
                  onViewDetails={() => setShowConsultantAnalysis(true)}
                />
              )}

              {/* Comparação Rápida removida - agora está na tab "Combinação Inteligente" */}

              {/* Status de fornecedores que não responderam */}
              {supplierNames.length > proposals.length && (
                <div className="mt-6">
                  <h4 className="font-semibold text-base mb-3 text-muted-foreground">
                    Aguardando Resposta ({supplierNames.length - proposals.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supplierNames
                      .filter(supplier => !proposals.find(p => p.supplierId === supplier.id))
                      .map(supplier => (
                        <SupplierStatusCard
                          key={supplier.id}
                          supplier={supplier}
                          hasResponded={false}
                          proposal={undefined}
                          onResendInvite={() => handleResendInvite(supplier.id)}
                          onSendWhatsApp={() => handleSendWhatsApp(supplier)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {proposals.length === 0 && supplierNames.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum fornecedor selecionado</h3>
                  <p className="text-muted-foreground">
                    Envie esta cotação para fornecedores para começar a receber propostas.
                  </p>
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
                      <Package className="h-5 w-5" />
                      🧩 Combinação Inteligente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhuma análise foi iniciada ainda. Clique abaixo para iniciar a otimização que encontra o melhor preço por item.
                    </p>
                    <Button onClick={() => startAnalysis(quote.id)} className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Executar Combinação Inteligente
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Smart Combination Analysis */}
              {bestCombination && (
                <>
                  <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <Package className="h-5 w-5" />
                        🧩 Combinação Inteligente - Melhores Preços
                      </CardTitle>
                      <p className="text-sm text-green-700 mt-2">
                        💡 <strong>Monte a compra ideal:</strong> Veja quanto você economiza comprando cada item do fornecedor 
                        que oferece o melhor preço, mesmo que isso signifique comprar de múltiplos fornecedores.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">💰 Economia Total</p>
                          <p className="text-2xl font-bold text-green-600">
                            R$ {bestCombination.totalSavings.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">📊 Percentual</p>
                          <p className="text-2xl font-bold text-green-600">
                            {bestCombination.savingsPercentage.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">💵 Custo Otimizado</p>
                          <p className="text-2xl font-bold text-blue-600">
                            R$ {bestCombination.totalCost.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">🏪 Fornecedores</p>
                          <p className="text-2xl font-bold">
                            {bestCombination.uniqueSuppliers.length}
                          </p>
                        </div>
                      </div>
                      
                      {bestCombination.isMultiSupplier && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-yellow-900">
                                ⚠️ Estratégia Multi-fornecedor Detectada
                              </p>
                              <p className="text-sm text-yellow-800">
                                Comprar de <strong>{bestCombination.uniqueSuppliers.length} fornecedores diferentes</strong> pode 
                                gerar múltiplos fretes e complexidade logística. Considere:
                              </p>
                              <ul className="text-sm text-yellow-800 space-y-1 ml-4">
                                <li>• Negociar frete grátis com os fornecedores</li>
                                <li>• Verificar se a economia compensa os custos adicionais</li>
                                <li>• Consultar a análise do <strong>Consultor IA</strong> para uma visão mais completa</li>
                              </ul>
                            </div>
                          </div>
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

            {/* AI Analyses History Tab */}
            <TabsContent value="ai-history" className="space-y-6">
              <AIAnalysesTab 
                quoteId={quote.id}
                onReanalyze={() => {
                  analyzeAllProposals(proposals.map(p => ({
                    id: p.id,
                    quoteId: quote.id,
                    supplierId: p.supplierId,
                    supplierName: p.supplierName,
                    items: p.items.map(item => ({
                      productName: item.productName,
                      brand: item.brand,
                      specifications: item.specifications,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice
                    })),
                    totalAmount: p.totalPrice,
                    deliveryTime: `${p.deliveryTime} dias`,
                    warranty: `${p.warrantyMonths} meses`,
                    paymentTerms: 'Não especificado'
                  })));
                }}
              />
            </TabsContent>

            {/* Visits Tab */}
            {quote.requires_visit && (
              <TabsContent value="visits" className="space-y-6">
                <VisitsTab 
                  quoteId={quote.id} 
                  totalSuppliers={Math.max(quote.suppliers_sent_count || 0, quote.selected_supplier_ids?.length || 0)}
                />
              </TabsContent>
            )}

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border">
                          <div className="bg-primary/10 p-2 rounded-full">
                            {log.action.includes('CREATE') ? (
                              <Send className="h-4 w-4 text-primary" />
                            ) : log.action.includes('UPDATE') ? (
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Criado por: <span className="font-medium">{log.user_name}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                {formatLocalDateTime(log.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nenhuma atividade registrada ainda</p>
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
      <ConsultantAnalysisModal
        open={showConsultantAnalysis}
        onClose={() => setShowConsultantAnalysis(false)}
        comparativeAnalysis={comparativeAnalysis}
        individualAnalyses={individualAnalyses}
        proposals={proposals}
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