import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Loader2, CheckCircle } from 'lucide-react';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteGenerated: (quote: any) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  open,
  onOpenChange,
  onQuoteGenerated
}) => {
  const { toast } = useToast();
  const { client, clientName } = useSupabaseCurrentClient();
  const { enforceLimit } = useSupabaseSubscriptionGuard();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tipo de arquivo
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Arquivo não suportado',
          description: 'Por favor, envie apenas arquivos PDF ou Word (.doc/.docx).',
          variant: 'destructive'
        });
        return;
      }

      // Verificar tamanho do arquivo (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 10MB.',
          variant: 'destructive'
        });
        return;
      }

      setUploadedFile(file);
    }
  }, [toast]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:application/pdf;base64," ou similar
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const createProductsFromExtraction = async (items: any[]) => {
    const createdProducts = [];
    
    for (const item of items) {
      try {
        // Verificar se produto já existe (por descrição similar)
        const { data: existingProducts } = await supabase
          .from('products')
          .select('id, name, code')
          .ilike('name', `%${item.description}%`)
          .limit(1);
        
        if (existingProducts && existingProducts.length > 0) {
          // Produto já existe, usar o existente
          createdProducts.push({
            product_id: existingProducts[0].id,
            product_name: existingProducts[0].name,
            product_code: existingProducts[0].code,
            quantity: item.quantity
          });
        } else {
          // Criar novo produto
          const { data: newProduct, error } = await supabase
            .from('products')
            .insert({
              name: item.description,
              description: `Extraído do PDF: ${uploadedFile?.name || 'documento'}`,
              status: 'active',
              stock_quantity: 0,
              unit_price: null
            })
            .select()
            .single();
          
          if (error) throw error;
          
          createdProducts.push({
            product_id: newProduct.id,
            product_name: newProduct.name,
            product_code: newProduct.code,
            quantity: item.quantity
          });
        }
      } catch (error) {
        console.error('Erro ao criar produto:', item.description, error);
      }
    }
    
    return createdProducts;
  };

  const createQuoteInDatabase = async (productsData: any[], notes: string) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error('Usuário não autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', authData.user.id)
      .single();

    if (!profile?.client_id) throw new Error('Cliente não identificado');

    const { data: clientData } = await supabase
      .from('clients')
      .select('name, company_name')
      .eq('id', profile.client_id)
      .single();

    if (!clientData) throw new Error('Cliente não encontrado');

    const quoteId = crypto.randomUUID();
    const timestamp = Date.now();
    const localCode = `RFQ-${timestamp.toString().slice(-8)}`;

    const { data: newQuote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        id: quoteId,
        local_code: localCode,
        title: `Cotação extraída de ${uploadedFile?.name || 'documento'}`,
        description: notes || 'Cotação criada automaticamente a partir de PDF',
        status: 'draft',
        client_id: profile.client_id,
        client_name: clientData.company_name || clientData.name
      })
      .select()
      .single();

    if (quoteError) throw quoteError;

    const quoteItems = productsData.map((prod, index) => ({
      quote_id: newQuote.id,
      product_id: prod.product_id,
      product_name: prod.product_name,
      product_code: prod.product_code,
      quantity: prod.quantity,
      unit_price: null,
      total_price: null,
      order_index: index
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems);

    if (itemsError) throw itemsError;

    return newQuote;
  };

  const handleProcessDocument = async () => {
    if (!uploadedFile) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo primeiro.',
        variant: 'destructive'
      });
      return;
    }

    const canCreate = enforceLimit('CREATE_QUOTE');
    if (!canCreate) return;

    setIsProcessing(true);
    try {
      const base64Content = await convertFileToBase64(uploadedFile);
      const { data, error } = await supabase.functions.invoke('extract-quote-from-pdf', {
        body: { pdfBase64: base64Content, fileName: uploadedFile.name }
      });

      if (error) throw error;
      if (!data.success || !data.data) throw new Error('Erro ao processar documento');

      const extractedItems = data.data.items || [];
      const notes = data.data.notes || '';

      if (extractedItems.length === 0) {
        throw new Error('Nenhum item foi extraído do documento');
      }

      toast({ title: 'Cadastrando itens...', description: `Processando ${extractedItems.length} itens` });
      const productsData = await createProductsFromExtraction(extractedItems);

      if (productsData.length === 0) {
        throw new Error('Nenhum produto pôde ser cadastrado');
      }

      toast({ title: 'Criando cotação...', description: 'Salvando cotação no banco de dados' });
      const newQuote = await createQuoteInDatabase(productsData, notes);

      onOpenChange(false);
      setUploadedFile(null);
      
      toast({
        title: 'Cotação Criada com Sucesso!',
        description: `${productsData.length} ${productsData.length === 1 ? 'item cadastrado' : 'itens cadastrados'} e cotação salva.`,
      });

      onQuoteGenerated({ quoteId: newQuote.id, openForEdit: true });
    } catch (error) {
      console.error('Error processing document:', error);
      toast({
        title: 'Erro ao Processar',
        description: error instanceof Error ? error.message : 'Não foi possível processar o documento.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Cotação por PDF
          </DialogTitle>
          <DialogDescription>
            Envie um documento PDF ou Word com a lista de produtos/serviços e a IA criará uma RFQ automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Informações do Cliente</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nome:</span> {clientName || 'Carregando...'}
              </div>
              <div>
                <span className="font-medium">Tipo:</span> {client?.company_name ? 'Empresa' : 'Condomínio'}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Endereço:</span> {client?.address || 'Não informado'}
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>Formatos aceitos:</strong> PDF, DOC, DOCX</p>
              <p><strong>Tamanho máximo:</strong> 10MB</p>
            </div>

            {!uploadedFile ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Selecione um documento</h3>
                  <p className="text-sm text-muted-foreground">
                    Arraste e solte ou clique para selecionar
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            )}
          </div>

          {/* Exemplo de documento */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
              💡 Dica para melhores resultados
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Inclua no documento: nome dos produtos, quantidades, unidades de medida, especificações técnicas e prazos desejados. 
              Exemplo: "50 unidades de detergente neutro 5L", "Prazo de entrega: 15 dias".
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
            Limpar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessDocument} 
              disabled={isProcessing || !uploadedFile}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Processar Documento
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};