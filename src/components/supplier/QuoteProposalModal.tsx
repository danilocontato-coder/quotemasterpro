import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, FileText, X, Send, Save, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { SupplierQuote, ProposalItem, useSupabaseSupplierQuotes } from '@/hooks/useSupabaseSupplierQuotes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuoteVisits } from '@/hooks/useQuoteVisits';
import { VisitSection } from '@/components/quotes/VisitSection';

interface QuoteProposalModalProps {
  quote: SupplierQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteProposalModal({ quote, open, onOpenChange }: QuoteProposalModalProps) {
  const { createProposal, updateProposal, sendProposal, addAttachment, removeAttachment, submitQuoteResponse } = useSupabaseSupplierQuotes();
  const { user } = useAuth();
  const { visits, fetchVisits } = useQuoteVisits(quote?.id);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [deliveryTime, setDeliveryTime] = useState(quote?.proposal?.deliveryTime || 7);
  const [paymentTerms, setPaymentTerms] = useState(quote?.proposal?.paymentTerms || '30 dias');
  const [shippingCost, setShippingCost] = useState(quote?.proposal?.shippingCost || 0);
  const [warrantyMonths, setWarrantyMonths] = useState(quote?.proposal?.warrantyMonths || 12);
  const [observations, setObservations] = useState(quote?.proposal?.observations || '');
  const [isUploading, setIsUploading] = useState(false);

  // Load quote items when modal opens
  useEffect(() => {
    if (open && quote && (!quoteItems.length || quoteItems[0]?.quote_id !== quote.id)) {
      loadQuoteItems();
      loadExistingDraft();
    }
  }, [open, quote]);

  // Initialize proposal items when quote items are loaded
  useEffect(() => {
    if (quoteItems.length > 0 && proposalItems.length === 0) {
      const initialItems = quoteItems.map(item => ({
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
  }, [quoteItems, proposalItems.length]);

  const loadQuoteItems = async () => {
    if (!quote) return;
    
    setIsLoadingItems(true);
    try {
      const { data: items, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id);

      if (error) {
        console.error('Error loading quote items:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os itens da cotação.",
          variant: "destructive",
        });
        return;
      }

      console.log('📋 Quote items loaded:', items?.length || 0);
      setQuoteItems(items || []);
    } catch (error) {
      console.error('Error in loadQuoteItems:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const loadExistingDraft = async () => {
    if (!quote || !user?.supplierId) return;
    
    try {
      const { data: existingDraft, error } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('quote_id', quote.id)
        .eq('supplier_id', user.supplierId)
        .eq('status', 'draft')
        .maybeSingle();

      if (error) {
        console.error('Error loading existing draft:', error);
        return;
      }

      if (existingDraft) {
        console.log('📋 Loading existing draft:', existingDraft);
        
        // Carregar dados do rascunho (campos opcionais que podem não existir nos tipos gerados)
        const draft: any = existingDraft as any;
        setDeliveryTime((draft?.delivery_time as number) || 7);
        setPaymentTerms((draft?.payment_terms as string) || '30 dias');
        setShippingCost((draft?.shipping_cost as number) || 0);
        setWarrantyMonths((draft?.warranty_months as number) || 12);
        setObservations((draft?.notes as string) || '');
        
        // Carregar itens do rascunho (quando existirem)
        if (Array.isArray(draft?.items)) {
          const draftItems = (draft.items as any[]).map((item: any) => ({
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
    } catch (error) {
      console.error('Error in loadExistingDraft:', error);
    }
  };

  if (!quote) return null;

  const totalValue = proposalItems.reduce((sum, item) => sum + item.total, 0);
  const hasProposal = !!quote.proposal;
  const canEdit = !hasProposal || quote.proposal?.status === 'draft';
  const canSend = (hasProposal && quote.proposal?.status === 'draft' && proposalItems.length > 0) || 
                  (!hasProposal && proposalItems.length > 0);

  const handleItemChange = (index: number, field: keyof ProposalItem, value: string | number) => {
    if (!canEdit) return;
    
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

  const handleAddItem = () => {
    if (!canEdit) return;
    
    const newItem: ProposalItem = {
      id: crypto.randomUUID(),
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      brand: '',
      specifications: '',
    };
    setProposalItems([...proposalItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (!canEdit) return;
    setProposalItems(proposalItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!quote) return;

    try {
      // Validar se há pelo menos um item
      if (proposalItems.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item para salvar como rascunho.",
          variant: "destructive",
        });
        return;
      }

      console.log('💾 Salvando rascunho da proposta para cotação:', quote.id);

      // Salvar como rascunho usando quote_responses com status 'draft'
      const { data: existingResponse, error: checkError } = await supabase
        .from('quote_responses')
        .select('id')
        .eq('quote_id', quote.id)
        .eq('supplier_id', user?.supplierId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const responseData = {
        quote_id: quote.id,
        supplier_id: user?.supplierId,
        supplier_name: user?.name || 'Fornecedor',
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
        notes: observations || undefined,
        status: 'draft'
      };

      let result;
      if (existingResponse) {
        // Atualizar rascunho existente
        const { data, error } = await supabase
          .from('quote_responses')
          .update(responseData)
          .eq('id', existingResponse.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Criar novo rascunho
        const { data, error } = await supabase
          .from('quote_responses')
          .insert(responseData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      toast({
        title: "Rascunho salvo",
        description: "Sua proposta foi salva como rascunho.",
      });

      console.log('✅ Rascunho salvo com sucesso:', result.id);
    } catch (error) {
      console.error('❌ Erro ao salvar rascunho:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a proposta.",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    try {
      // Validar se há itens
      if (proposalItems.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item à proposta.",
          variant: "destructive",
        });
        return;
      }

      // Validar se há informações obrigatórias
      const hasValidItems = proposalItems.some(item => 
        item.productName.trim() && item.quantity > 0 && item.unitPrice > 0
      );

      if (!hasValidItems) {
        toast({
          title: "Erro", 
          description: "Preencha pelo menos um item com produto, quantidade e preço.",
          variant: "destructive",
        });
        return;
      }

      // VALIDAR VISITA TÉCNICA
      if (quote.requires_visit) {
        const confirmedVisit = visits.find(v => v.status === 'confirmed');
        
        if (!confirmedVisit) {
          toast({
            title: "Visita técnica pendente",
            description: "Você precisa agendar e confirmar a visita técnica antes de enviar a proposta.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('🔄 Enviando proposta para cotação:', quote.id);

      // Enviar proposta usando a função que funciona
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

      toast({
        title: "Proposta enviada",
        description: "Sua proposta foi enviada para o cliente.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Erro ao enviar proposta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a proposta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !canEdit) return;

    setIsUploading(true);
    try {
      const file = event.target.files[0];
      const attachment = await addAttachment(quote.id, file);
      
      // Update quote proposal attachments in local state
      if (quote.proposal) {
        quote.proposal.attachments = [...(quote.proposal.attachments || []), attachment];
      }
      
      toast({
        title: "Arquivo anexado",
        description: `${file.name} foi anexado à proposta.`,
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível anexar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (!canEdit) return;
    removeAttachment(quote.id, attachmentId);
    toast({
      title: "Arquivo removido",
      description: "O arquivo foi removido da proposta.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            #{quote.local_code || quote.id} - {quote.title}
            <Badge variant={quote.status === 'pending' ? 'secondary' : quote.status === 'proposal_sent' ? 'default' : 'outline'}>
              {quote.status === 'pending' ? 'Aguardando Proposta' :
               quote.status === 'proposal_sent' ? 'Proposta Enviada' : 
               quote.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="sr-only">
          Envie sua proposta com itens, condições e anexos.
        </DialogDescription>

        <Tabs defaultValue={quote.requires_visit && quote.status !== 'visit_confirmed' ? 'details' : 'details'} className="w-full">
          <TabsList className={`grid w-full ${quote.requires_visit ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="details">Detalhes da Solicitação</TabsTrigger>
            <TabsTrigger 
              value="proposal"
              disabled={quote.requires_visit && quote.status !== 'visit_confirmed'}
            >
              Minha Proposta
              {quote.requires_visit && quote.status !== 'visit_confirmed' && (
                <Lock className="h-3 w-3 ml-1" />
              )}
            </TabsTrigger>
            {quote.requires_visit && (
              <TabsTrigger value="visit">
                Visita Técnica
                {quote.status !== 'visit_confirmed' && (
                  <AlertTriangle className="h-3 w-3 ml-1 text-orange-500" />
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Solicitação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{quote.client_name || quote.client || 'Cliente não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Prazo</Label>
                    <p className="font-medium">
                      {new Date(quote.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                  <p className="text-sm">{quote.description || 'Descrição não disponível'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Itens Solicitados</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Carregando itens...</span>
                  </div>
                ) : quoteItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum item encontrado nesta cotação.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Preço Unit. (Referência)</TableHead>
                        <TableHead>Total (Referência)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.product_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {item.unit_price > 0 ? `R$ ${item.unit_price.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {item.total > 0 ? `R$ ${item.total.toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proposal" className="space-y-4">
            {quote.requires_visit && quote.status !== 'visit_confirmed' ? (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6 text-center">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                  <h3 className="font-semibold text-lg mb-2">🔒 Visita Técnica Obrigatória</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Esta cotação requer visita técnica <strong>antes</strong> do envio de proposta comercial.
                    Agende e confirme a visita para desbloquear esta seção.
                  </p>
                  <div className="bg-white rounded-lg p-4 mb-4 border border-orange-300">
                    <p className="text-sm font-medium mb-2">Status atual:</p>
                    <Badge 
                      variant="outline"
                      className={
                        quote.status === 'awaiting_visit' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                        quote.status === 'visit_scheduled' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                        'bg-gray-100'
                      }
                    >
                      {quote.status === 'awaiting_visit' ? '⏳ Aguardando agendamento' :
                       quote.status === 'visit_scheduled' ? '📅 Visita agendada - Aguardando confirmação' :
                       quote.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vá para a aba "Visita Técnica" para prosseguir.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Itens da Proposta
                      {canEdit && (
                        <Button onClick={handleAddItem} size="sm">
                          <Plus className="h-4 w-4" />
                          Adicionar Item
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proposalItems.map((item, index) => (
                    <Card key={item.id} className="p-4">
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-3">
                          <Label>Produto *</Label>
                          <Input
                            value={item.productName}
                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                            placeholder="Nome do produto"
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Marca</Label>
                          <Input
                            value={item.brand}
                            onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                            placeholder="Marca"
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="col-span-1">
                          <Label>Qtd *</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                            min="1"
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Preço Unit. *</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Total</Label>
                          <Input
                            value={`R$ ${item.total.toFixed(2)}`}
                            disabled
                          />
                        </div>
                        <div className="col-span-2 flex gap-2">
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="col-span-12">
                          <Label>Especificações</Label>
                          <Textarea
                            value={item.specifications}
                            onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                            placeholder="Especificações técnicas do produto"
                            disabled={!canEdit}
                            rows={2}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {canEdit && proposalItems.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={handleAddItem} 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar outro item
                    </Button>
                  </div>
                )}

                <Separator className="my-6" />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Prazo de Entrega (dias) *</Label>
                    <Input
                      type="number"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(Number(e.target.value))}
                      min="1"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Condições de Pagamento *</Label>
                    <Input
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="Ex: 30 dias após entrega"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Valor Total</Label>
                    <Input
                      value={`R$ ${totalValue.toFixed(2)}`}
                      disabled
                      className="font-bold text-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label>Custo de Frete (R$)</Label>
                    <Input
                      type="number"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(Number(e.target.value))}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={!canEdit}
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
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-muted-foreground">
                      <p>Total com frete: <span className="font-semibold text-foreground">R$ {(totalValue + shippingCost).toFixed(2)}</span></p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Informações adicionais, condições especiais, etc."
                    disabled={!canEdit}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>

          {quote.requires_visit && (
            <TabsContent value="visit" className="space-y-4">
              <VisitSection 
                quote={quote}
                userRole="supplier"
                onVisitUpdate={() => fetchVisits()}
              />
            </TabsContent>
          )}

          <TabsContent value="attachments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Anexos
                  {canEdit && (
                    <div>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      />
                      <Button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        size="sm"
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? 'Enviando...' : 'Anexar Arquivo'}
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quote.proposal?.attachments && quote.proposal.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {quote.proposal.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{attachment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(attachment.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum arquivo anexado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <div className="flex gap-2">
            {canEdit && (
              <Button onClick={handleSave} disabled={proposalItems.length === 0}>
                <Save className="h-4 w-4" />
                Salvar Rascunho
              </Button>
            )}
            {canSend && (
              <Button onClick={handleSend}>
                <Send className="h-4 w-4" />
                Enviar Proposta
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}