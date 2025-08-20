import React, { useState } from 'react';
import { ArrowLeft, FileText, Save, Send, Paperclip, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupplierQuotes } from '@/hooks/useSupplierQuotes';
import { useToast } from '@/hooks/use-toast';

const SupplierQuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getQuoteById, sendProposal } = useSupplierQuotes();
  const { toast } = useToast();
  
  const quote = getQuoteById(id || '');
  
  const [proposalData, setProposalData] = useState({
    items: quote?.items || [],
    deliveryTime: '',
    shippingCost: '',
    paymentTerms: '',
    observations: '',
    attachments: []
  });

  if (!quote) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Cotação não encontrada</p>
        <Button variant="outline" onClick={() => navigate('/supplier/quotes')} className="mt-4">
          Voltar para Cotações
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Aberta', variant: 'default' as const },
      under_review: { label: 'Em Revisão', variant: 'secondary' as const },
      approved: { label: 'Aprovada', variant: 'default' as const },
      rejected: { label: 'Rejeitada', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleSaveDraft = () => {
    toast({
      title: "Rascunho salvo",
      description: "Sua proposta foi salva como rascunho",
    });
  };

  const handleSendProposal = () => {
    if (!proposalData.deliveryTime || !proposalData.paymentTerms) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    sendProposal(quote.id, proposalData);
    
    toast({
      title: "Proposta enviada",
      description: "Sua proposta foi enviada com sucesso",
    });
  };

  const totalValue = proposalData.items.reduce((sum, item) => {
    const itemTotal = (item.quantity * item.unitPrice) * (1 + (item.tax || 0) / 100) * (1 - (item.discount || 0) / 100);
    return sum + itemTotal;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/supplier/quotes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cotação {quote.id}</h1>
          <p className="text-muted-foreground">{quote.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações da Solicitação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da Solicitação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cliente</p>
              <p className="font-medium">{quote.clientName}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(quote.status)}</div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Data de Envio</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{quote.sentDate}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Prazo Desejado</p>
              <p className="text-sm mt-1">{quote.desiredDeadline || 'Não especificado'}</p>
            </div>

            {quote.attachments && quote.attachments.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Anexos da Solicitação</p>
                <div className="space-y-1">
                  {quote.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded">
                      <Paperclip className="h-3 w-3" />
                      {attachment}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proposta do Fornecedor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Sua Proposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="items" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="items">Itens</TabsTrigger>
                  <TabsTrigger value="conditions">Condições</TabsTrigger>
                  <TabsTrigger value="attachments">Anexos</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="space-y-4">
                  <div className="space-y-4">
                    {proposalData.items.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Produto/Descrição</Label>
                              <Input
                                value={item.description}
                                onChange={(e) => {
                                  const newItems = [...proposalData.items];
                                  newItems[index].description = e.target.value;
                                  setProposalData(prev => ({ ...prev, items: newItems }));
                                }}
                                placeholder="Descrição do produto"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Quantidade</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...proposalData.items];
                                  newItems[index].quantity = parseInt(e.target.value) || 0;
                                  setProposalData(prev => ({ ...prev, items: newItems }));
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Preço Unitário (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newItems = [...proposalData.items];
                                  newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                                  setProposalData(prev => ({ ...prev, items: newItems }));
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Total</Label>
                              <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                                <DollarSign className="h-4 w-4 mr-1" />
                                R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-lg font-semibold">Total Geral:</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="conditions" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryTime">Prazo de Entrega *</Label>
                      <Input
                        id="deliveryTime"
                        value={proposalData.deliveryTime}
                        onChange={(e) => setProposalData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                        placeholder="Ex: 15 dias úteis"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingCost">Custo de Frete (R$)</Label>
                      <Input
                        id="shippingCost"
                        type="number"
                        step="0.01"
                        value={proposalData.shippingCost}
                        onChange={(e) => setProposalData(prev => ({ ...prev, shippingCost: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Condições de Pagamento *</Label>
                    <Textarea
                      id="paymentTerms"
                      value={proposalData.paymentTerms}
                      onChange={(e) => setProposalData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                      placeholder="Ex: 30% antecipado, 70% na entrega"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      value={proposalData.observations}
                      onChange={(e) => setProposalData(prev => ({ ...prev, observations: e.target.value }))}
                      placeholder="Informações adicionais sobre a proposta..."
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Paperclip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">Anexe documentos à sua proposta</p>
                    <Button variant="outline">
                      Selecionar Arquivos
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-6 border-t">
                <Button variant="outline" onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Rascunho
                </Button>
                <Button onClick={handleSendProposal} disabled={quote.status !== 'open'}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Proposta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupplierQuoteDetail;