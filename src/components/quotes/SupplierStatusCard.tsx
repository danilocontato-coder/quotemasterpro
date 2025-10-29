import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Send } from 'lucide-react';
import { formatRelativeTime } from '@/utils/dateUtils';
import { QuoteProposal } from './QuoteDetailModal';

interface SupplierStatusCardProps {
  supplier: { 
    id: string; 
    name: string; 
    phone?: string; 
    whatsapp?: string;
    status?: string;
  };
  hasResponded: boolean;
  proposal?: QuoteProposal;
  onResendInvite: () => void;
  isResending?: boolean;
}

export function SupplierStatusCard({ 
  supplier, 
  hasResponded, 
  proposal, 
  onResendInvite,
  isResending = false
}: SupplierStatusCardProps) {
  return (
    <Card className={hasResponded ? 'border-green-200 bg-green-50/30' : 'border-orange-200 bg-orange-50/30'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasResponded ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-orange-600" />
            )}
            <CardTitle className="text-base">{supplier.name}</CardTitle>
          </div>
          <Badge variant={hasResponded ? "default" : "secondary"} className={hasResponded ? 'bg-green-600' : 'bg-orange-500'}>
            {hasResponded ? "✓ Respondeu" : "⏳ Aguardando"}
          </Badge>
        </div>
      </CardHeader>
      
      {hasResponded && proposal ? (
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Valor Total</p>
              <p className="font-bold text-green-600">
                R$ {proposal.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Prazo</p>
              <p className="font-medium">{proposal.deliveryTime} dias</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Recebida</p>
              <p className="text-xs font-medium">{formatRelativeTime(proposal.submittedAt)}</p>
            </div>
          </div>
          
          {proposal.observations && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">Observações:</p>
              <p className="text-xs">{proposal.observations}</p>
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Este fornecedor ainda não enviou proposta.
          </p>
          <div className="flex gap-2">
            <LoadingButton 
              size="sm" 
              variant="outline" 
              onClick={onResendInvite}
              isLoading={isResending}
              loadingText="Reenviando..."
            >
              <Send className="h-3 w-3 mr-1" />
              Reenviar convite
            </LoadingButton>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
