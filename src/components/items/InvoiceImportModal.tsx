import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle2, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface InvoiceImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (importedItems: any[]) => void;
}

interface ParsedInvoiceItem {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  exists: boolean;
  category?: string;
}

export function InvoiceImportModal({ open, onOpenChange, onImportComplete }: InvoiceImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedInvoiceItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedItems([]);
      setShowResults(false);
    }
  };

  const simulateInvoiceProcessing = async (): Promise<ParsedInvoiceItem[]> => {
    // Simulate AI/OCR processing of invoice
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock parsed items from invoice
    return [
      {
        code: "MAT005",
        name: "Cimento Portland 50kg CP-II",
        quantity: 20,
        unitPrice: 28.50,
        total: 570.00,
        exists: true,
        category: "Materiais de Construção"
      },
      {
        code: "MAT006",
        name: "Cal Hidratada 20kg",
        quantity: 10,
        unitPrice: 12.00,
        total: 120.00,
        exists: false,
        category: "Materiais de Construção"
      },
      {
        code: "LMP004",
        name: "Sabão em Pó 5kg",
        quantity: 5,
        unitPrice: 25.90,
        total: 129.50,
        exists: false,
        category: "Produtos de Limpeza"
      },
      {
        code: "ELE004",
        name: "Fita Isolante 19mm",
        quantity: 15,
        unitPrice: 3.50,
        total: 52.50,
        exists: false,
        category: "Elétrica e Iluminação"
      }
    ];
  };

  const handleProcessInvoice = async () => {
    if (!file) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    setIsProcessing(true);
    
    try {
      toast.info("Processando nota fiscal...", {
        description: "Aguarde enquanto extraímos os dados da nota fiscal"
      });

      const items = await simulateInvoiceProcessing();
      setParsedItems(items);
      setShowResults(true);
      
      toast.success("Nota fiscal processada com sucesso!", {
        description: `${items.length} itens identificados`
      });
    } catch (error) {
      toast.error("Erro ao processar nota fiscal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportItems = () => {
    const itemsToImport = parsedItems.map(item => ({
      id: `imported-${Date.now()}-${item.code}`,
      code: item.code,
      name: item.name,
      description: `Importado via nota fiscal - ${file?.name}`,
      category: item.category || 'Materiais de Construção',
      stockQuantity: item.quantity,
      unitPrice: item.unitPrice,
      type: 'product',
      status: 'active',
      createdAt: new Date().toISOString(),
      imported: true,
      invoiceFile: file?.name,
    }));

    onImportComplete(itemsToImport);
    
    toast.success(`${itemsToImport.length} itens importados com sucesso!`, {
      description: "Os estoques foram atualizados automaticamente"
    });

    // Reset modal
    setFile(null);
    setParsedItems([]);
    setShowResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Nota Fiscal
          </DialogTitle>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            {/* File Upload */}
            <Card className="card-corporate">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Selecionar Arquivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-file">Arquivo da Nota Fiscal</Label>
                  <Input
                    ref={fileInputRef}
                    id="invoice-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.xml"
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PDF, XML, JPG, PNG (máx. 10MB)
                  </p>
                </div>

                {file && (
                  <Card className="bg-accent/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-primary mt-1" />
                        <div className="flex-1">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card className="card-corporate">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Como funciona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</div>
                  <p className="text-sm">Faça upload da nota fiscal (PDF, XML ou imagem)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</div>
                  <p className="text-sm">O sistema extrai automaticamente os itens e quantidades</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</div>
                  <p className="text-sm">Revise os dados e confirme a importação</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">4</div>
                  <p className="text-sm">Os estoques são atualizados automaticamente</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleProcessInvoice}
                disabled={!file || isProcessing}
                className="btn-corporate"
              >
                {isProcessing ? (
                  <>Processando...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Processar Nota Fiscal
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Results Header */}
            <Card className="card-corporate">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center justify-between">
                  Itens Identificados
                  <Badge variant="outline">{parsedItems.length} itens</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">
                      {parsedItems.filter(item => item.exists).length} existentes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="text-primary">
                      {parsedItems.filter(item => !item.exists).length} novos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <div className="space-y-3">
              {parsedItems.map((item, index) => (
                <Card key={index} className="card-corporate">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.code}
                          </Badge>
                          {item.exists ? (
                            <Badge className="badge-success">Existente</Badge>
                          ) : (
                            <Badge className="badge-info">Novo</Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{item.name}</h4>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Quantidade:</span>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Preço Unit.:</span>
                            <p className="font-medium">R$ {item.unitPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium">R$ {item.total.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Categoria:</span>
                            <p className="font-medium">{item.category}</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {parsedItems.length === 0 && (
              <Card className="card-corporate">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Todos os itens foram removidos. Adicione pelo menos um item para continuar.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResults(false)}>
                Voltar
              </Button>
              <Button 
                onClick={handleImportItems}
                disabled={parsedItems.length === 0}
                className="btn-corporate"
              >
                <Plus className="h-4 w-4 mr-2" />
                Importar {parsedItems.length} Itens
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}