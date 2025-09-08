import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Quote } from '@/hooks/useSupabaseQuotes';

interface OptimizedQuoteCardProps {
  quote: Quote;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Memoizar o componente para evitar re-renders desnecessários
export const OptimizedQuoteCard = memo(({ quote, onView, onEdit, onDelete }: OptimizedQuoteCardProps) => {
  
  // Callbacks memoizados para evitar recreação em cada render
  const handleView = useCallback(() => onView?.(quote.id), [onView, quote.id]);
  const handleEdit = useCallback(() => onEdit?.(quote.id), [onEdit, quote.id]);
  const handleDelete = useCallback(() => onDelete?.(quote.id), [onDelete, quote.id]);
  
  // Determinar cor do badge baseado no status
  const getStatusVariant = useCallback((status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'receiving': return 'outline';
      case 'received': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  }, []);
  
  const statusVariant = getStatusVariant(quote.status);
  
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold truncate pr-2">
            {quote.title}
          </CardTitle>
          <Badge variant={statusVariant} className="flex-shrink-0">
            {quote.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="space-y-2">
          {quote.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {quote.description}
            </p>
          )}
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Itens: {quote.items_count || 0}
            </span>
            <span className="text-muted-foreground">
              Respostas: {quote.responses_count || 0}
            </span>
          </div>
          
          {quote.total && (
            <div className="text-lg font-semibold text-primary">
              R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="px-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedQuoteCard.displayName = 'OptimizedQuoteCard';