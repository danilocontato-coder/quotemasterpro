import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAccountabilityAttachments, DocumentType } from '@/hooks/useAccountabilityAttachments';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface DocumentUploadZoneProps {
  recordId: string;
}

export function DocumentUploadZone({ recordId }: DocumentUploadZoneProps) {
  const { uploadAttachment, uploadProgress } = useAccountabilityAttachments(recordId);
  const [documentType, setDocumentType] = useState<DocumentType>('receipt');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadAttachment(file, documentType);
    }
  }, [documentType, uploadAttachment]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nfe">NFe</SelectItem>
            <SelectItem value="receipt">Recibo</SelectItem>
            <SelectItem value="payment_proof">Comprovante de Pagamento</SelectItem>
            <SelectItem value="contract">Contrato</SelectItem>
            <SelectItem value="photo">Foto</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
