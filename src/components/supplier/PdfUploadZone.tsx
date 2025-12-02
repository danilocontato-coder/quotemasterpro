import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Loader2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PdfUploadZoneProps {
  attachment: File | null;
  isExtracting: boolean;
  extractionSuccess: boolean;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
}

export const PdfUploadZone: React.FC<PdfUploadZoneProps> = ({
  attachment,
  isExtracting,
  extractionSuccess,
  onFileSelect,
  onRemoveFile
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: isExtracting
  });

  // Estado: Extraindo
  if (isExtracting) {
    return (
      <div className="border-2 border-primary/50 bg-primary/5 rounded-lg p-8 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-primary">Analisando PDF com IA...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Extraindo valores, prazos e condições automaticamente
        </p>
      </div>
    );
  }

  // Estado: Arquivo selecionado
  if (attachment) {
    return (
      <div className={cn(
        "border-2 rounded-lg p-6",
        extractionSuccess 
          ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" 
          : "border-primary/50 bg-primary/5"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {extractionSuccess ? (
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachment.size / 1024).toFixed(1)} KB
                {extractionSuccess && (
                  <span className="text-green-600 dark:text-green-400 ml-2">
                    • Dados extraídos com sucesso!
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemoveFile}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {extractionSuccess && (
          <p className="text-xs text-green-700 dark:text-green-300 mt-3 bg-green-100 dark:bg-green-900/30 p-2 rounded">
            ✅ Verifique os valores extraídos abaixo e ajuste se necessário antes de enviar.
          </p>
        )}
      </div>
    );
  }

  // Estado: Nenhum arquivo
  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <input {...getInputProps()} />
      <Upload className={cn(
        "h-10 w-10 mx-auto mb-3",
        isDragActive ? "text-primary" : "text-muted-foreground"
      )} />
      
      {isDragActive ? (
        <p className="text-sm font-medium text-primary">Solte o arquivo aqui...</p>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            Arraste seu PDF aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, JPG ou PNG • Máximo 10MB
          </p>
          <p className="text-xs text-primary mt-2 font-medium">
            ✨ A IA irá extrair automaticamente os valores da sua proposta
          </p>
        </>
      )}
    </div>
  );
};
