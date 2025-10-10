import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, FileCheck, X, Loader2, Paperclip } from 'lucide-react';

interface AttachmentsStepProps {
  attachments: string[];
  uploadingFile: boolean;
  onFileUpload: (file: File) => Promise<void>;
  onRemoveAttachment: (url: string) => void;
}

export function AttachmentsStep({ attachments, uploadingFile, onFileUpload, onRemoveAttachment }: AttachmentsStepProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileUpload(file);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Paperclip className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Anexos (PDF)</h3>
          <p className="text-sm text-muted-foreground">
            Adicione documentos relacionados ao contrato
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Arraste e solte arquivos PDF aqui ou clique para selecionar
          </p>
          <div className="flex justify-center">
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Button
                type="button"
                variant="outline"
                disabled={uploadingFile}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                {uploadingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Anexar PDF
                  </>
                )}
              </Button>
            </Label>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploadingFile}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Máximo 10MB por arquivo
          </p>
        </div>

        {attachments.length > 0 && (
          <div className="space-y-2">
            <Label>Arquivos anexados ({attachments.length})</Label>
            <div className="space-y-2">
              {attachments.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Anexo {index + 1}.pdf</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(url, '_blank')}
                    >
                      Visualizar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveAttachment(url)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {attachments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum arquivo anexado ainda
          </p>
        )}
      </div>
    </div>
  );
}
