import { useState, useMemo } from "react";
import { Calendar, CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuoteVisits } from "@/hooks/useQuoteVisits";
import { VisitDetailsCard } from "./VisitDetailsCard";
import { QuoteVisit } from "@/types/visit";

interface VisitsTabProps {
  quoteId: string;
  totalSuppliers: number;
}

type StatusFilter = 'all' | 'scheduled' | 'confirmed' | 'overdue' | 'cancelled';

export function VisitsTab({ quoteId, totalSuppliers }: VisitsTabProps) {
  const { visits, isLoading } = useQuoteVisits(quoteId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredVisits = useMemo(() => {
    if (statusFilter === 'all') return visits;
    return visits.filter(v => v.status === statusFilter);
  }, [visits, statusFilter]);

  const stats = useMemo(() => {
    const scheduled = visits.filter(v => v.status === 'scheduled').length;
    const confirmed = visits.filter(v => v.status === 'confirmed').length;
    const overdue = visits.filter(v => v.status === 'overdue').length;
    const cancelled = visits.filter(v => v.status === 'cancelled').length;
    const progress = totalSuppliers > 0 ? (visits.length / totalSuppliers) * 100 : 0;

    return { scheduled, confirmed, overdue, cancelled, progress };
  }, [visits, totalSuppliers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Progresso de Visitas</h3>
                <span className="text-sm font-medium">
                  {visits.length} de {totalSuppliers} fornecedores
                </span>
              </div>
              <Progress value={stats.progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round(stats.progress)}% dos fornecedores agendaram ou confirmaram visita
              </p>
            </div>

            {/* Grid de Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">Agendadas</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.scheduled}</p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-900">Confirmadas</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-900">Atrasadas</span>
                </div>
                <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-900">Pendentes</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {totalSuppliers - visits.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          Todas ({visits.length})
        </Button>
        <Button
          variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('scheduled')}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Agendadas ({stats.scheduled})
        </Button>
        <Button
          variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('confirmed')}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Confirmadas ({stats.confirmed})
        </Button>
        <Button
          variant={statusFilter === 'overdue' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('overdue')}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Atrasadas ({stats.overdue})
        </Button>
      </div>

      {/* Lista de Visitas */}
      {filteredVisits.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === 'all' 
                  ? 'Nenhuma visita agendada ainda' 
                  : `Nenhuma visita ${statusFilter === 'scheduled' ? 'agendada' : statusFilter === 'confirmed' ? 'confirmada' : 'atrasada'}`}
              </h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all'
                  ? 'Os fornecedores ainda não agendaram visitas técnicas.'
                  : 'Altere o filtro para ver outras visitas.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map(visit => (
            <VisitDetailsCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  );
}
