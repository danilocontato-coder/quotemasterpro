import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, AlertCircle } from 'lucide-react';

interface PaymentsGuaranteeDashboardProps {
  payments: any[];
}

export function PaymentsGuaranteeDashboard({ payments }: PaymentsGuaranteeDashboardProps) {
  // Calculate guarantee statistics
  const guaranteePayments = payments.filter(p => p.status === 'in_escrow');
  const totalInGuarantee = guaranteePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Payments awaiting confirmation (in guarantee with future auto-release)
  const awaitingConfirmation = guaranteePayments.filter(p => {
    if (!p.escrow_release_date) return false;
    return new Date(p.escrow_release_date) > new Date();
  });

  // Next auto-releases (sorted by release date)
  const nextReleases = [...awaitingConfirmation]
    .sort((a, b) => new Date(a.escrow_release_date).getTime() - new Date(b.escrow_release_date).getTime())
    .slice(0, 3);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDaysUntilRelease = (date: string) => {
    const days = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (guaranteePayments.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total in Guarantee */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total em Garantia
          </CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalInGuarantee)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {guaranteePayments.length} {guaranteePayments.length === 1 ? 'pagamento' : 'pagamentos'} em garantia
          </p>
        </CardContent>
      </Card>

      {/* Awaiting Confirmation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Aguardando Confirmação
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{awaitingConfirmation.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Entregas para confirmar
          </p>
        </CardContent>
      </Card>

      {/* Next Releases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Próximas Liberações
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {nextReleases.length > 0 ? (
            <div className="space-y-2">
              {nextReleases.map((payment) => {
                const daysUntil = getDaysUntilRelease(payment.escrow_release_date);
                return (
                  <div key={payment.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{payment.local_code || payment.id}</span>
                    <Badge variant={daysUntil <= 2 ? "default" : "secondary"} className="text-xs">
                      {daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil}d`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma liberação agendada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Mantém export antigo para compatibilidade
export { PaymentsGuaranteeDashboard as EscrowDashboard };
