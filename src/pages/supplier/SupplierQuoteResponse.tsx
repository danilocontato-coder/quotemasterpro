import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Plus, Trash2, Building2, Clock, DollarSign, UserPlus, HelpCircle, Calculator, Eye, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkSupplierDuplicate, normalizeCNPJ } from '@/lib/supplierDeduplication';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Quote {
  id: string;
  title: string;
  description: string;
  deadline: string;
  client_name: string;
  items: QuoteItem[];
}

interface ProposalItem {
  description: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const SupplierQuoteResponse = () => {
  const { quoteId, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showClaimAccount, setShowClaimAccount] = useState(false);
  const [existingSupplier, setExistingSupplier] = useState<any>(null);
  
  const [supplierData, setSupplierData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: ''
  });
  
  const [proposalData, setProposalData] = useState({
    deliveryTime: '',
    paymentTerms: '',
    validUntil: '',
    notes: ''
  });
  
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [uploadMethod, setUploadMethod] = useState<'pdf' | 'manual'>('manual');
  const [showHelp, setShowHelp] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (quoteId && token) {
      fetchQuoteData();
    }
  }, [quoteId, token]);

  const fetchQuoteData = async () => {
    try {
      setLoading(true);
      
      // Verificar token e buscar cotação
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(`
          *
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;

      // Buscar itens separadamente para evitar recursão RLS
      const { data: items, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (itemsError) {
        console.error('Error fetching quote items:', itemsError);
      }

      setQuote({
        ...quote,
        items: items || []
      });
      
      // Inicializar itens da proposta baseado nos itens da cotação
      const initialItems = (items || []).map((item: any) => ({
        description: item.product_name,
        brand: '',
        quantity: item.quantity,
        unitPrice: 0,
        totalPrice: 0
      }));
      
      setProposalItems(initialItems);
      
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da cotação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive"
      });
      return;
    }

    try {
      setExtracting(true);
      
      // Converter PDF para base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        
        // Chamar edge function para extrair dados
        const { data, error } = await supabase.functions.invoke('extract-pdf-data', {
          body: {
            base64Content,
            filename: file.name
          }
        });

        if (error) throw error;

        if (data.success) {
          const extracted = data.data;
          
          // Preencher dados do fornecedor
          setSupplierData({
            name: extracted.supplierName || '',
            cnpj: extracted.cnpj || '',
            email: extracted.contact?.email || '',
            phone: extracted.contact?.phone || '',
            whatsapp: extracted.contact?.phone || ''
          });
          
          // Preencher dados da proposta
          setProposalData({
            deliveryTime: extracted.deliveryTime || '',
            paymentTerms: extracted.paymentTerms || '',
            validUntil: extracted.validUntil || '',
            notes: extracted.notes || ''
          });
          
          // Preencher itens
          if (extracted.items && extracted.items.length > 0) {
            setProposalItems(extracted.items.map((item: any) => ({
              description: item.description || '',
              brand: item.brand || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0
            })));
          }
          
          toast({
            title: "✅ Dados extraídos com sucesso!",
            description: "Revise as informações e ajuste se necessário antes de enviar.",
          });

          // Avançar para o próximo step automaticamente
          setCurrentStep(2);
        } else {
          throw new Error(data.error);
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error extracting PDF data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível extrair os dados do PDF",
        variant: "destructive"
      });
    } finally {
      setExtracting(false);
    }
  };

  const addProposalItem = () => {
    setProposalItems([...proposalItems, {
      description: '',
      brand: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    }]);
  };

  const removeProposalItem = (index: number) => {
    setProposalItems(proposalItems.filter((_, i) => i !== index));
  };

  const updateProposalItem = (index: number, field: keyof ProposalItem, value: any) => {
    const updated = [...proposalItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalcular total se quantidade ou preço unitário mudou
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    }
    
    setProposalItems(updated);
  };

  const calculateTotal = () => {
    return proposalItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validações
      if (!supplierData.name || !supplierData.email) {
        toast({
          title: "Erro",
          description: "Nome e email são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      if (proposalItems.length === 0) {
        toast({
          title: "Erro", 
          description: "Adicione pelo menos um item à proposta",
          variant: "destructive"
        });
        return;
      }

      // Check for existing supplier using deduplication logic
      const duplicateCheck = await checkSupplierDuplicate(
        supplierData.cnpj || '',
        supplierData.email || '',
        supabase
      );

      let supplierId;
      if (duplicateCheck.exists && duplicateCheck.existing) {
        // Use existing supplier
        supplierId = duplicateCheck.existing.id;
        setExistingSupplier(duplicateCheck.existing);
        
        toast({
          title: "Fornecedor encontrado",
          description: `Vinculando proposta ao fornecedor existente: ${duplicateCheck.existing.name}`,
        });
      } else {
        // Create new supplier
        const { data: newSupplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert({
            name: supplierData.name,
            cnpj: normalizeCNPJ(supplierData.cnpj || ''),
            email: supplierData.email,
            phone: supplierData.phone,
            whatsapp: supplierData.whatsapp,
            status: 'active',
            type: 'local' // Default for suppliers responding via link
          })
          .select('id')
          .single();

        if (supplierError) throw supplierError;
        supplierId = newSupplier.id;
      }

      // Criar resposta da cotação
      const { error: responseError } = await supabase
        .from('quote_responses')
        .insert({
          quote_id: quoteId,
          supplier_id: supplierId,
          supplier_name: supplierData.name,
          total_amount: calculateTotal(),
          delivery_time: parseInt(proposalData.deliveryTime) || null,
          notes: proposalData.notes,
          status: 'pending'
        });

      if (responseError) throw responseError;

      toast({
        title: "Sucesso",
        description: "Proposta enviada com sucesso!"
      });

      // Redirecionar para página de confirmação
      navigate('/supplier/response-success');
      
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando cotação...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Cotação não encontrada</h2>
            <p className="text-muted-foreground">A cotação solicitada não existe ou não está mais disponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header com progresso */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Envio de Proposta</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="ml-2"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mb-6">Responda à solicitação de cotação de forma simples e rápida</p>
          
          {/* Indicador de progresso */}
          <div className="flex justify-center items-center gap-4 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${getStepStatus(step) === 'completed' ? 'bg-green-500 text-white' :
                    getStepStatus(step) === 'current' ? 'bg-primary text-white' :
                    'bg-gray-200 text-gray-600'}
                `}>
                  {getStepStatus(step) === 'completed' ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
                {step < 3 && <div className="w-16 h-1 bg-gray-200 mx-2" />}
              </div>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {currentStep === 1 && "Escolha como enviar sua proposta"}
            {currentStep === 2 && "Preencha os dados da sua empresa"}
            {currentStep === 3 && "Revise e envie sua proposta"}
          </div>
        </div>

        {/* Painel de ajuda */}
        {showHelp && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">Como funciona?</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>Opção 1 - Upload de PDF:</strong> Envie seu orçamento em PDF e nossa IA extrairá automaticamente as informações.</p>
                    <p><strong>Opção 2 - Digitação Manual:</strong> Preencha os campos manualmente com os dados da sua proposta.</p>
                    <p><strong>Dica:</strong> Você pode combinar as duas opções - fazer upload do PDF e depois ajustar as informações.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações da Cotação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Detalhes da Cotação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">ID da Cotação</Label>
                <p className="text-lg font-mono">{quote.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Cliente</Label>
                <p className="text-lg">{quote.client_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Título</Label>
                <p className="text-lg">{quote.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <Label className="text-sm font-medium">Prazo</Label>
                <Badge variant="outline">
                  {quote.deadline ? new Date(quote.deadline).toLocaleDateString() : 'Não definido'}
                </Badge>
              </div>
            </div>
            {quote.description && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Descrição</Label>
                <p className="text-sm text-muted-foreground mt-1">{quote.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Método de Envio - Step 1 */}
        {currentStep === 1 && (
          <Card className="mb-6 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Como você gostaria de enviar sua proposta?</CardTitle>
              <p className="text-sm text-muted-foreground">Escolha a opção mais conveniente para você</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    uploadMethod === 'pdf' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setUploadMethod('pdf')}
                >
                  <CardContent className="pt-6 text-center">
                    <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Upload de PDF</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Já tem um orçamento pronto? Nossa IA extrai automaticamente todos os dados!
                    </p>
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✨ Mais rápido e automático
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    uploadMethod === 'manual' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setUploadMethod('manual')}
                >
                  <CardContent className="pt-6 text-center">
                    <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Digitação Manual</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Prefere digitar? Formulário simples e intuitivo para preencher.
                    </p>
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      📝 Controle total dos dados
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!uploadMethod}
                  size="lg"
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload de PDF - Step 2 quando PDF selecionado */}
        {currentStep === 2 && uploadMethod === 'pdf' && (
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload da Proposta em PDF
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Nossa inteligência artificial irá extrair automaticamente todos os dados da sua proposta
              </p>
            </CardHeader>
            <CardContent>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                extracting ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-primary'
              }`}>
                {extracting ? (
                  <div className="space-y-4">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-lg font-medium text-primary">Analisando seu PDF...</p>
                    <p className="text-sm text-muted-foreground">
                      Nossa IA está extraindo as informações. Isso pode levar alguns segundos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 mx-auto text-primary" />
                    <div>
                      <p className="text-xl font-medium mb-2">Envie sua proposta em PDF</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Formatos aceitos: PDF • Tamanho máximo: 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePDFUpload}
                      disabled={extracting}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <Label htmlFor="pdf-upload">
                      <Button size="lg" disabled={extracting} asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Selecionar Arquivo PDF
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      💡 Após o upload, você poderá revisar e ajustar as informações extraídas
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Voltar
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)} 
                  disabled={proposalItems.length === 0}
                  variant="outline"
                >
                  Pular Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados do Fornecedor - Step 2 quando manual ou Step 3 quando PDF */}
        {((currentStep === 2 && uploadMethod === 'manual') || currentStep >= 2) && (
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dados do Fornecedor
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Informações da sua empresa para contato
              </p>
            </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierName" className="flex items-center gap-1">
                  Nome da Empresa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="supplierName"
                  value={supplierData.name}
                  onChange={(e) => setSupplierData({...supplierData, name: e.target.value})}
                  placeholder="Ex: Empresa ABC Ltda"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  value={supplierData.cnpj}
                  onChange={(e) => setSupplierData({...supplierData, cnpj: e.target.value})}
                  placeholder="00.000.000/0000-00"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="email" className="flex items-center gap-1">
                  E-mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={supplierData.email}
                  onChange={(e) => setSupplierData({...supplierData, email: e.target.value})}
                  placeholder="contato@empresa.com"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone/WhatsApp</Label>
                <Input
                  id="phone"
                  value={supplierData.phone}
                  onChange={(e) => setSupplierData({...supplierData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                  className="text-base"
                />
              </div>
            </div>
            
            {(currentStep === 2 && uploadMethod === 'manual') && (
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Voltar
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)} 
                  disabled={!supplierData.name || !supplierData.email}
                >
                  Continuar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Itens da Proposta - Step 3 */}
        {currentStep === 3 && (
          <>
            <Card className="mb-6 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Itens da Proposta
                  </div>
                  <Button onClick={addProposalItem} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Adicione os produtos ou serviços da sua proposta
                </p>
              </CardHeader>
              <CardContent>
                {proposalItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">Nenhum item adicionado ainda</p>
                    <p className="text-sm mb-4">Clique em "Adicionar Item" para começar</p>
                    <Button onClick={addProposalItem} size="lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposalItems.map((item, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                                {index + 1}
                              </span>
                              <h4 className="font-medium">Item {index + 1}</h4>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProposalItem(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="lg:col-span-2">
                              <Label className="text-sm font-medium">Descrição *</Label>
                              <Input
                                value={item.description}
                                onChange={(e) => updateProposalItem(index, 'description', e.target.value)}
                                placeholder="Ex: Produto XYZ, Serviço ABC..."
                                className="text-base"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Marca (opcional)</Label>
                              <Input
                                value={item.brand}
                                onChange={(e) => updateProposalItem(index, 'brand', e.target.value)}
                                placeholder="Ex: Samsung, Nike..."
                                className="text-base"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Quantidade *</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateProposalItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                min="1"
                                className="text-base"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Valor Unit. (R$) *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateProposalItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                placeholder="0,00"
                                className="text-base"
                              />
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total do item:</span>
                            <span className="text-lg font-bold text-primary">
                              R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {proposalItems.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div className="bg-primary/10 p-6 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-semibold">Total da Proposta:</span>
                        <span className="text-3xl font-bold text-primary">
                          R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Condições da Proposta */}
            <Card className="mb-6 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Condições da Proposta
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Defina os prazos e condições comerciais
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryTime" className="text-sm font-medium">
                      Prazo de Entrega (dias)
                    </Label>
                    <Input
                      id="deliveryTime"
                      type="number"
                      value={proposalData.deliveryTime}
                      onChange={(e) => setProposalData({...proposalData, deliveryTime: e.target.value})}
                      placeholder="Ex: 15"
                      className="text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil" className="text-sm font-medium">
                      Validade da Proposta
                    </Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={proposalData.validUntil}
                      onChange={(e) => setProposalData({...proposalData, validUntil: e.target.value})}
                      className="text-base"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="paymentTerms" className="text-sm font-medium">
                      Condições de Pagamento
                    </Label>
                    <Input
                      id="paymentTerms"
                      value={proposalData.paymentTerms}
                      onChange={(e) => setProposalData({...proposalData, paymentTerms: e.target.value})}
                      placeholder="Ex: À vista, 30 dias, PIX com desconto..."
                      className="text-base"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="notes" className="text-sm font-medium">
                      Observações (opcional)
                    </Label>
                    <Textarea
                      id="notes"
                      value={proposalData.notes}
                      onChange={(e) => setProposalData({...proposalData, notes: e.target.value})}
                      placeholder="Informações adicionais, garantias, condições especiais..."
                      rows={3}
                      className="text-base"
                    />
                  </div>
                </div>
                
                {/* Optional: Show "Create Account" button for existing suppliers */}
                {existingSupplier && !showClaimAccount && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <UserPlus className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-800 mb-2 font-medium">
                          Fornecedor já cadastrado na plataforma
                        </p>
                        <p className="text-xs text-blue-700 mb-3">
                          Deseja criar uma conta para acessar a plataforma diretamente no futuro?
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowClaimAccount(true)}
                          className="text-blue-700 border-blue-300 hover:bg-blue-100"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Criar Conta e Vincular
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Botões de Ação Finais */}
        {currentStep === 3 && (
          <Card className="shadow-lg border-green-200">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Eye className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Revisar e Enviar Proposta</h3>
                <p className="text-muted-foreground">
                  Verifique se todas as informações estão corretas antes de enviar
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium mb-2">Resumo da Proposta:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Empresa:</strong> {supplierData.name || 'Não informado'}</p>
                  <p><strong>E-mail:</strong> {supplierData.email || 'Não informado'}</p>
                  <p><strong>Itens:</strong> {proposalItems.length} item(ns)</p>
                  <p><strong>Valor Total:</strong> R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p><strong>Prazo:</strong> {proposalData.deliveryTime ? `${proposalData.deliveryTime} dias` : 'Não informado'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  size="lg"
                  className="sm:w-auto"
                >
                  ← Voltar para Editar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !supplierData.name || !supplierData.email || proposalItems.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Enviar Proposta
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                Ao enviar, você concorda que as informações fornecidas são verdadeiras
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SupplierQuoteResponse;