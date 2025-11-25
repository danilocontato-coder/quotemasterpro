import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDocument } from '@/utils/documentValidation';
import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface CNPJExistenceCheckerProps {
  cnpj: string;
  onSupplierFound?: (supplierId: string, supplierName: string) => void;
}

export const CNPJExistenceChecker = ({ cnpj, onSupplierFound }: CNPJExistenceCheckerProps) => {
  const [checking, setChecking] = useState(false);
  const [existingSupplier, setExistingSupplier] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const checkCNPJ = async () => {
      if (!cnpj || cnpj.length < 14) {
        setExistingSupplier(null);
        return;
      }

      const cleanCnpj = normalizeDocument(cnpj);
      if (cleanCnpj.length !== 14) {
        setExistingSupplier(null);
        return;
      }

      setChecking(true);
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('cnpj', cleanCnpj)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setExistingSupplier({ id: data.id, name: data.name });
          onSupplierFound?.(data.id, data.name);
        } else {
          setExistingSupplier(null);
        }
      } catch (error) {
        console.error('Erro ao verificar CNPJ:', error);
        setExistingSupplier(null);
      } finally {
        setChecking(false);
      }
    };

    // Debounce de 500ms
    const timer = setTimeout(checkCNPJ, 500);
    return () => clearTimeout(timer);
  }, [cnpj, onSupplierFound]);

  if (!cnpj || cnpj.length < 14) {
    return null;
  }

  if (checking) {
    return (
      <Alert className="border-border/50 bg-muted/30">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <AlertDescription className="text-sm text-muted-foreground">
          Verificando CNPJ...
        </AlertDescription>
      </Alert>
    );
  }

  if (existingSupplier) {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center gap-2 text-sm">
          <span className="text-foreground">
            Fornecedor já existe: <strong>{existingSupplier.name}</strong>
          </span>
          <Badge variant="outline" className="ml-auto">
            Será vinculado
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500/30 bg-green-500/5">
      <Info className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center gap-2 text-sm">
        <span className="text-foreground">
          CNPJ não encontrado
        </span>
        <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-700 border-green-500/30">
          Será criado
        </Badge>
      </AlertDescription>
    </Alert>
  );
};
