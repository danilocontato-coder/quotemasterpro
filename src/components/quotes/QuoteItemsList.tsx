import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id?: string;
}

interface QuoteItemsListProps {
  quoteId: string;
  compact?: boolean;
}

export function QuoteItemsList({ quoteId, compact = false }: QuoteItemsListProps) {
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuoteItems = async () => {
      if (!quoteId) return;

      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`🔍 Buscando itens para cotação: ${quoteId}`);
        
        const { data, error } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', quoteId)
          .order('product_name');

        if (error) {
          console.error('❌ Erro ao buscar itens da cotação:', error);
          throw error;
        }

        console.log(`✅ ${data?.length || 0} itens encontrados para cotação ${quoteId}`);
        setItems(data || []);
      } catch (error) {
        console.error('Error fetching quote items:', error);
        setError('Erro ao carregar itens da cotação');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuoteItems();
  }, [quoteId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens Solicitados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded">
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens Solicitados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 text-destructive">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens Solicitados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum item encontrado para esta cotação</p>
            <p className="text-sm mt-1">A IA não pode fazer análise sem itens definidos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalValue = items.reduce((sum, item) => sum + (item.total || 0), 0);

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Itens da Cotação ({items.length})</h4>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
            <div>
              <span className="font-medium">{item.product_name}</span>
              <span className="text-muted-foreground ml-2">Qtd: {item.quantity}</span>
            </div>
            <span className="font-semibold">{formatCurrency(item.total)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center p-2 bg-primary/10 rounded font-semibold">
          <span>Total:</span>
          <span>{formatCurrency(totalValue)}</span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Itens Solicitados ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center p-3 border rounded hover:bg-muted/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{item.product_name}</h4>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span>Qtd: {item.quantity}</span>
                <span>Preço unit.: {formatCurrency(item.unit_price)}</span>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="font-semibold">
                {formatCurrency(item.total)}
              </Badge>
            </div>
          </div>
        ))}
        
        {totalValue > 0 && (
          <div className="flex justify-between items-center p-3 bg-primary/5 rounded border-2 border-primary/20 mt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-semibold">Total Estimado:</span>
            </div>
            <Badge className="text-lg py-1 px-3 bg-primary text-primary-foreground">
              {formatCurrency(totalValue)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}