import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SupplierDocument } from "@/hooks/useSupplierDocuments";
import { isDocumentExpiringSoon, isDocumentExpired } from "@/utils/documentValidation";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentExpiryAlertProps {
  documents: SupplierDocument[];
  daysThreshold?: number;
}

export function DocumentExpiryAlert({ documents, daysThreshold = 30 }: DocumentExpiryAlertProps) {
  const expiringDocs = documents.filter(doc => 
    doc.expiry_date && (isDocumentExpiringSoon(doc.expiry_date, daysThreshold) || isDocumentExpired(doc.expiry_date))
  );

  if (expiringDocs.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-warning bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">Documentos com validade próxima ou expirados</AlertTitle>
      <AlertDescription className="mt-3 space-y-2">
        {expiringDocs.map(doc => {
          const daysUntilExpiry = doc.expiry_date 
            ? differenceInDays(new Date(doc.expiry_date), new Date())
            : 0;
          const isExpired = daysUntilExpiry < 0;

          return (
            <div key={doc.id} className="flex items-center justify-between py-2 border-t border-warning/20 first:border-t-0 first:pt-0">
              <div>
                <p className="font-medium text-foreground">{doc.document_type}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.expiry_date && format(new Date(doc.expiry_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              {isExpired ? (
                <Badge variant="destructive">Expirado</Badge>
              ) : (
                <Badge variant="outline" className="bg-warning/20 text-warning border-warning/40">
                  {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dia' : 'dias'}
                </Badge>
              )}
            </div>
          );
        })}
      </AlertDescription>
    </Alert>
  );
}
