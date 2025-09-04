import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  MapPin, 
  Star, 
  Building2, 
  Award, 
  Users,
  Globe,
  Target
} from 'lucide-react';
import { useSupplierSuggestions } from '@/hooks/useSupplierSuggestions';

interface SupplierSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientRegion?: string;
  clientState?: string;
  clientCity?: string;
  categories?: string[];
  onSelectSuppliers: (supplierIds: string[]) => void;
}

export const SupplierSuggestionsModal: React.FC<SupplierSuggestionsModalProps> = ({
  open,
  onOpenChange,
  clientRegion = '',
  clientState = '',
  clientCity = '',
  categories = [],
  onSelectSuppliers
}) => {
  const { suggestions, isLoading, suggestSuppliers } = useSupplierSuggestions();
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  useEffect(() => {
    if (open && clientRegion && categories.length > 0) {
      suggestSuppliers(clientRegion, clientState, clientCity, categories);
    }
  }, [open, clientRegion, clientState, clientCity, categories, suggestSuppliers]);

  const handleSupplierToggle = (supplierId: string, checked: boolean) => {
    if (checked) {
      setSelectedSuppliers(prev => [...prev, supplierId]);
    } else {
      setSelectedSuppliers(prev => prev.filter(id => id !== supplierId));
    }
  };

  const handleConfirm = () => {
    onSelectSuppliers(selectedSuppliers);
    onOpenChange(false);
    setSelectedSuppliers([]);
  };

  const certifiedSuppliers = suggestions.filter(s => s.is_certified);
  const regularSuppliers = suggestions.filter(s => !s.is_certified);

  const getMatchScoreColor = (score: number) => {
    if (score >= 150) return 'text-green-600 bg-green-100';
    if (score >= 100) return 'text-blue-600 bg-blue-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getMatchScoreLabel = (score: number) => {
    if (score >= 150) return 'Excelente';
    if (score >= 100) return 'Muito Bom';
    return 'Bom';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Fornecedores Sugeridos
          </DialogTitle>
          <DialogDescription>
            Fornecedores recomendados baseados na região ({clientState || clientRegion}) e categorias selecionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Fornecedores Certificados */}
              {certifiedSuppliers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-700">
                      Fornecedores Certificados ({certifiedSuppliers.length})
                    </h3>
                  </div>
                  
                  <div className="grid gap-3">
                    {certifiedSuppliers.map((supplier) => (
                      <div 
                        key={supplier.supplier_id}
                        className="border rounded-lg p-4 bg-green-50 dark:bg-green-950 border-green-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={selectedSuppliers.includes(supplier.supplier_id)}
                              onCheckedChange={(checked) => 
                                handleSupplierToggle(supplier.supplier_id, checked as boolean)
                              }
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-green-800 dark:text-green-200">
                                  {supplier.name}
                                </h4>
                                <Award className="h-4 w-4 text-green-600" />
                                <Badge 
                                  variant={supplier.visibility_scope === 'global' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {supplier.visibility_scope === 'global' ? (
                                    <><Globe className="h-3 w-3 mr-1" />Global</>
                                  ) : (
                                    <><MapPin className="h-3 w-3 mr-1" />Regional</>
                                  )}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {supplier.city}, {supplier.state}
                                </span>
                                {supplier.rating > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {supplier.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              
                              {supplier.specialties?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {supplier.specialties.slice(0, 3).map((specialty, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {specialty}
                                    </Badge>
                                  ))}
                                  {supplier.specialties.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{supplier.specialties.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Badge 
                            className={`${getMatchScoreColor(supplier.match_score)} border-0`}
                          >
                            {getMatchScoreLabel(supplier.match_score)} ({supplier.match_score})
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Separador se houver ambos os tipos */}
              {certifiedSuppliers.length > 0 && regularSuppliers.length > 0 && (
                <Separator />
              )}

              {/* Fornecedores Regulares */}
              {regularSuppliers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-700">
                      Outros Fornecedores ({regularSuppliers.length})
                    </h3>
                  </div>
                  
                  <div className="grid gap-3">
                    {regularSuppliers.map((supplier) => (
                      <div 
                        key={supplier.supplier_id}
                        className="border rounded-lg p-4 hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={selectedSuppliers.includes(supplier.supplier_id)}
                              onCheckedChange={(checked) => 
                                handleSupplierToggle(supplier.supplier_id, checked as boolean)
                              }
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">
                                  {supplier.name}
                                </h4>
                                <Badge 
                                  variant={supplier.visibility_scope === 'global' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {supplier.visibility_scope === 'global' ? (
                                    <><Globe className="h-3 w-3 mr-1" />Global</>
                                  ) : (
                                    <><MapPin className="h-3 w-3 mr-1" />Regional</>
                                  )}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {supplier.city}, {supplier.state}
                                </span>
                                {supplier.rating > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {supplier.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              
                              {supplier.specialties?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {supplier.specialties.slice(0, 3).map((specialty, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {specialty}
                                    </Badge>
                                  ))}
                                  {supplier.specialties.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{supplier.specialties.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Badge 
                            className={`${getMatchScoreColor(supplier.match_score)} border-0`}
                          >
                            {getMatchScoreLabel(supplier.match_score)} ({supplier.match_score})
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado vazio */}
              {suggestions.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhum fornecedor encontrado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Não encontramos fornecedores compatíveis com os critérios informados.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {selectedSuppliers.length} fornecedores selecionados
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={selectedSuppliers.length === 0}
            >
              Confirmar Seleção
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};