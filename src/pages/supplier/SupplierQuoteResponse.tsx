import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Plus, Trash2, Building2, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
          *,
          quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;

      setQuote({
        ...quote,
        items: quote.quote_items || []
      });
      
      // Inicializar itens da proposta baseado nos itens da cotação
      const initialItems = quote.quote_items.map((item: any) => ({
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
            whatsapp: ''
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
              description: item.description,
              brand: item.brand || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            })));
          }
          
          toast({
            title: "Sucesso",
            description: "Dados extraídos do PDF com sucesso!"
          });
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

      // Verificar se fornecedor já existe ou criar novo
      let supplierId;
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('email', supplierData.email)
        .single();

      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        const { data: newSupplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert({
            name: supplierData.name,
            cnpj: supplierData.cnpj,
            email: supplierData.email,
            phone: supplierData.phone,
            whatsapp: supplierData.whatsapp,
            status: 'active'
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Envio de Proposta</h1>
          <p className="text-muted-foreground">Responda à solicitação de cotação</p>
        </div>

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

        {/* Método de Envio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Método de Envio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={uploadMethod === 'manual' ? 'default' : 'outline'}
                onClick={() => setUploadMethod('manual')}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Formulário Manual
              </Button>
              <Button
                variant={uploadMethod === 'pdf' ? 'default' : 'outline'}
                onClick={() => setUploadMethod('pdf')}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload de PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload de PDF */}
        {uploadMethod === 'pdf' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload da Proposta em PDF</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Envie sua proposta em PDF</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Nossa IA irá extrair automaticamente os dados da sua proposta
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  disabled={extracting}
                  className="hidden"
                  id="pdf-upload"
                />
                <Label htmlFor="pdf-upload">
                  <Button variant="outline" disabled={extracting} asChild>
                    <span>
                      {extracting ? 'Extraindo dados...' : 'Selecionar PDF'}
                    </span>
                  </Button>
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados do Fornecedor */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dados do Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierName">Nome da Empresa *</Label>
                <Input
                  id="supplierName"
                  value={supplierData.name}
                  onChange={(e) => setSupplierData({...supplierData, name: e.target.value})}
                  placeholder="Razão social da empresa"
                />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={supplierData.cnpj}
                  onChange={(e) => setSupplierData({...supplierData, cnpj: e.target.value})}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={supplierData.email}
                  onChange={(e) => setSupplierData({...supplierData, email: e.target.value})}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={supplierData.phone}
                  onChange={(e) => setSupplierData({...supplierData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens da Proposta */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Itens da Proposta
              <Button onClick={addProposalItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proposalItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-sm font-medium">Item {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProposalItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2">
                      <Label>Descrição</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateProposalItem(index, 'description', e.target.value)}
                        placeholder="Descrição do produto/serviço"
                      />
                    </div>
                    <div>
                      <Label>Marca</Label>
                      <Input
                        value={item.brand}
                        onChange={(e) => updateProposalItem(index, 'brand', e.target.value)}
                        placeholder="Marca"
                      />
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateProposalItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Valor Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateProposalItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-sm text-muted-foreground">Total do item: </span>
                    <span className="font-medium">
                      R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {proposalItems.length > 0 && (
              <Separator className="my-4" />
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total da Proposta:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Condições da Proposta */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Condições da Proposta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryTime">Prazo de Entrega (dias)</Label>
                <Input
                  id="deliveryTime"
                  type="number"
                  value={proposalData.deliveryTime}
                  onChange={(e) => setProposalData({...proposalData, deliveryTime: e.target.value})}
                  placeholder="Ex: 15"
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Validade da Proposta</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={proposalData.validUntil}
                  onChange={(e) => setProposalData({...proposalData, validUntil: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
                <Input
                  id="paymentTerms"
                  value={proposalData.paymentTerms}
                  onChange={(e) => setProposalData({...proposalData, paymentTerms: e.target.value})}
                  placeholder="Ex: 30 dias, PIX à vista, etc."
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={proposalData.notes}
                  onChange={(e) => setProposalData({...proposalData, notes: e.target.value})}
                  placeholder="Informações adicionais sobre a proposta"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1"
            size="lg"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {submitting ? 'Enviando...' : 'Enviar Proposta'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            size="lg"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierQuoteResponse;