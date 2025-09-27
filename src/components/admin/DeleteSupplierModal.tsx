import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Truck, 
  Package,
  FileText,
  DollarSign,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  status: string;
  quotesCount?: number;
  productsCount?: number;
}

interface DeleteSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onDeleteSupplier: (id: string, forceDelete?: boolean) => Promise<void>;
}

export const DeleteSupplierModal: React.FC<DeleteSupplierModalProps> = ({
  open,
  onOpenChange,
  supplier,
  onDeleteSupplier
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [productsCount, setProductsCount] = useState(0);
  const [quotesCount, setQuotesCount] = useState(0);
  const [forceDelete, setForceDelete] = useState(false);
  const { toast } = useToast();

  const expectedText = supplier?.name || '';
  const canDelete = confirmText === expectedText;
  const hasLinkedData = productsCount > 0 || quotesCount > 0;

  // Carregar dados vinculados quando o modal abrir
  useEffect(() => {
    if (open && supplier) {
      loadLinkedData();
    }
  }, [open, supplier]);

  const loadLinkedData = async () => {
    if (!supplier) return;

    try {
      // Contar produtos vinculados
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id);

      // Contar cotações vinculadas
      const { count: quotesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id);

      setProductsCount(productsCount || 0);
      setQuotesCount(quotesCount || 0);
    } catch (error) {
      console.error('Erro ao carregar dados vinculados:', error);
    }
  };

  const handleDelete = async () => {
    if (!supplier || !canDelete || isDeleting) return;

    console.log('Iniciando exclusão do fornecedor:', supplier.id);
    setIsDeleting(true);
    
    try {
      // Usar edge function para exclusão segura
      const { data, error } = await supabase.functions.invoke('delete-supplier-cascade', {
        body: {
          supplierId: supplier.id,
          forceDelete: forceDelete
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        if (data.action === 'deactivated') {
          toast({
            title: "Fornecedor desativado",
            description: "O fornecedor foi desativado devido a dados vinculados. Para excluir completamente, marque a opção 'Forçar exclusão'.",
            variant: "default"
          });
        } else {
          toast({
            title: "Fornecedor excluído",
            description: "O fornecedor foi excluído com sucesso do sistema.",
          });
        }
        
        // Chamar callback de exclusão para atualizar a lista
        await onDeleteSupplier(supplier.id, forceDelete);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
      
      // Limpar estado antes de fechar
      setConfirmText('');
      setForceDelete(false);
      
      // Aguardar um pouco antes de fechar
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
      
    } catch (error: any) {
      console.error('Erro ao excluir fornecedor:', error);
      
      // Detectar erro de foreign key constraint
      if (error.message?.includes('foreign key constraint') || error.message?.includes('violates')) {
        toast({
          title: "Não é possível excluir",
          description: "Este fornecedor possui dados vinculados (produtos/cotações). Use a opção 'Forçar exclusão' ou remova os dados vinculados primeiro.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o fornecedor. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (isDeleting) return;
    
    console.log('Cancelando exclusão do fornecedor');
    setConfirmText('');
    setForceDelete(false);
    onOpenChange(false);
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Excluir Fornecedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aviso */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Ação Irreversível</h3>
                <p className="text-sm text-red-700 mt-1">
                  Esta ação não pode ser desfeita. Todos os dados relacionados ao fornecedor serão permanentemente removidos do sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Informações do Fornecedor */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-muted">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{supplier.name}</p>
                  <p className="text-sm text-muted-foreground">{supplier.cnpj}</p>
                </div>
                <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                  {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-600">{productsCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Produtos</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">{quotesCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Cotações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso de dados vinculados */}
          {hasLinkedData && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Dados Vinculados Detectados</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Este fornecedor possui {productsCount} produto(s) e {quotesCount} cotação(ões) vinculados. 
                      Por segurança, o fornecedor será desativado ao invés de excluído.
                    </p>
                    <div className="mt-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={forceDelete}
                          onChange={(e) => setForceDelete(e.target.checked)}
                          className="rounded border-yellow-300"
                        />
                        <span className="text-yellow-800">
                          Forçar exclusão (removerá TODOS os dados vinculados)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* O que será excluído */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3">
                {hasLinkedData && !forceDelete ? 'O fornecedor será desativado:' : 'O que será excluído:'}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${hasLinkedData && !forceDelete ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  Informações do fornecedor
                </li>
                {(forceDelete || !hasLinkedData) && (
                  <>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      Produtos e catálogo
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      Histórico de cotações
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      Documentos e anexos
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Confirmação */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="confirm">
                Para confirmar, digite o nome do fornecedor: <strong>{supplier.name}</strong>
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={supplier.name}
                className="mt-2"
                disabled={isDeleting}
              />
            </div>
            
            {confirmText && !canDelete && (
              <p className="text-sm text-red-600">
                O nome não confere. Digite exatamente: {supplier.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {hasLinkedData && !forceDelete ? 'Desativar Fornecedor' : 'Excluir Fornecedor'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};