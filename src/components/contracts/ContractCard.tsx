import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractStatusBadge } from './ContractStatusBadge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, FileText, Calendar, DollarSign, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TERMINATED_STATUSES } from '@/constants/contracts';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];

interface ContractCardProps {
  contract: Contract;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ContractCard = ({ contract, onView, onEdit, onDelete }: ContractCardProps) => {
  const daysUntilExpiry = contract.end_date 
    ? Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isTerminated = TERMINATED_STATUSES.includes(contract.status as any);

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isTerminated ? 'opacity-60 border-muted' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {isTerminated ? (
                <Archive className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
              {contract.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {contract.contract_number}
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <ContractStatusBadge status={contract.status as any} />
            {isTerminated && (
              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                ENCERRADO
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: contract.currency || 'BRL'
              }).format(Number(contract.total_value))}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })} até{' '}
              {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>

          {isExpiringSoon && (
            <div className="text-sm text-orange-600 font-medium">
              ⚠️ Vence em {daysUntilExpiry} dias
            </div>
          )}

          {isExpired && (
            <div className="text-sm text-red-600 font-medium">
              ❌ Expirado há {Math.abs(daysUntilExpiry)} dias
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(contract.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
            )}
            {onEdit && !isTerminated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(contract.id)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {onDelete && !isTerminated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(contract.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
