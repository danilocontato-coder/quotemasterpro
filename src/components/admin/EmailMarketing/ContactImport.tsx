import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ContactImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (contacts: any[]) => Promise<any>;
}

export function ContactImport({ open, onOpenChange, onImport }: ContactImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setErrors([]);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

        const validationErrors: string[] = [];
        const processedData = jsonData.map((row, index) => {
          const email = row.Email || row.email || row['E-mail'] || '';
          
          if (!email) {
            validationErrors.push(`Linha ${index + 2}: E-mail obrigatório`);
          } else if (!validateEmail(email)) {
            validationErrors.push(`Linha ${index + 2}: E-mail inválido - ${email}`);
          }

          return {
            email: email.toLowerCase().trim(),
            name: row.Nome || row.Name || row.name || '',
            phone: row.Telefone || row.Phone || row.phone || '',
            tags: (row.Tags || row.tags || '').split(';').filter(Boolean),
            status: 'active'
          };
        });

        setErrors(validationErrors);
        setPreview(processedData.slice(0, 10));

        if (validationErrors.length > 0) {
          toast({
            title: 'Atenção',
            description: `${validationErrors.length} erro(s) encontrado(s)`,
            variant: 'destructive'
          });
        }
      };

      reader.readAsBinaryString(uploadedFile);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao processar arquivo',
        variant: 'destructive'
      });
    }
  };

  const handleImport = async () => {
    if (!file || errors.length > 0) {
      toast({
        title: 'Erro',
        description: 'Corrija os erros antes de importar',
        variant: 'destructive'
      });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

        const contacts = jsonData
          .filter(row => row.Email || row.email || row['E-mail'])
          .map(row => ({
            email: (row.Email || row.email || row['E-mail'] || '').toLowerCase().trim(),
            name: row.Nome || row.Name || row.name || '',
            phone: row.Telefone || row.Phone || row.phone || '',
            tags: (row.Tags || row.tags || '').split(';').filter(Boolean),
            status: 'active'
          }));

        const batchSize = 100;
        for (let i = 0; i < contacts.length; i += batchSize) {
          const batch = contacts.slice(i, i + batchSize);
          await onImport(batch);
          setProgress(Math.min(((i + batchSize) / contacts.length) * 100, 100));
        }

        toast({
          title: 'Sucesso',
          description: `${contacts.length} contatos importados`
        });
        
        onOpenChange(false);
        setFile(null);
        setPreview([]);
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao importar contatos',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Contatos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Aceita arquivos CSV ou XLSX com as colunas: Email, Nome, Telefone, Tags
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </span>
              </Button>
            </label>
            {file && (
              <p className="mt-2 text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <h4 className="font-semibold text-sm">Erros Encontrados ({errors.length})</h4>
              </div>
              <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {errors.slice(0, 10).map((error, i) => (
                  <li key={i} className="text-destructive">{error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="text-muted-foreground">...e mais {errors.length - 10} erro(s)</li>
                )}
              </ul>
            </div>
          )}

          {preview.length > 0 && errors.length === 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Preview (10 primeiros)</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Telefone</th>
                      <th className="text-left p-2">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((contact, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{contact.email}</td>
                        <td className="p-2">{contact.name}</td>
                        <td className="p-2">{contact.phone}</td>
                        <td className="p-2">{contact.tags.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || errors.length > 0 || importing}
            >
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
