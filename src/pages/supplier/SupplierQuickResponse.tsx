import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Building2, Package, Clock, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkSupplierDuplicate, normalizeCNPJ } from '@/lib/supplierDeduplication';
import { useAuth } from '@/contexts/AuthContext';
import { VisitManagementModal } from '@/components/supplier/VisitManagementModal';
import { useQuoteVisits } from '@/hooks/useQuoteVisits';
import { ProposalMethodSelector, type ProposalMethod } from '@/components/supplier/ProposalMethodSelector';
import { PdfUploadZone } from '@/components/supplier/PdfUploadZone';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
}

interface Quote {
  id: string;
  local_code?: string;
  title: string;
  description: string;
  deadline: string;
  client_name: string;
  supplier_id?: string;
  requires_visit?: boolean;
  visit_deadline?: string;
  items: QuoteItem[];
}

interface SupplierData {
  id?: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  whatsapp: string;
}

const SupplierQuickResponse = () => {
  const { quoteId, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [existingSupplier, setExistingSupplier] = useState<SupplierData | null>(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  
  // Estados para upload de PDF
  const [proposalMethod, setProposalMethod] = useState<ProposalMethod>('manual');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isExtractingFromPdf, setIsExtractingFromPdf] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Hook para gerenciar visitas
  const { visits, isLoading: visitsLoading, fetchVisits } = useQuoteVisits(quote?.id);
  
  // Verificar status da visita
  const latestVisit = visits[0];
  const hasConfirmedVisit = latestVisit?.status === 'confirmed';
  const canSubmitProposal = !quote?.requires_visit || hasConfirmedVisit;
  
  const [supplierData, setSupplierData] = useState<SupplierData>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: ''
  });
  
  const [proposalData, setProposalData] = useState({
    totalAmount: '',
    deliveryDays: '',
    warrantyMonths: '12',
    shippingCost: '',
    notes: ''
  });

  useEffect(() => {
    // Guardar URL de destino para redirecionamento após login
    if (quoteId && token && !authLoading) {
      const currentPath = `/supplier/quick-response/${quoteId}/${token}`;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      
      // ⛔ VALIDAÇÃO CRÍTICA: Se usuário está logado mas NÃO é fornecedor, forçar logout
      if (user && user.role !== 'supplier') {
        console.error('⛔ [SECURITY] Non-supplier user trying to access supplier area:', {
          userId: user.id,
          email: user.email,
          role: user.role
        });
        
        toast({
          title: "Acesso Negado",
          description: "Esta área é exclusiva para fornecedores. Você será redirecionado para fazer login como fornecedor.",
          variant: "destructive"
        });
        
        // Forçar logout e redirecionar
        supabase.auth.signOut().then(() => {
          navigate(`/supplier/auth/${quoteId}/${token}`, { replace: true });
        });
        return;
      }
      
      // Se o usuário não está autenticado, redirecionar para login
      if (!user) {
        navigate(`/supplier/auth/${quoteId}/${token}` as any, { replace: true });
        return;
      }
      
      // Se chegou aqui, o usuário está autenticado E é fornecedor
      validateTokenAndFetchData();
    }
  }, [quoteId, token, user, authLoading]);

  // Auto-confirmar dados para fornecedores recém-cadastrados
  useEffect(() => {
    const justRegistered = sessionStorage.getItem('supplier_registration_completed');
    
    if (justRegistered === 'true' && existingSupplier && !dataConfirmed) {
      setDataConfirmed(true);
      sessionStorage.removeItem('supplier_registration_completed');
      
      toast({
        title: "Cadastro concluído!",
        description: "Agora você pode enviar sua proposta",
      });
      
      // Scroll suave até a seção de proposta
      setTimeout(() => {
        const proposalSection = document.getElementById('proposal-section');
        if (proposalSection) {
          proposalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [existingSupplier, dataConfirmed]);

  const validateTokenAndFetchData = async () => {
    try {
      setLoading(true);

      // Validar token
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-quote-token', {
        body: { quote_id: quoteId, token }
      });

      if (validationError || !validationData?.valid) {
        toast({
          title: "Link inválido ou expirado",
          description: "Este link de cotação não é mais válido.",
          variant: "destructive"
        });
        return;
      }

      // Buscar cotação
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select('id, local_code, title, description, deadline, client_name, supplier_id, status, requires_visit, visit_deadline')
      .eq('id', quoteId)
      .single();

      if (quoteError) throw quoteError;

      // VALIDAÇÃO CRÍTICA DE SEGURANÇA: Verificar se o fornecedor logado tem acesso a esta cotação
      if (user?.role === 'supplier' && user?.supplierId && quoteData?.supplier_id) {
        if (user.supplierId !== quoteData.supplier_id) {
          console.error('⛔ [SECURITY] Supplier access denied:', {
            loggedSupplierId: user.supplierId,
            quoteSupplierId: quoteData.supplier_id
          });
          
          toast({
            title: "Acesso Negado",
            description: "Esta cotação foi destinada a outro fornecedor. Você não tem permissão para acessá-la.",
            variant: "destructive"
          });
          
          setLoading(false);
          navigate('/supplier', { replace: true });
          return;
        }
      }

      // Buscar itens da cotação
      const { data: items, error: itemsError } = await supabase
        .from('quote_items')
        .select('id, product_name, quantity')
        .eq('quote_id', quoteId);

      if (itemsError) throw itemsError;

      setQuote({ ...quoteData, items: items || [] });

      // Se a cotação tem supplier_id, buscar dados do fornecedor
      if (quoteData?.supplier_id) {
        const { data: supplier, error: supplierError } = await supabase
          .from('suppliers')
          .select('id, name, cnpj, email, phone, whatsapp')
          .eq('id', quoteData.supplier_id)
          .maybeSingle();

        if (!supplierError && supplier) {
          setExistingSupplier(supplier);
          setSupplierData({
            id: supplier.id,
            name: supplier.name || '',
            cnpj: supplier.cnpj || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            whatsapp: supplier.whatsapp || ''
          });
        }
      }

    } catch (error) {
      console.error('Error validating token:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da cotação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmData = () => {
    // Validações básicas
    if (!supplierData.name || !supplierData.email) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha pelo menos nome e email",
        variant: "destructive"
      });
      return;
    }

    setDataConfirmed(true);
  };

  // Função para converter arquivo em base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Função para extrair dados do PDF
  const extractDataFromPdf = async (file: File) => {
    setIsExtractingFromPdf(true);
    setExtractionSuccess(false);
    
    try {
      toast({
        title: '🔍 Analisando PDF...',
        description: 'Extraindo dados automaticamente com IA.'
      });

      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('extract-supplier-proposal', {
        body: { pdfBase64: base64, fileName: file.name }
      });

      if (error) {
        console.error('❌ [PDF-EXTRACT] Erro:', error);
        toast({
          title: 'Erro na extração',
          description: 'Não foi possível extrair dados do PDF. Preencha manualmente.',
          variant: 'destructive'
        });
        return;
      }

      if (!data?.success) {
        console.error('❌ [PDF-EXTRACT] Extração falhou:', data?.error);
        toast({
          title: 'Extração incompleta',
          description: data?.error || 'Não foi possível extrair todos os dados. Verifique e complete manualmente.',
          variant: 'destructive'
        });
        return;
      }

      console.log('✅ [PDF-EXTRACT] Dados extraídos:', data);

      // Preencher campos do formulário com dados extraídos
      setProposalData(prev => ({
        ...prev,
        totalAmount: data.total_amount !== undefined ? String(data.total_amount - (data.shipping_cost || 0)) : prev.totalAmount,
        shippingCost: data.shipping_cost !== undefined ? String(data.shipping_cost) : prev.shippingCost,
        deliveryDays: data.delivery_days !== undefined ? String(data.delivery_days) : prev.deliveryDays,
        warrantyMonths: data.warranty_months !== undefined ? String(data.warranty_months) : prev.warrantyMonths,
        notes: data.notes || prev.notes
      }));

      setExtractionSuccess(true);
      
      toast({
        title: '✅ Dados extraídos com sucesso!',
        description: `${data.items?.length || 0} itens encontrados. Verifique os valores e ajuste se necessário.`
      });

    } catch (error) {
      console.error('❌ [PDF-EXTRACT] Erro geral:', error);
      toast({
        title: 'Erro na extração',
        description: 'Ocorreu um erro ao processar o PDF.',
        variant: 'destructive'
      });
    } finally {
      setIsExtractingFromPdf(false);
    }
  };

  // Handler para seleção de arquivo via dropzone
  const handleFileSelect = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ 
        title: 'Arquivo muito grande', 
        description: 'O arquivo deve ter no máximo 10MB.',
        variant: 'destructive' 
      });
      return;
    }
    
    setAttachment(file);
    setExtractionSuccess(false);

    // Se for PDF, tentar extrair dados automaticamente
    if (file.type === 'application/pdf') {
      await extractDataFromPdf(file);
    } else {
      toast({
        title: '✅ Arquivo selecionado',
        description: `${file.name} será enviado com sua resposta.`
      });
    }
  };

  // Handler para remover arquivo
  const handleRemoveFile = () => {
    setAttachment(null);
    setExtractionSuccess(false);
  };

  const handleSubmitProposal = async () => {
    try {
      setSubmitting(true);

      // VALIDAÇÃO: Se requer visita E não tem visita confirmada, bloquear
      if (quote?.requires_visit && !hasConfirmedVisit) {
        toast({
          title: "Visita técnica pendente",
          description: "Você precisa agendar e confirmar a visita técnica antes de enviar a proposta.",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      // Validações
      if (!proposalData.totalAmount || !proposalData.deliveryDays) {
        toast({
          title: "Dados incompletos",
          description: "Por favor, informe o valor total e prazo de entrega",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      let supplierId = supplierData.id;

      // Se não tem ID, verificar se fornecedor já existe
      if (!supplierId) {
        const duplicateCheck = await checkSupplierDuplicate(
          supplierData.cnpj || '',
          supplierData.email,
          supabase
        );

        if (duplicateCheck.exists && duplicateCheck.existing) {
          supplierId = duplicateCheck.existing.id;
          toast({
            title: "Fornecedor encontrado",
            description: `Vinculando proposta ao seu cadastro existente`,
          });
        } else {
          // Criar novo fornecedor
          const { data: newSupplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              name: supplierData.name,
              cnpj: normalizeCNPJ(supplierData.cnpj || ''),
              email: supplierData.email,
              phone: supplierData.phone,
              whatsapp: supplierData.whatsapp,
              status: 'pending',
              type: 'local'
            })
            .select('id')
            .single();

          if (supplierError) throw supplierError;
          supplierId = newSupplier.id;
        }
      }

      // Upload do anexo se existir
      let attachmentUrl: string | null = null;
      
      if (attachment) {
        setIsUploading(true);
        console.log('📎 [SUPPLIER-QUICK] Iniciando upload de anexo:', attachment.name);
        
        try {
          const fileExt = attachment.name.split('.').pop();
          const fileName = `${quoteId}_${supplierId}_${Date.now()}.${fileExt}`;
          const filePath = `quick-responses/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('quote-attachments')
            .upload(filePath, attachment);
          
          if (uploadError) {
            console.error('❌ [UPLOAD] Erro no upload:', uploadError);
            toast({
              title: "Erro no upload do anexo",
              description: "Não foi possível enviar o arquivo. A proposta será enviada sem anexo.",
              variant: "destructive"
            });
          } else {
            // Gerar signed URL (bucket é privado)
            const { data: signedUrlData } = await supabase.storage
              .from('quote-attachments')
              .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 ano
            
            attachmentUrl = signedUrlData?.signedUrl || null;
            console.log('✅ [UPLOAD] Anexo enviado com sucesso:', filePath);
          }
        } catch (uploadErr) {
          console.error('❌ [UPLOAD] Erro geral:', uploadErr);
        } finally {
          setIsUploading(false);
        }
      }

      // Criar resposta da cotação
      console.log('🚚 [SHIPPING-QUICK] proposalData.shippingCost (raw):', proposalData.shippingCost, typeof proposalData.shippingCost);
      const shippingValue = proposalData.shippingCost && proposalData.shippingCost !== '' 
        ? parseFloat(proposalData.shippingCost) 
        : 0;
      console.log('🚚 [SHIPPING-QUICK] shippingValue após parseFloat:', shippingValue, typeof shippingValue);
      
      const itemsTotal = parseFloat(proposalData.totalAmount);
      const finalTotalAmount = itemsTotal + (isNaN(shippingValue) ? 0 : shippingValue);
      console.log('💰 [CALCULATE-TOTAL-QUICK] itemsTotal:', itemsTotal, 'shipping:', shippingValue, 'TOTAL:', finalTotalAmount);
      
      const { error: responseError } = await supabase
        .from('quote_responses')
        .insert({
          quote_id: quoteId,
          supplier_id: supplierId,
          supplier_name: supplierData.name,
          total_amount: finalTotalAmount,
          delivery_time: parseInt(proposalData.deliveryDays),
          warranty_months: parseInt(proposalData.warrantyMonths) || 12,
          shipping_cost: isNaN(shippingValue) ? 0 : shippingValue,
          notes: proposalData.notes,
          status: 'pending',
          attachment_url: attachmentUrl
        });

      if (responseError) throw responseError;

      console.log('✅ [PROPOSAL-QUICK] Proposta inserida via Quick Response:', {
        quote_id: quoteId,
        supplier_name: supplierData.name,
        total_amount: finalTotalAmount,
        shipping_cost: isNaN(shippingValue) ? 0 : shippingValue,
        warranty_months: parseInt(proposalData.warrantyMonths) || 12,
        delivery_time: parseInt(proposalData.deliveryDays)
      });

      // Notificar cliente sobre nova proposta
      try {
        await supabase.functions.invoke('notify-client-proposal', {
          body: {
            quoteId: quoteId,
            supplierName: supplierData.name,
            totalAmount: parseFloat(proposalData.totalAmount)
          }
        });
      } catch (notifyError) {
        console.error('Erro ao notificar cliente:', notifyError);
        // Não bloqueia o fluxo se notificação falhar
      }

      toast({
        title: "Proposta enviada!",
        description: "Sua proposta foi enviada com sucesso",
      });

      // Redirecionar para página de sucesso/conversão
      navigate('/supplier/response-success', { 
        state: { 
          supplierName: supplierData.name,
          quoteId: quote?.id,
          isNewSupplier: !supplierData.id
        } 
      });

    } catch (error) {
      console.error('Error submitting proposal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a proposta",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando cotação...</p>
      </div>

      {/* Modal de Gestão de Visita */}
      {quote && quote.requires_visit && (
        <VisitManagementModal
          quote={quote}
          open={visitModalOpen}
          onOpenChange={setVisitModalOpen}
          onVisitUpdated={() => {
            fetchVisits();
          }}
        />
      )}
    </div>
  );
}

  if (!quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Cotação não encontrada</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Não foi possível carregar os dados desta cotação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Responder Cotação</h1>
          <p className="text-muted-foreground">
            Confirme seus dados e envie sua proposta rapidamente
          </p>
        </div>

        {/* Dados da Cotação */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {quote.title}
                </CardTitle>
                <CardDescription>Cotação #{quote.local_code || quote.id}</CardDescription>
              </div>
              <Badge variant="outline" className="shrink-0">
                <Building2 className="w-3 h-3 mr-1" />
                {quote.client_name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.description && (
              <div>
                <p className="text-sm font-medium mb-1">Descrição</p>
                <p className="text-sm text-muted-foreground">{quote.description}</p>
              </div>
            )}

            {quote.deadline && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Prazo: {new Date(quote.deadline).toLocaleDateString('pt-BR')}</span>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium mb-3">Itens solicitados</p>
              <div className="space-y-2">
                {quote.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium">{item.product_name}</span>
                    </div>
                    <Badge variant="secondary">
                      Qtd: {item.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerta de Visita Técnica Obrigatória */}
        {quote.requires_visit && !hasConfirmedVisit && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Visita Técnica Obrigatória
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-200">
                      Esta cotação requer uma visita técnica ao local antes de enviar sua proposta. 
                      Clique no botão abaixo para agendar e confirmar a visita.
                    </p>
                  </div>
                  
                  {/* Status da visita */}
                  {visitsLoading ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Carregando informações da visita...
                    </p>
                  ) : latestVisit ? (
                    <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 p-2 rounded">
                      <strong>Status:</strong>{' '}
                      {latestVisit.status === 'scheduled' 
                        ? `Agendada para ${new Date(latestVisit.scheduled_date).toLocaleString('pt-BR')}`
                        : latestVisit.status === 'confirmed'
                        ? '✅ Confirmada - Você já pode enviar a proposta'
                        : latestVisit.status}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Nenhuma visita agendada ainda
                    </p>
                  )}
                  
                  {quote.visit_deadline && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Prazo para visita: {new Date(quote.visit_deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setVisitModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
                  >
                    {latestVisit?.status === 'scheduled' 
                      ? 'Gerenciar Visita' 
                      : 'Agendar Visita Agora'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badge de visita confirmada */}
        {quote.requires_visit && hasConfirmedVisit && (
          <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✅ Visita técnica confirmada! Você já pode enviar sua proposta.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados do Fornecedor */}
        {!dataConfirmed ? (
          <Card>
            <CardHeader>
              <CardTitle>Seus Dados</CardTitle>
              <CardDescription>
                {existingSupplier 
                  ? "Confirme se seus dados estão corretos" 
                  : "Preencha seus dados para continuar"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome / Razão Social *</Label>
                  <Input
                    id="name"
                    value={supplierData.name}
                    onChange={(e) => setSupplierData({ ...supplierData, name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={supplierData.cnpj}
                    onChange={(e) => setSupplierData({ ...supplierData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={supplierData.email}
                    onChange={(e) => setSupplierData({ ...supplierData, email: e.target.value })}
                    placeholder="email@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={supplierData.phone}
                    onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })}
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={supplierData.whatsapp}
                    onChange={(e) => setSupplierData({ ...supplierData, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <Button onClick={handleConfirmData} className="w-full">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Dados e Continuar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Dados confirmados - resumo */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Dados confirmados
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {supplierData.name} • {supplierData.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDataConfirmed(false)}
                  >
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Formulário de Proposta */}
            <Card id="proposal-section">
              <CardHeader>
                <CardTitle>Sua Proposta</CardTitle>
                <CardDescription>
                  Escolha como deseja enviar sua proposta comercial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Seletor de Método */}
                <ProposalMethodSelector
                  selectedMethod={proposalMethod}
                  onMethodChange={setProposalMethod}
                  hasAttachment={!!attachment}
                  attachmentName={attachment?.name}
                />

                {/* Upload Zone - Mostra quando PDF está selecionado */}
                {proposalMethod === 'pdf' && (
                  <PdfUploadZone
                    attachment={attachment}
                    isExtracting={isExtractingFromPdf}
                    extractionSuccess={extractionSuccess}
                    onFileSelect={handleFileSelect}
                    onRemoveFile={handleRemoveFile}
                  />
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Valor Total dos Itens (sem frete) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={proposalData.totalAmount}
                        onChange={(e) => setProposalData({ ...proposalData, totalAmount: e.target.value })}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryDays">Prazo de Entrega (dias) *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="deliveryDays"
                        type="number"
                        value={proposalData.deliveryDays}
                        onChange={(e) => setProposalData({ ...proposalData, deliveryDays: e.target.value })}
                        placeholder="Ex: 15"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warrantyMonths">Garantia (meses) *</Label>
                    <Input
                      id="warrantyMonths"
                      type="number"
                      min="0"
                      max="120"
                      value={proposalData.warrantyMonths}
                      onChange={(e) => setProposalData({ ...proposalData, warrantyMonths: e.target.value })}
                      placeholder="Ex: 12"
                    />
                    <p className="text-xs text-muted-foreground">
                      Período de garantia oferecido (0-120 meses)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingCost">Custo de Frete (R$) *</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="shippingCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={proposalData.shippingCost}
                        onChange={(e) => setProposalData({ ...proposalData, shippingCost: e.target.value })}
                        placeholder="0.00 (digite 0 se grátis)"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Informe 0 se o frete for grátis
                    </p>
                  </div>
                </div>

                {/* Prévia do Total Final */}
                {proposalData.totalAmount && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal dos Itens:</span>
                        <span className="font-medium">
                          R$ {parseFloat(proposalData.totalAmount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {proposalData.shippingCost && parseFloat(proposalData.shippingCost) > 0 && (
                        <div className="flex justify-between">
                          <span>Frete:</span>
                          <span className="font-medium">
                            R$ {parseFloat(proposalData.shippingCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t text-base">
                        <span className="font-bold">TOTAL FINAL:</span>
                        <span className="font-bold text-primary">
                          R$ {(
                            parseFloat(proposalData.totalAmount || '0') + 
                            parseFloat(proposalData.shippingCost || '0')
                          ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={proposalData.notes}
                    onChange={(e) => setProposalData({ ...proposalData, notes: e.target.value })}
                    placeholder="Informações adicionais sobre sua proposta..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleSubmitProposal}
                  disabled={submitting || isUploading || !canSubmitProposal}
                  className="w-full"
                  size="lg"
                >
                  {submitting || isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isUploading ? 'Enviando anexo...' : 'Enviando proposta...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enviar Proposta
                      {attachment && <span className="ml-1 text-xs opacity-75">(com anexo)</span>}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Modal de Gestão de Visita */}
      {quote && quote.requires_visit && (
        <VisitManagementModal
          quote={quote}
          open={visitModalOpen}
          onOpenChange={setVisitModalOpen}
          onVisitUpdated={() => {
            fetchVisits();
          }}
        />
      )}
    </div>
  );
};

export default SupplierQuickResponse;
