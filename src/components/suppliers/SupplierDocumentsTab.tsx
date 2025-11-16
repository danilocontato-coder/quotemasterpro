import { useState } from "react";
import { Download, Eye, Check, X, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SupplierDocumentUpload } from "./SupplierDocumentUpload";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { useSupplierDocuments } from "@/hooks/useSupplierDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupplierDocumentsTabProps {
  supplierId: string;
  clientId: string;
  canEdit?: boolean;
}

export function SupplierDocumentsTab({
  supplierId,
  clientId,
  canEdit = false,
}: SupplierDocumentsTabProps) {
  const { user } = useAuth();
  const isClient = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'client';
  const {
    documents,
    isLoading,
    downloadDocument,
    deleteDocument,
    validateDocument,
  } = useSupplierDocuments({ supplierId, clientId });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument(documentToDelete);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleValidate = async (documentId: string, status: 'validated' | 'rejected') => {
    await validateDocument(documentId, status);
  };

  const pendingDocuments = documents.filter(doc => doc.status === 'pending');
  const expiredDocuments = documents.filter(doc => 
    doc.expiry_date && new Date(doc.expiry_date) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {pendingDocuments.length > 0 && isClient && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Há {pendingDocuments.length} documento(s) aguardando validação.
          </AlertDescription>
        </Alert>
      )}

      {expiredDocuments.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Atenção: {expiredDocuments.length} documento(s) expirado(s).
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Enviar Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierDocumentUpload
              supplierId={supplierId}
              clientId={clientId}
              readOnly={!canEdit}
              showValidationActions={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando documentos...</p>
          ) : documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum documento enviado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_type}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {doc.file_name}
                      </TableCell>
                      <TableCell>
                        <DocumentStatusBadge 
                          status={doc.status}
                          tooltipContent={doc.rejection_reason}
                        />
                      </TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          <span className={
                            new Date(doc.expiry_date) < new Date()
                              ? 'text-destructive font-medium'
                              : ''
                          }>
                            {format(new Date(doc.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadDocument(doc)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {isClient && doc.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleValidate(doc.id, 'validated')}
                                title="Aprovar"
                                className="text-success hover:text-success"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleValidate(doc.id, 'rejected')}
                                title="Rejeitar"
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(doc.id)}
                              title="Deletar"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
