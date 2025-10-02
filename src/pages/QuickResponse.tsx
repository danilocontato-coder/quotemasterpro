import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, DollarSign, FileText, Upload, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function QuickResponse() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  
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
        
        setQuoteData(data.quote);
        
        // Pré-preencher dados se fornecedor já cadastrado
        if (data.quote?.supplier_name) {
          setFormData(prev => ({ 
            ...prev, 
            supplierName: data.quote.supplier_name 
          }));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Resposta Rápida</h1>
          <p className="text-muted-foreground">Envie sua proposta de forma ágil</p>
        </div>

        {quoteData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Detalhes da Cotação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cotação:</span>
                <span className="font-medium">#{quoteData.id}</span>
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
                  <p className="text-sm bg-muted p-2 rounded">{quoteData.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sua Proposta</CardTitle>
            <p className="text-sm text-muted-foreground">Preencha os dados abaixo para enviar sua proposta</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    disabled={loading}
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
                    disabled={loading}
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
                <Label htmlFor="attachment">Anexar Proposta (opcional)</Label>
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
                <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX (máx. 10MB)</p>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Proposta'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
