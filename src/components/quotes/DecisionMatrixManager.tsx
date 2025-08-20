import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Eye, Download, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SavedMatrix {
  name: string;
  quoteTitle: string;
  weights: any;
  proposals: any[];
  createdAt: string;
}

interface DecisionMatrixManagerProps {
  open: boolean;
  onClose: () => void;
}

export function DecisionMatrixManager({ open, onClose }: DecisionMatrixManagerProps) {
  const [matrices, setMatrices] = useState<SavedMatrix[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMatrices();
    }
  }, [open]);

  const loadMatrices = () => {
    const savedMatrices = JSON.parse(localStorage.getItem('decision-matrices') || '[]');
    setMatrices(savedMatrices);
  };

  const deleteMatrix = (index: number) => {
    const updatedMatrices = matrices.filter((_, i) => i !== index);
    localStorage.setItem('decision-matrices', JSON.stringify(updatedMatrices));
    setMatrices(updatedMatrices);
    toast({
      title: "Matriz excluída",
      description: "Matriz de decisão excluída com sucesso.",
    });
  };

  const exportMatrix = (matrix: SavedMatrix) => {
    const data = {
      ...matrix,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matriz-${matrix.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Matriz exportada!",
      description: "Arquivo JSON baixado com sucesso.",
    });
  };

  const filteredMatrices = matrices.filter(matrix =>
    matrix.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    matrix.quoteTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Gerenciar Matrizes de Decisão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar matrizes</Label>
            <Input
              id="search"
              placeholder="Digite o nome da matriz ou título da cotação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Separator />

          {/* Matrices List */}
          <div className="space-y-4">
            {filteredMatrices.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {matrices.length === 0 ? 'Nenhuma matriz salva' : 'Nenhuma matriz encontrada'}
                  </h3>
                  <p className="text-muted-foreground">
                    {matrices.length === 0 
                      ? 'Crie e salve matrizes de decisão para vê-las aqui.'
                      : 'Tente ajustar o termo de busca.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMatrices.map((matrix, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{matrix.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Cotação: {matrix.quoteTitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em: {new Date(matrix.createdAt).toLocaleDateString('pt-BR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportMatrix(matrix)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Exportar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMatrix(index)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Propostas</p>
                        <p className="text-lg font-semibold">{matrix.proposals.length}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Melhor Score</p>
                        <Badge variant="default">
                          {matrix.proposals[0]?.finalScore?.toFixed(1) || 'N/A'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Vencedor</p>
                        <p className="text-sm font-medium truncate">
                          {matrix.proposals[0]?.supplierName || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Weights Summary */}
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Pesos Utilizados:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(matrix.weights).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key === 'price' && 'Preço'}
                            {key === 'deliveryTime' && 'Prazo'}
                            {key === 'shippingCost' && 'Frete'}
                            {key === 'sla' && 'SLA'}
                            {key === 'warranty' && 'Garantia'}
                            {key === 'reputation' && 'Reputação'}
                            : {String(value)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}