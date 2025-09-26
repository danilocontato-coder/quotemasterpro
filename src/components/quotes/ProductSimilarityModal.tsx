import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Package, Wrench, Lightbulb } from "lucide-react";
import { ProductAnalysis, ProductSuggestion } from "@/lib/productMatcher";

interface ProductSimilarityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalName: string;
  analysis: ProductAnalysis;
  onSelection: (decision: 'use_existing' | 'create_new' | 'manual', data?: any) => void;
}

export const ProductSimilarityModal: React.FC<ProductSimilarityModalProps> = ({
  open,
  onOpenChange,
  originalName,
  analysis,
  onSelection
}) => {
  const [customName, setCustomName] = useState(analysis.normalizedName);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProductSuggestion | null>(null);

  const handleUseExisting = () => {
    if (selectedSuggestion) {
      onSelection('use_existing', selectedSuggestion);
      onOpenChange(false);
    }
  };

  const handleCreateNew = () => {
    onSelection('create_new', {
      name: analysis.normalizedName,
      category: analysis.category,
      isService: analysis.isService
    });
    onOpenChange(false);
  };

  const handleManualEntry = () => {
    onSelection('manual', {
      name: customName.trim(),
      category: analysis.category,
      isService: analysis.isService
    });
    onOpenChange(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity > 0.85) return 'bg-green-100 text-green-800';
    if (similarity > 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500" />
            Produto Similar Encontrado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Produto original */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Produto digitado pela IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="font-medium">{originalName}</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  {analysis.isService ? (
                    <>
                      <Wrench className="h-3 w-3" />
                      Serviço
                    </>
                  ) : (
                    <>
                      <Package className="h-3 w-3" />
                      Produto
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Categoria sugerida: <strong>{analysis.category}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Nome normalizado: <strong>{analysis.normalizedName}</strong>
              </p>
              <p className={`text-sm mt-2 ${getConfidenceColor(analysis.confidence)}`}>
                Confiança da análise: {Math.round(analysis.confidence * 100)}%
              </p>
            </CardContent>
          </Card>

          {/* Produtos similares encontrados */}
          {analysis.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Produtos similares já cadastrados</CardTitle>
                <CardDescription>
                  Selecione um produto existente para evitar duplicatas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <div 
                    key={suggestion.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSuggestion?.id === suggestion.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSuggestion(suggestion)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{suggestion.name}</span>
                          <Badge 
                            variant="secondary" 
                            className={getSimilarityColor(suggestion.similarity)}
                          >
                            {Math.round(suggestion.similarity * 100)}% similar
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Código: {suggestion.code} • Categoria: {suggestion.category}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedSuggestion && (
                  <Button 
                    onClick={handleUseExisting}
                    className="w-full mt-3"
                    variant="default"
                  >
                    Usar "{selectedSuggestion.name}"
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Opções de ação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-700">Criar Novo Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Criar como "{analysis.normalizedName}"
                </p>
                <Button 
                  onClick={handleCreateNew}
                  variant="outline" 
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                >
                  Criar Novo
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-700">Ajustar Nome</CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Digite o nome correto"
                  className="mb-3"
                />
                <Button 
                  onClick={handleManualEntry}
                  variant="outline" 
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={!customName.trim()}
                >
                  Usar Nome Personalizado
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Dica */}
          <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
            <strong>💡 Dica:</strong> Reutilizar produtos existentes ajuda a manter seu catálogo organizado 
            e facilita relatórios futuros. A IA aprende com suas escolhas para melhorar as sugestões.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};