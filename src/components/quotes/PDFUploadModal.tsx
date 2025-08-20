import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Bot, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  quoteName: string;
  onDataExtracted: (data: ExtractedData) => void;
}

export interface ExtractedData {
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  supplier: {
    name: string;
    cnpj?: string;
    contact?: string;
  };
  total: number;
  validUntil?: string;
  deliveryTime?: string;
  observations?: string;
}

export function PDFUploadModal({ isOpen, onClose, quoteId, quoteName, onDataExtracted }: PDFUploadModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'upload' | 'extract' | 'complete'>('upload');
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF válido",
        variant: "destructive",
      });
    }
  };

  const simulateAIExtraction = async (file: File): Promise<ExtractedData> => {
    // Simulate AI processing steps
    setProcessingStep('extract');
    setProgress(25);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProgress(50);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setProgress(75);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setProgress(100);
    setProcessingStep('complete');

    // Mock extracted data based on file name or random generation
    const mockData: ExtractedData = {
      items: [
        {
          description: "Material de limpeza - Detergente neutro 5L",
          quantity: 10,
          unitPrice: 15.50,
          total: 155.00
        },
        {
          description: "Papel higiênico - Pacote com 12 rolos",
          quantity: 25,
          unitPrice: 18.90,
          total: 472.50
        },
        {
          description: "Desinfetante multiuso 2L",
          quantity: 15,
          unitPrice: 8.75,
          total: 131.25
        }
      ],
      supplier: {
        name: "Fornecedor Alpha Ltda",
        cnpj: "12.345.678/0001-90",
        contact: "contato@alpha.com"
      },
      total: 758.75,
      validUntil: "2024-09-15",
      deliveryTime: "5 dias úteis",
      observations: "Frete incluso para compras acima de R$ 500,00"
    };

    return mockData;
  };

  const handleProcessPDF = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const extractedData = await simulateAIExtraction(file);
      setExtractedData(extractedData);

      toast({
        title: "PDF Processado com Sucesso",
        description: "Dados extraídos automaticamente pela IA",
      });

    } catch (error) {
      toast({
        title: "Erro no Processamento",
        description: "Falha ao extrair dados do PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setIsProcessing(false);
    setProcessingStep('upload');
    setProgress(0);
    setExtractedData(null);
    onClose();
  };

  const getStepIcon = (step: string) => {
    if (processingStep === 'complete') return <Check className="w-4 h-4 text-green-600" />;
    if (processingStep === step && isProcessing) return <Loader2 className="w-4 h-4 animate-spin" />;
    return <div className="w-4 h-4 rounded-full bg-gray-300" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de Orçamento - {quoteName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <Label htmlFor="pdf-upload">Arquivo PDF do Orçamento</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {file ? file.name : "Clique para selecionar um arquivo PDF"}
                </p>
              </label>
            </div>
          </div>

          {/* Processing Steps */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleProcessPDF} 
                  disabled={isProcessing || extractedData !== null}
                  className="flex items-center gap-2"
                >
                  <Bot className="w-4 h-4" />
                  {isProcessing ? "Processando..." : "Extrair Dados com IA"}
                </Button>
              </div>

              {isProcessing && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Processando PDF com IA</span>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {getStepIcon('upload')}
                          <span className="text-sm">Upload do arquivo</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStepIcon('extract')}
                          <span className="text-sm">Extração de dados</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStepIcon('complete')}
                          <span className="text-sm">Validação e estruturação</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Extracted Data Preview */}
          {extractedData && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Check className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold">Dados Extraídos Automaticamente</h3>
                  </div>

                  {/* Supplier Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-xs text-gray-600">Fornecedor</Label>
                      <p className="font-medium">{extractedData.supplier.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">CNPJ</Label>
                      <p className="font-mono text-sm">{extractedData.supplier.cnpj}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <Label className="text-sm font-medium">Itens do Orçamento</Label>
                    <div className="mt-2 space-y-2">
                      {extractedData.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <p className="font-medium text-sm">{item.description}</p>
                            <p className="text-xs text-gray-600">Qtd: {item.quantity} x R$ {item.unitPrice.toFixed(2)}</p>
                          </div>
                          <p className="font-bold">R$ {item.total.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Valor Total</p>
                      <p className="text-2xl font-bold text-blue-600">R$ {extractedData.total.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Prazo: {extractedData.deliveryTime}</p>
                      <p className="text-xs text-gray-600">Válido até: {extractedData.validUntil}</p>
                    </div>
                  </div>

                  {extractedData.observations && (
                    <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                      <Label className="text-xs text-yellow-800">Observações</Label>
                      <p className="text-sm text-yellow-700">{extractedData.observations}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {extractedData && (
              <Button onClick={handleConfirmData} className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Confirmar e Finalizar Cotação
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}