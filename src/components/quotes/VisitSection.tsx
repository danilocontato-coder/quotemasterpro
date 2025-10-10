import { useState } from "react";
import { Calendar, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitTimeline } from "./VisitTimeline";
import { VisitSchedulingModal } from "./VisitSchedulingModal";
import { VisitConfirmationModal } from "./VisitConfirmationModal";
import { useQuoteVisits } from "@/hooks/useQuoteVisits";

interface VisitSectionProps {
  quote: any;
  userRole: string;
  onVisitUpdate?: () => void;
}

export function VisitSection({ quote, userRole, onVisitUpdate }: VisitSectionProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { visits, fetchVisits } = useQuoteVisits(quote.id);

  if (!quote.requires_visit) {
    return null;
  }

  const latestVisit = visits[0];
  const canSchedule = userRole === 'supplier' && quote.status === 'awaiting_visit' && !latestVisit;
  const canConfirm = userRole === 'supplier' && latestVisit?.status === 'scheduled';

  const handleVisitAction = async () => {
    await fetchVisits();
    onVisitUpdate?.();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Visita Técnica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VisitTimeline visits={visits} />
          
          <div className="flex gap-2 mt-4">
            {canSchedule && (
              <Button onClick={() => setShowScheduleModal(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Agendar Visita
              </Button>
            )}
            
            {canConfirm && (
              <Button onClick={() => setShowConfirmModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Realização
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <VisitSchedulingModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        quote={quote}
        onScheduled={handleVisitAction}
      />

      {latestVisit && (
        <VisitConfirmationModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          visit={latestVisit}
          onConfirmed={handleVisitAction}
        />
      )}
    </>
  );
}
