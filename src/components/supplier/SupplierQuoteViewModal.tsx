import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Calendar, MapPin, Clock, Package, FileText, MessageSquare, Send, Plus, Check } from 'lucide-react';
import { SupplierQuote } from '@/hooks/useSupabaseSupplierQuotes';
import { useQuoteVisits } from '@/hooks/useQuoteVisits';
import { VisitTimeline } from '@/components/quotes/VisitTimeline';
import { VisitManagementModal } from '@/components/supplier/VisitManagementModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatLocalDateTime } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseSupplierQuotes } from '@/hooks/useSupabaseSupplierQuotes';

interface SupplierQuoteViewModalProps {
  quote: SupplierQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProposalSent?: () => void;
}

interface ProposalItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  brand: string;
  specifications: string;
}

export function SupplierQuoteViewModal({ quote, open, onOpenChange, onProposalSent }: SupplierQuoteViewModalProps) {
  const { visits, fetchVisits } = useQuoteVisits(quote?.id);
  const { user } = useAuth();
  const { submitQuoteResponse } = useSupabaseSupplierQuotes();
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  // Proposta
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [deliveryTime, setDeliveryTime] = useState(7);
  const [paymentTerms, setPaymentTerms] = useState('30 dias');
  const [shippingCost, setShippingCost] = useState(0);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [observations, setObservations] = useState('');
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [existingResponse, setExistingResponse] = useState<any | null>(null);

  // Mensagens
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    if (open && quote) {
      loadQuoteItems();
      loadExistingResponse();
      initConversation();
      fetchVisits();
    }
  }, [open, quote]);

  const loadQuoteItems = async () => {
    if (!quote) return;
    
    setIsLoadingItems(true);
    try {
      const { data: items, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id);

      if (error) throw error;
      setQuoteItems(items || []);
      
      // Inicializar items da proposta
      if (items && items.length > 0 && proposalItems.length === 0) {
        const initialItems = items.map(item => ({
          id: item.id,
          productName: item.product_name,
          description: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price || 0,
          total: (item.unit_price || 0) * item.quantity,
          brand: '',
          specifications: '',
        }));
        setProposalItems(initialItems);
      }
    } catch (error) {
      console.error('Error loading quote items:', error);
      toast.error('Erro ao carregar itens da cotação');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const loadExistingResponse = async () => {
    if (!quote || !user?.supplierId) return;
    
    try {
      // Primeiro buscar proposta já enviada (não-draft)
      const { data: sentResponse } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('quote_id', quote.id)
        .eq('supplier_id', user.supplierId)
        .neq('status', 'draft')
        .maybeSingle();

      if (sentResponse) {
        // Proposta já foi enviada - modo leitura
        setExistingResponse(sentResponse);
        setDeliveryTime(sentResponse.delivery_time || 7);
        setPaymentTerms(sentResponse.payment_terms || '30 dias');
        setShippingCost(sentResponse.shipping_cost || 0);
        setWarrantyMonths(sentResponse.warranty_months || 12);
        setObservations(sentResponse.notes || '');
        
        if (Array.isArray(sentResponse.items)) {
          const responseItems = sentResponse.items.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            productName: item.product_name || '',
            description: item.product_name || '',
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || 0,
            total: item.total || 0,
            brand: '',
            specifications: item.notes || '',
          }));
          setProposalItems(responseItems);
        }
      } else {
        // Não há proposta enviada, buscar rascunho
        const { data: existingDraft } = await supabase
          .from('quote_responses')
          .select('*')
          .eq('quote_id', quote.id)
          .eq('supplier_id', user.supplierId)
          .eq('status', 'draft')
          .maybeSingle();

        if (existingDraft) {
          setDeliveryTime(existingDraft.delivery_time || 7);
          setPaymentTerms(existingDraft.payment_terms || '30 dias');
          setShippingCost(existingDraft.shipping_cost || 0);
          setWarrantyMonths(existingDraft.warranty_months || 12);
          setObservations(existingDraft.notes || '');
          
          if (Array.isArray(existingDraft.items)) {
            const draftItems = existingDraft.items.map((item: any) => ({
              id: crypto.randomUUID(),
              productName: item.product_name || '',
              description: item.product_name || '',
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || 0,
              total: item.total || 0,
              brand: '',
              specifications: item.notes || '',
            }));
            setProposalItems(draftItems);
          }
        }
      }
    } catch (error) {
      console.error('Error loading response:', error);
    }
  };

  const initConversation = async () => {
    if (!quote || !user?.supplierId) return;
    
    try {
      const { data: existingConv } = await supabase
        .from('quote_conversations')
        .select('id')
        .eq('quote_id', quote.id)
        .eq('supplier_id', user.supplierId)
        .maybeSingle();

      if (existingConv) {
        setConversationId(existingConv.id);
        loadMessages(existingConv.id);
      } else {
        const { data: newConv } = await supabase
          .from('quote_conversations')
          .insert({
            quote_id: quote.id,
            client_id: quote.clientId,
            supplier_id: user.supplierId,
            status: 'active'
          })
          .select('id')
          .single();

        if (newConv) {
          setConversationId(newConv.id);
          loadMessages(newConv.id);
        }
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data } = await supabase
        .from('quote_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setIsSendingMessage(true);
    try {
      const { error } = await supabase
        .from('quote_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'supplier',
          content: newMessage.trim(),
          attachments: []
        });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(conversationId);
      toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleItemChange = (index: number, field: keyof ProposalItem, value: string | number) => {
    const updatedItems = [...proposalItems];
    const item = { ...updatedItems[index] };
    
    if (field === 'unitPrice' || field === 'quantity') {
      (item as any)[field] = Number(value);
      item.total = item.unitPrice * item.quantity;
    } else {
      (item as any)[field] = value;
    }
    
    updatedItems[index] = item;
    setProposalItems(updatedItems);
  };

  const handleSendProposal = async () => {
    if (!quote || !user?.supplierId) return;

    // Verificar se cotação está bloqueada
    const { data: quoteCheck } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', quote.id)
      .single();

    if (quoteCheck?.status === 'pending_approval' || 
        quoteCheck?.status === 'approved' || 
        quoteCheck?.status === 'finalized') {
      toast.error('Esta cotação está bloqueada e não aceita mais propostas.');
      return;
    }

    // Validações
    if (proposalItems.length === 0) {
      toast.error('Adicione pelo menos um item à proposta');
      return;
    }

    const hasValidItems = proposalItems.some(item => 
      item.productName.trim() && item.quantity > 0 && item.unitPrice > 0
    );

    if (!hasValidItems) {
      toast.error('Preencha pelo menos um item com produto, quantidade e preço');
      return;
    }

    // Validar visita técnica se necessário
    if (quote.requires_visit) {
      const confirmedVisit = visits.find(v => v.status === 'confirmed');
      
      if (!confirmedVisit) {
        toast.error('Você precisa agendar e confirmar a visita técnica antes de enviar a proposta');
        return;
      }
    }

    setIsSendingProposal(true);
    try {
      const totalValue = proposalItems.reduce((sum, item) => sum + item.total, 0);

      await submitQuoteResponse(quote.id, {
        items: proposalItems.map(item => ({
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          notes: item.specifications || undefined
        })),
        total_amount: totalValue,
        delivery_time: deliveryTime,
        shipping_cost: shippingCost,
        warranty_months: warrantyMonths,
        payment_terms: paymentTerms,
        notes: observations || undefined
      });

      toast.success('Proposta enviada com sucesso');
      onOpenChange(false);
      if (onProposalSent) onProposalSent();
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast.error('Erro ao enviar proposta');
    } finally {
      setIsSendingProposal(false);
    }
  };

  const handleVisitUpdate = () => {
    fetchVisits();
  };

  if (!quote) return null;

  // Verificar se cotação foi aprovada/finalizada (status do fornecedor)
  const isQuoteLocked = quote.status === 'approved' || 
                        quote.status === 'paid' || 
                        quote.status === 'delivering';
  const totalValue = proposalItems.reduce((sum, item) => sum + item.total, 0);
  const latestVisit = visits[0];
  const canSchedule = quote.requires_visit && (!latestVisit || latestVisit.status === 'confirmed' || latestVisit.status === 'overdue');
  const canConfirm = quote.requires_visit && latestVisit && latestVisit.status === 'scheduled';
  const hasConfirmedVisit = visits.some(v => v.status === 'confirmed');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {quote.local_code} - {quote.title}
              <Badge>{quote.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="resumo" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resumo">
                <Package className="h-4 w-4 mr-2" />
                Resumo
              </TabsTrigger>
              {quote.requires_visit && (
                <TabsTrigger value="visita">
                  <MapPin className="h-4 w-4 mr-2" />
                  Visita Técnica
                  {!hasConfirmedVisit && <AlertCircle className="h-3 w-3 ml-1 text-orange-500" />}
                </TabsTrigger>
              )}
              <TabsTrigger value="proposta">
                <FileText className="h-4 w-4 mr-2" />
                Proposta
              </TabsTrigger>
              <TabsTrigger value="mensagens">
                <MessageSquare className="h-4 w-4 mr-2" />
                Mensagens
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="resumo" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações da Cotação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Cliente</Label>
                        <p className="font-medium">{quote.client_name || quote.client || 'Cliente não informado'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Prazo de Resposta</Label>
                        <p className="font-medium">{formatLocalDateTime(quote.deadline)}</p>
                      </div>
                    </div>
                    {quote.description && (
                      <div>
                        <Label className="text-muted-foreground">Descrição</Label>
                        <p className="text-sm">{quote.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Itens Solicitados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingItems ? (
                      <p className="text-center text-muted-foreground py-4">Carregando...</p>
                    ) : quoteItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Nenhum item encontrado</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Preço Unit. (Ref.)</TableHead>
                            <TableHead>Total (Ref.)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quoteItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.unit_price > 0 ? `R$ ${item.unit_price.toFixed(2)}` : '-'}</TableCell>
                              <TableCell>{item.total > 0 ? `R$ ${item.total.toFixed(2)}` : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {quote.requires_visit && (
                <TabsContent value="visita" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Requisitos da Visita Técnica</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!hasConfirmedVisit && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-orange-900">Visita Técnica Obrigatória</p>
                              <p className="text-sm text-orange-800 mt-1">
                                Esta cotação requer uma visita técnica confirmada antes do envio da proposta.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {quote.visit_deadline && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="text-muted-foreground">Prazo Sugerido pelo Cliente</Label>
                            <p className="font-medium">{formatLocalDateTime(quote.visit_deadline)}</p>
                          </div>
                        </div>
                      )}

                      {quote.description && (
                        <div>
                          <Label className="text-muted-foreground">Observações do Cliente</Label>
                          <p className="text-sm mt-1">{quote.description}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {canSchedule && (
                          <Button onClick={() => setIsVisitModalOpen(true)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Agendar Visita
                          </Button>
                        )}
                        {canConfirm && (
                          <Button onClick={() => setIsVisitModalOpen(true)}>
                            <Clock className="h-4 w-4 mr-2" />
                            Confirmar Realização
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Visitas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <VisitTimeline visits={visits} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="proposta" className="space-y-4 mt-0">
                {existingResponse && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Proposta Enviada</p>
                        <p className="text-sm text-blue-800">
                          Enviada em {formatLocalDateTime(existingResponse.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>Itens da Proposta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Preço Unit.</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposalItems.map((item, index) => (
                          <TableRow key={item.id}>
                             <TableCell>
                              <Input
                                value={item.productName}
                                onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                placeholder="Nome do produto"
                                disabled={!!existingResponse || isQuoteLocked}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                className="w-20"
                                disabled={!!existingResponse || isQuoteLocked}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                className="w-28"
                                disabled={!!existingResponse || isQuoteLocked}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              R$ {item.total.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="mt-4 flex justify-between items-center">
                      {!existingResponse && !isQuoteLocked && (
                        <Button 
                          onClick={() => {
                            const newItem: ProposalItem = {
                              id: crypto.randomUUID(),
                              productName: '',
                              description: '',
                              quantity: 1,
                              unitPrice: 0,
                              total: 0,
                              brand: '',
                              specifications: ''
                            };
                            setProposalItems([...proposalItems, newItem]);
                          }} 
                          variant="outline" 
                          size="sm"
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar item extra
                        </Button>
                      )}
                      
                      <div className="text-lg font-semibold ml-auto">
                        Total: R$ {totalValue.toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Condições Comerciais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prazo de Entrega (dias)</Label>
                        <Input
                          type="number"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(Number(e.target.value))}
                          disabled={!!existingResponse || isQuoteLocked}
                        />
                      </div>
                      <div>
                        <Label>Condições de Pagamento</Label>
                        <Input
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                          placeholder="Ex: 30 dias"
                          disabled={!!existingResponse || isQuoteLocked}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Custo de Frete (R$)</Label>
                        <Input
                          type="number"
                          value={shippingCost}
                          onChange={(e) => setShippingCost(Number(e.target.value))}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          disabled={!!existingResponse || isQuoteLocked}
                        />
                      </div>
                      <div>
                        <Label>Garantia (meses)</Label>
                        <Input
                          type="number"
                          value={warrantyMonths}
                          onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                          min="0"
                          placeholder="12"
                          disabled={!!existingResponse || isQuoteLocked}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Informações adicionais..."
                        rows={3}
                        disabled={!!existingResponse || isQuoteLocked}
                      />
                    </div>

                    {isQuoteLocked && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-orange-900">Cotação Bloqueada</p>
                            <p className="text-xs text-orange-700 mt-0.5">
                              {quote.status === 'approved'
                                ? 'Uma proposta foi selecionada e aprovada. Esta cotação está finalizada.'
                                : 'Esta cotação já foi finalizada e não aceita mais propostas.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!existingResponse && !isQuoteLocked && (
                      <Button 
                        onClick={handleSendProposal} 
                        disabled={isSendingProposal || proposalItems.length === 0}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSendingProposal ? 'Enviando...' : 'Enviar Proposta'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mensagens" className="mt-0 h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>Esclarecimentos com o Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 min-h-[300px] max-h-[400px]">
                      {messages.length === 0 ? (
                        <p className="text-center text-muted-foreground">Nenhuma mensagem ainda</p>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_type === 'supplier' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  msg.sender_type === 'supplier'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm">{msg.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {formatLocalDateTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Digite sua mensagem..."
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!newMessage.trim() || isSendingMessage}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <VisitManagementModal
        quote={quote}
        open={isVisitModalOpen}
        onOpenChange={setIsVisitModalOpen}
        onVisitUpdated={handleVisitUpdate}
      />
    </>
  );
}
