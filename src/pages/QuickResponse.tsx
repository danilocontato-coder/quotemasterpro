import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, DollarSign, FileText, Upload, Package, Edit2, Users, Zap, TrendingUp, Award } from 'lucide-react';
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
  
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierEmail: '',
    totalAmount: '',
    notes: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierName || !formData.supplierEmail || !formData.totalAmount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha empresa, e-mail e valor total.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.totalAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor numérico válido.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Upload de anexo se houver
      let attachmentUrl = null;
      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${token}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('quote-attachments')
          .upload(`quick-responses/${fileName}`, attachment);
        
        if (uploadError) {
          console.error('Erro no upload:', uploadError);
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
      }
      
      // Submeter resposta via edge function
      const { data, error } = await supabase.functions.invoke('submit-quick-response', {
        body: {
          token,
          supplier_name: formData.supplierName,
          supplier_email: formData.supplierEmail,
          total_amount: amount,
          notes: formData.notes || null,
          attachment_url: attachmentUrl
        }
      });
      
      if (error || !data?.success) {
        throw new Error(data?.error || 'Erro ao submeter resposta');
      }
      
      toast({
        title: "Resposta enviada!",
        description: "Sua proposta foi enviada com sucesso."
      });
      
      // Redirecionar para página de sucesso
      navigate('/r/success');
      
    } catch (error: any) {
      console.error('Erro ao enviar resposta:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar sua resposta.",
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
                    <span className="font-bold text-primary">#{quoteData.id}</span>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Sua Proposta
                </CardTitle>
                <p className="text-sm text-muted-foreground">Preencha os dados abaixo para enviar sua proposta</p>
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
                  
                  <div>
                    <Label htmlFor="totalAmount">Valor Total da Proposta *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="totalAmount"
                        type="text"
                        value={formData.totalAmount}
                        onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                        placeholder="R$ 0,00"
                        className="pl-10"
                        disabled={loading}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Exemplo: 1500.00 ou 1.500,00</p>
                  </div>
                  
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
                  
                  <Button type="submit" className="w-full" disabled={loading || isExtractingFromPdf}>
                    {loading ? 'Enviando...' : isExtractingFromPdf ? '🤖 Processando PDF...' : 'Enviar Proposta'}
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
