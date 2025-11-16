import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useSupplierDocuments, 
  DOCUMENT_TYPES, 
  DocumentType,
  SupplierDocument
} from '@/hooks/useSupplierDocuments';
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

interface SupplierDocumentUploadProps {
  supplierId: string;
  clientId: string;
  readOnly?: boolean;
  showValidationActions?: boolean;
}

export function SupplierDocumentUpload({
  supplierId,
  clientId,
  readOnly = false,
  showValidationActions = false
}: SupplierDocumentUploadProps) {
  const {
    documents,
    isLoading,
    uploading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    validateDocument
  } = useSupplierDocuments({ supplierId, clientId });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        alert('Arquivo muito grande. Tamanho máximo: 20MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) return;

    const success = await uploadDocument(
      selectedFile,
      selectedType,
      expiryDate || undefined
    );

    if (success) {
      setSelectedFile(null);
      setSelectedType('');
      setExpiryDate('');
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument(documentToDelete);
      setDocumentToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusBadge = (doc: SupplierDocument) => {
    const statusConfig = {
      pending: { 
        label: 'Pendente', 
        variant: 'secondary' as const,
        icon: Clock 
      },
      validated: { 
        label: 'Validado', 
        variant: 'default' as const,
        icon: CheckCircle2 
      },
      rejected: { 
        label: 'Rejeitado', 
        variant: 'destructive' as const,
        icon: XCircle 
      },
      expired: { 
        label: 'Expirado', 
        variant: 'destructive' as const,
        icon: AlertTriangle 
      }
    };

    const config = statusConfig[doc.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">Carregando documentos...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!readOnly && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Enviar Documento</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="document-type">Tipo de Documento *</Label>
              <Select 
                value={selectedType} 
                onValueChange={(value) => setSelectedType(value as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file-input">Arquivo *</Label>
              <Input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="expiry-date">Data de Validade (Opcional)</Label>
              <Input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedType || uploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Enviar Documento'}
            </Button>
          </div>
        </Card>
      )}

      {/* Documents List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Documentos Enviados</h3>
        
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum documento enviado ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <FileText className="h-8 w-8 text-primary" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {DOCUMENT_TYPES[doc.document_type as DocumentType] || doc.document_type}
                      </p>
                      {getStatusBadge(doc)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {doc.file_name}
                    </p>
                    
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>
                        Enviado: {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      {doc.expiry_date && (
                        <span>
                          Validade: {format(new Date(doc.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                    </div>

                    {doc.rejection_reason && (
                      <p className="text-sm text-destructive mt-1">
                        Motivo: {doc.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {showValidationActions && doc.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => validateDocument(doc.id, 'validated')}
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Motivo da rejeição:');
                          if (reason) {
                            validateDocument(doc.id, 'rejected', reason);
                          }
                        }}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}

                  {!readOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
