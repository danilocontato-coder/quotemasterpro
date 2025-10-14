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
      .select('id, local_code, title, description, deadline, client_name, supplier_id, status')
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

  const handleSubmitProposal = async () => {
    try {
      setSubmitting(true);

      // Validações
      if (!proposalData.totalAmount || !proposalData.deliveryDays) {
        toast({
          title: "Dados incompletos",
          description: "Por favor, informe o valor total e prazo de entrega",
          variant: "destructive"
        });
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

      // Criar resposta da cotação
      const { error: responseError } = await supabase
        .from('quote_responses')
        .insert({
          quote_id: quoteId,
          supplier_id: supplierId,
          supplier_name: supplierData.name,
          total_amount: parseFloat(proposalData.totalAmount),
          delivery_time: parseInt(proposalData.deliveryDays),
          notes: proposalData.notes,
          status: 'pending'
        });

      if (responseError) throw responseError;

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
            <Card>
              <CardHeader>
                <CardTitle>Sua Proposta</CardTitle>
                <CardDescription>
                  Informe os detalhes da sua proposta comercial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Valor Total (R$) *</Label>
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
                </div>

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
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando proposta...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enviar Proposta
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierQuickResponse;
