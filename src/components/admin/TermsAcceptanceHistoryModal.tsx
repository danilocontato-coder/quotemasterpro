import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, FileText } from 'lucide-react';
import { TermsHistoryEntry } from '@/hooks/useTermsAcceptance';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TermsAcceptanceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  fetchHistory: (userId: string) => Promise<TermsHistoryEntry[]>;
}

export const TermsAcceptanceHistoryModal: React.FC<TermsAcceptanceHistoryModalProps> = ({
  open,
  onOpenChange,
  userId,
  userName,
  fetchHistory,
}) => {
  const [history, setHistory] = useState<TermsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      fetchHistory(userId)
        .then((data) => setHistory(data))
        .finally(() => setLoading(false));
    }
  }, [open, userId, fetchHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Aceites - {userName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum aceite registrado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Aceite #{history.length - index}
                      </Badge>
                      {index === 0 && (
                        <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                          Mais Recente
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Versão:</span>
                      <Badge variant="outline">
                        {entry.details?.terms_version || 'N/A'}
                      </Badge>
                    </div>

                    {entry.details?.terms_title && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium">Título:</span>
                        <span className="text-sm text-muted-foreground">
                          {entry.details.terms_title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
