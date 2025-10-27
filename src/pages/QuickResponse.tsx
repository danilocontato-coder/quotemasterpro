import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, DollarSign, FileText, Upload, Package, Edit2, Users, Zap, TrendingUp, Award, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBranding } from '@/contexts/BrandingContext';

export default function QuickResponse() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: brandingSettings } = useBranding();
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isEditingPreFilledData, setIsEditingPreFilledData] = useState(false);
  const [hasPreFilledData, setHasPreFilledData] = useState(false);
  const [isExtractingFromPdf, setIsExtractingFromPdf] = useState(false);
  
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierEmail: '',
    deliveryDays: '7',
    shippingCost: '0',
    warrantyMonths: '12',
    paymentTerms: '30 dias',
    notes: '',
    visitDate: '',
    visitNotes: ''
  });

  // Validar token e buscar dados da cotação
  useEffect(() => {
    if (!token) {
      toast({ 
        title: 'Link inválido', 
        description: 'Token não encontrado no link.',
        variant: 'destructive' 
      });
      navigate('/');
      return;
    }
    
    const validateAndFetch = async () => {
      try {
        setValidating(true);
        
        const { data, error } = await supabase.functions.invoke('validate-quote-token', {
          body: { token }
        });
        
        if (error || !data?.valid) {
          toast({ 
            title: 'Link inválido ou expirado', 
            description: data?.error || 'Este link não é mais válido.',
            variant: 'destructive' 
          });
          navigate('/');
          return;
        }
        
        console.log('📦 [QUICK-RESPONSE] Dados recebidos:', { 
          quote: data.quote, 
          supplier: data.supplier,
          hasSupplier: !!data.supplier,
          supplierIdInQuote: data.quote?.supplier_id 
        });
        
        setQuoteData(data.quote);
        
        // 🆕 Debug de visita técnica
        console.log('🏢 [QUICK-RESPONSE] Informações da cotação:', {
          requires_visit: data.quote?.requires_visit,
          visit_deadline: data.quote?.visit_deadline,
          client_address: data.quote?.client_address,
          hasAddress: !!data.quote?.client_address
        });
        
        // Usar itens que vieram da validação do token
        if (data.items && data.items.length > 0) {
          console.log('📦 [QUICK-RESPONSE] Itens recebidos do backend:', data.items.length);
          console.log('📋 [QUICK-RESPONSE] Detalhes dos itens:', data.items.map(i => ({
            name: i.product_name,
            qty: i.quantity
          })));
          
          const itemsWithProposal = data.items.map(item => ({
            id: item.id,
            product_name: item.product_name || '',     // ✅ Pré-preenchido (editável)
            quantity: item.quantity || 0,              // ✅ Quantidade original
            unit_price: item.unit_price || 0,          // ℹ️ Preço original (referência)
            proposed_quantity: item.quantity || 0,     // ✅ Quantidade proposta (editável)
            proposed_unit_price: '',                   // ✅ Preço proposto (editável - vazio)
            proposed_total: 0                          // ✅ Total calculado
          }));
          
          setQuoteItems(itemsWithProposal);
          console.log('✅ [QUICK-RESPONSE] Itens configurados para resposta');
        } else {
          console.warn('⚠️ [QUICK-RESPONSE] Nenhum item encontrado na cotação');
          toast({
            title: "Atenção",
            description: "Cotação sem itens. Entre em contato com o cliente.",
            variant: "destructive"
          });
        }
        
        // Buscar TODOS os dados do fornecedor se já cadastrado
        if (data.supplier) {
          console.log('✅ [QUICK-RESPONSE] PRÉ-PREENCHENDO com dados do fornecedor:', {
            name: data.supplier.name,
            email: data.supplier.email
          });
          
          setFormData(prev => ({ 
            ...prev, 
            supplierName: data.supplier.name || '',
            supplierEmail: data.supplier.email || ''
          }));
          setHasPreFilledData(true);
        } else if (data.quote?.supplier_id) {
          console.log('🔍 [QUICK-RESPONSE] Tentando buscar fornecedor pelo supplier_id:', data.quote.supplier_id);
          
          // Fallback: buscar diretamente se validate-quote-token não retornou
          const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .select('name, email, cnpj, phone, city, state')
            .eq('id', data.quote.supplier_id)
            .single();
          
          if (supplierError) {
            console.error('❌ [QUICK-RESPONSE] Erro ao buscar fornecedor:', supplierError);
          }
          
          if (supplier) {
            console.log('✅ [QUICK-RESPONSE] PRÉ-PREENCHENDO via fallback:', {
              name: supplier.name,
              email: supplier.email
            });
            
            setFormData(prev => ({ 
              ...prev, 
              supplierName: supplier.name || '',
              supplierEmail: supplier.email || ''
            }));
            setHasPreFilledData(true);
          } else {
            console.log('⚠️ [QUICK-RESPONSE] Fornecedor não encontrado pelo supplier_id');
          }
        } else if (data.quote?.supplier_name) {
          console.log('✅ [QUICK-RESPONSE] PRÉ-PREENCHENDO com supplier_name da quote:', data.quote.supplier_name);
          
          setFormData(prev => ({ 
            ...prev, 
            supplierName: data.quote.supplier_name 
          }));
          setHasPreFilledData(true);
        } else {
          console.log('⚠️ [QUICK-RESPONSE] Nenhum dado de fornecedor disponível para pré-preencher');
        }
        
      } catch (error) {
        console.error('Erro ao validar token:', error);
        toast({ 
          title: 'Erro', 
          description: 'Não foi possível validar o link.',
          variant: 'destructive' 
        });
        navigate('/');
      } finally {
        setValidating(false);
      }
    };
    
    validateAndFetch();
  }, [token, navigate, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo e tamanho
      if (file.size > 10 * 1024 * 1024) {
        toast({ 
          title: 'Arquivo muito grande', 
          description: 'O arquivo deve ter no máximo 10MB.',
          variant: 'destructive' 
        });
        return;
      }
      
      setAttachment(file);
      
      toast({
        title: '✅ Arquivo selecionado',
        description: `${file.name} será enviado com sua resposta.`
      });
    }
  };

  const updateItemPrice = (index: number, price: string) => {
    const newItems = [...quoteItems];
    const cleanPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    newItems[index].proposed_unit_price = price;
    newItems[index].proposed_total = cleanPrice * newItems[index].proposed_quantity;
    setQuoteItems(newItems);
  };

  const updateItemQuantity = (index: number, qty: string) => {
    const newItems = [...quoteItems];
    const quantity = parseInt(qty) || 0;
    newItems[index].proposed_quantity = quantity;
    const price = parseFloat(newItems[index].proposed_unit_price?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    newItems[index].proposed_total = price * quantity;
    setQuoteItems(newItems);
  };

  const addNewItem = () => {
    setQuoteItems([...quoteItems, {
      id: `new-${Date.now()}`,
      product_name: '',
      proposed_quantity: 1,
      proposed_unit_price: '',
      proposed_total: 0
    }]);
  };

  const removeItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return quoteItems.reduce((sum, item) => sum + (item.proposed_total || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierName || !formData.supplierEmail) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha empresa e e-mail.",
        variant: "destructive"
      });
      return;
    }

    // NOVA VALIDAÇÃO: Se requer visita, data é obrigatória
    if (quoteData?.requires_visit && !formData.visitDate) {
      toast({
        title: "Data da visita obrigatória",
        description: "Esta cotação requer uma visita técnica. Por favor, agende a data.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar se data da visita está dentro do prazo
    if (formData.visitDate && quoteData?.visit_deadline) {
      const visitDate = new Date(formData.visitDate);
      const deadline = new Date(quoteData.visit_deadline);
      
      if (visitDate > deadline) {
        toast({
          title: "Data inválida",
          description: `A visita deve ser agendada até ${deadline.toLocaleDateString('pt-BR')}`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validar itens
    const itemsWithPrices = quoteItems.filter(item => 
      item.proposed_unit_price && parseFloat(item.proposed_unit_price.replace(/[^\d.,]/g, '').replace(',', '.')) > 0
    );

    if (itemsWithPrices.length === 0) {
      toast({
        title: "Itens obrigatórios",
        description: "Preencha pelo menos um item com quantidade e preço.",
        variant: "destructive"
      });
      return;
    }

    const totalAmount = calculateTotal();

    try {
      setLoading(true);
      
      console.log('🚀 [QUICK-RESPONSE] Iniciando envio de proposta:', {
        itemsCount: itemsWithPrices.length,
        totalAmount,
        hasAttachment: !!attachment
      });
      
      // Upload de anexo se houver
      let attachmentUrl = null;
      if (attachment) {
        console.log('📎 [QUICK-RESPONSE] Fazendo upload de anexo...');
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${token}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('quote-attachments')
          .upload(`quick-responses/${fileName}`, attachment);
        
        if (uploadError) {
          console.error('❌ [QUICK-RESPONSE] Erro no upload:', uploadError);
          toast({
            title: "Erro no upload",
            description: "Não foi possível enviar o arquivo.",
            variant: "destructive"
          });
          return;
        }
        
        const { data: urlData } = supabase.storage
          .from('quote-attachments')
          .getPublicUrl(`quick-responses/${fileName}`);
        
        attachmentUrl = urlData.publicUrl;
        console.log('✅ [QUICK-RESPONSE] Anexo enviado:', attachmentUrl);
      }
      
      // Preparar itens para envio
      const proposalItems = itemsWithPrices.map(item => {
        const unitPrice = parseFloat(String(item.proposed_unit_price).replace(/[^\d.,]/g, '').replace(',', '.'));
        return {
          product_name: item.product_name || 'Item sem nome',
          quantity: parseInt(String(item.proposed_quantity)) || 1,
          unit_price: unitPrice,
          total: item.proposed_total || (unitPrice * (parseInt(String(item.proposed_quantity)) || 1))
        };
      });

      // Limpar e validar campos numéricos
      const deliveryDays = parseInt(String(formData.deliveryDays)) || 7;
      const shippingCostStr = String(formData.shippingCost || '0');
      const shippingCost = parseFloat(shippingCostStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const warrantyMonths = parseInt(String(formData.warrantyMonths)) || 12;

      const payload = {
        token,
        supplier_name: formData.supplierName.trim(),
        supplier_email: formData.supplierEmail.trim().toLowerCase(),
        total_amount: totalAmount,
        delivery_days: deliveryDays,
        shipping_cost: shippingCost,
        warranty_months: warrantyMonths,
        payment_terms: formData.paymentTerms.trim() || '30 dias',
        notes: formData.notes?.trim() || null,
        attachment_url: attachmentUrl,
        items: proposalItems,
        visit_date: formData.visitDate || null,
        visit_notes: formData.visitNotes?.trim() || null
      };

      console.log('📤 [QUICK-RESPONSE] Enviando payload:', {
        ...payload,
        items: `${proposalItems.length} itens`
      });

      // Submeter resposta via edge function
      const { data, error } = await supabase.functions.invoke('submit-quick-response', {
        body: payload
      });
      
      console.log('📥 [QUICK-RESPONSE] Resposta recebida:', { data, error });

      if (error) {
        console.error('❌ [QUICK-RESPONSE] Erro da edge function:', error);
        throw new Error(error.message || 'Erro ao submeter resposta');
      }

      if (!data?.success) {
        console.error('❌ [QUICK-RESPONSE] Resposta sem sucesso:', data);
        throw new Error(data?.error || 'Erro ao submeter resposta');
      }
      
      console.log('✅ [QUICK-RESPONSE] Proposta enviada com sucesso!');
      toast({
        title: "Resposta enviada!",
        description: "Sua proposta foi enviada com sucesso."
      });
      
      // Redirecionar para página de sucesso
      navigate('/r/success');
      
    } catch (error: any) {
      console.error('❌ [QUICK-RESPONSE] Erro geral:', error);
      toast({
        title: "Erro ao enviar proposta",
        description: error.message || "Não foi possível enviar sua resposta. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Validando link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 shadow-lg">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' && (
                <div className="bg-white rounded-lg p-3 shadow-md">
                  <img 
                    src={brandingSettings.logo} 
                    alt={brandingSettings.companyName}
                    className="h-14 w-auto object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-extrabold mb-1 tracking-tight drop-shadow-md">
                  {brandingSettings.companyName}
                </h1>
                <p className="text-primary-foreground/90 text-base font-medium">
                  Plataforma de Gestão de Cotações
                </p>
              </div>
            </div>
            <Package className="w-14 h-14 opacity-70" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna Principal - Formulário */}
          <div className="lg:col-span-2 space-y-6">

            {quoteData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Detalhes da Cotação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cotação:</span>
                    <span className="font-bold text-primary">#{quoteData.local_code || quoteData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium">{quoteData.client_name}</span>
                  </div>
                  {quoteData.title && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Título:</span>
                      <span className="font-medium">{quoteData.title}</span>
                    </div>
                  )}
                  {quoteData.description && (
                    <div className="mt-2">
                      <span className="text-muted-foreground block mb-1">Descrição:</span>
                      <p className="text-sm bg-muted p-3 rounded-md">{quoteData.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Card de Visita Técnica - SE NECESSÁRIA */}
            {quoteData?.requires_visit && (
              <Card className="border-amber-500/50 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Calendar className="w-5 h-5" />
                    Visita Técnica Necessária
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-amber-700">
                      Esta cotação requer uma visita técnica presencial antes do envio da proposta final.
                    </p>
                  </div>
                  
                  {quoteData.visit_deadline && (
                    <div className="bg-white rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-muted-foreground mb-1">Prazo para visita:</p>
                      <p className="font-semibold text-amber-700">
                        {new Date(quoteData.visit_deadline).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  
                  {quoteData.client_address && (
                    <div className="bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Local da visita:</p>
                          <p className="font-medium text-sm">{quoteData.client_address}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Itens da Cotação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Itens da Cotação
                </CardTitle>
                <p className="text-sm text-muted-foreground">Preencha os preços para cada item solicitado</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {quoteItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item na cotação</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addNewItem}>
                      Adicionar Item
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {quoteItems.map((item, index) => (
                        <Card key={item.id || index} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-5">
                              <Label className="text-xs">Produto</Label>
                              <Input
                                value={item.product_name}
                                onChange={(e) => {
                                  const newItems = [...quoteItems];
                                  newItems[index].product_name = e.target.value;
                                  setQuoteItems(newItems);
                                }}
                                placeholder="Nome do produto"
                                className="h-9"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs">Quantidade</Label>
                              <Input
                                type="number"
                                value={item.proposed_quantity}
                                onChange={(e) => updateItemQuantity(index, e.target.value)}
                                className="h-9"
                                min="1"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs">Preço Unitário *</Label>
                              <Input
                                value={item.proposed_unit_price}
                                onChange={(e) => updateItemPrice(index, e.target.value)}
                                placeholder="R$ 0,00"
                                className="h-9"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs">Total</Label>
                              <Input
                                value={`R$ ${(item.proposed_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="h-9 bg-muted"
                              />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-9 w-full text-destructive hover:text-destructive"
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <Button type="button" variant="outline" size="sm" onClick={addNewItem}>
                        + Adicionar Item
                      </Button>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Geral</p>
                        <p className="text-2xl font-bold text-primary">
                          R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Dados da Proposta
                </CardTitle>
                <p className="text-sm text-muted-foreground">Preencha os dados complementares</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {hasPreFilledData && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-primary font-semibold flex items-center gap-2 mb-1">
                            <Award className="w-4 h-4" />
                            Dados pré-preenchidos
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {isEditingPreFilledData 
                              ? "Você pode editar os dados abaixo conforme necessário."
                              : "Os dados foram preenchidos automaticamente. Clique em 'Editar' se precisar alterá-los."}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingPreFilledData(!isEditingPreFilledData)}
                          className="ml-2"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          {isEditingPreFilledData ? 'Bloquear' : 'Editar'}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="supplierName">Nome da Empresa *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supplierName"
                        value={formData.supplierName}
                        onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                        placeholder="Razão social da sua empresa"
                        className="pl-10"
                        disabled={loading || (hasPreFilledData && !isEditingPreFilledData)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="supplierEmail">E-mail de Contato *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supplierEmail"
                        type="email"
                        value={formData.supplierEmail}
                        onChange={(e) => setFormData({...formData, supplierEmail: e.target.value})}
                        placeholder="contato@empresa.com"
                        className="pl-10"
                        disabled={loading || (hasPreFilledData && !isEditingPreFilledData)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="deliveryDays">Prazo de Entrega (dias)</Label>
                      <Input
                        id="deliveryDays"
                        type="number"
                        value={formData.deliveryDays}
                        onChange={(e) => setFormData({...formData, deliveryDays: e.target.value})}
                        placeholder="7"
                        disabled={loading}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCost">Frete</Label>
                      <Input
                        id="shippingCost"
                        value={formData.shippingCost}
                        onChange={(e) => setFormData({...formData, shippingCost: e.target.value})}
                        placeholder="R$ 0,00"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="warrantyMonths">Garantia (meses)</Label>
                      <Input
                        id="warrantyMonths"
                        type="number"
                        value={formData.warrantyMonths}
                        onChange={(e) => setFormData({...formData, warrantyMonths: e.target.value})}
                        placeholder="12"
                        disabled={loading}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
                      <Input
                        id="paymentTerms"
                        value={formData.paymentTerms}
                        onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                        placeholder="30 dias"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  {/* Campos de Visita Técnica - SE NECESSÁRIA */}
                  {quoteData?.requires_visit && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Agendamento da Visita Técnica
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label htmlFor="visitDate">Data da Visita *</Label>
                            <Input
                              id="visitDate"
                              type="date"
                              value={formData.visitDate}
                              onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                              min={new Date().toISOString().split('T')[0]}
                              max={quoteData.visit_deadline ? new Date(quoteData.visit_deadline).toISOString().split('T')[0] : undefined}
                              disabled={loading}
                              required={quoteData.requires_visit}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {quoteData.visit_deadline 
                                ? `Prazo máximo: ${new Date(quoteData.visit_deadline).toLocaleDateString('pt-BR')}`
                                : 'Escolha a data preferencial para a visita técnica'
                              }
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="visitNotes">Observações da Visita (opcional)</Label>
                            <Textarea
                              id="visitNotes"
                              value={formData.visitNotes}
                              onChange={(e) => setFormData({...formData, visitNotes: e.target.value})}
                              placeholder="Ex: Preferência de horário, restrições de acesso, equipamentos necessários..."
                              className="min-h-[80px]"
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="Informações adicionais, prazo de entrega, condições de pagamento..."
                        className="pl-10 min-h-[100px]"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="attachment">
                      Anexar Proposta (opcional)
                    </Label>
                    <div className="relative">
                      <Input
                        id="attachment"
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        className="cursor-pointer"
                        disabled={loading}
                      />
                      {attachment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Upload className="w-3 h-3 inline mr-1" />
                          {attachment.name}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      📄 PDF com IA: Valores e observações extraídos automaticamente<br />
                      Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX (máx. 10MB)
                    </p>
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg" disabled={loading || isExtractingFromPdf || quoteItems.length === 0}>
                    {loading ? 'Enviando...' : isExtractingFromPdf ? '🤖 Processando PDF...' : `Enviar Proposta - R$ ${calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </Button>
                  
                  <div className="text-center pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Ainda não tem cadastro?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open('/supplier/register', '_blank')}
                      className="w-full"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Cadastrar como Fornecedor
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Crie sua conta e receba cotações de múltiplos clientes
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - Benefícios */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Por que se cadastrar?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-1">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Novos Clientes</h4>
                    <p className="text-sm text-muted-foreground">
                      Receba cotações de diversos clientes automaticamente
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="mt-1">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Aumente suas Vendas</h4>
                    <p className="text-sm text-muted-foreground">
                      Participe de mais oportunidades e expanda seu negócio
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="mt-1">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Respostas Rápidas</h4>
                    <p className="text-sm text-muted-foreground">
                      Sistema ágil para enviar propostas em segundos
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="mt-1">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Certificação</h4>
                    <p className="text-sm text-muted-foreground">
                      Torne-se um fornecedor certificado e ganhe destaque
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Cadastre-se Grátis</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ao enviar sua proposta, você já pode criar sua conta e começar a receber cotações de outros clientes
                  </p>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      ✨ <strong>Sem custos iniciais</strong><br />
                      ✨ <strong>Acesso imediato</strong><br />
                      ✨ <strong>Suporte dedicado</strong>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
