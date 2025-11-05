import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, FileText, Upload, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatLocalDate } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';

export default function InvitationResponsePublic() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [letter, setLetter] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [supplierLetter, setSupplierLetter] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<'accepted' | 'declined' | 'no_interest' | ''>('');
  const [responseNotes, setResponseNotes] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadLetterData();
    }
  }, [token]);

  const loadLetterData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar dados da carta pelo token
      const { data: supplierLetterData, error: supplierLetterError } = await supabase
        .from('invitation_letter_suppliers')
        .select(`
          *,
          suppliers (
            id,
            name,
            email
          ),
          invitation_letters (
            *,
            clients (
              name,
              cnpj
            )
          )
        `)
        .eq('response_token', token)
        .single();

      if (supplierLetterError || !supplierLetterData) {
        setError('Token inválido ou carta convite não encontrada');
        return;
      }

      // Verificar se o token está expirado
      if (supplierLetterData.token_expires_at && new Date(supplierLetterData.token_expires_at) < new Date()) {
        setError('Este link expirou. Entre em contato com o cliente para receber um novo convite.');
        return;
      }

      // Verificar se a carta foi cancelada
      if (supplierLetterData.invitation_letters.status === 'cancelled') {
        setError('Esta carta convite foi cancelada pelo cliente.');
        return;
      }

      setSupplierLetter(supplierLetterData);
      setLetter(supplierLetterData.invitation_letters);
      setSupplier(supplierLetterData.suppliers);

      // Marcar como visualizado se ainda não foi
      if (!supplierLetterData.viewed_at) {
        await supabase
          .from('invitation_letter_suppliers')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', supplierLetterData.id);
      }

    } catch (err: any) {
      console.error('Error loading letter:', err);
      setError('Erro ao carregar carta convite');
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setResponseFile(acceptedFiles[0]);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!responseStatus) {
      toast.error('Por favor, selecione uma resposta');
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl = null;

      // Upload do arquivo de resposta se houver
      if (responseFile) {
        const fileExt = responseFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${letter.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('invitation-responses')
          .upload(filePath, responseFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('invitation-responses')
          .getPublicUrl(filePath);

        attachmentUrl = urlData.publicUrl;
      }

      // Atualizar resposta
      const { error: updateError } = await supabase
        .from('invitation_letter_suppliers')
        .update({
          response_status: responseStatus,
          response_date: new Date().toISOString(),
          response_notes: responseNotes || null,
          response_attachment_url: attachmentUrl
        })
        .eq('id', supplierLetter.id);

      if (updateError) throw updateError;

      // Criar log de auditoria
      await supabase.from('audit_logs').insert({
        action: 'INVITATION_LETTER_RESPONSE',
        panel_type: 'supplier',
        entity_type: 'invitation_letter_suppliers',
        entity_id: supplierLetter.id,
        details: {
          letter_id: letter.id,
          letter_number: letter.letter_number,
          response_status: responseStatus,
          supplier_name: supplier.name
        }
      });

      toast.success('Resposta enviada com sucesso!');
      
      // Redirecionar para página de sucesso
      setTimeout(() => {
        navigate('/invitation-response-success');
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting response:', err);
      toast.error('Erro ao enviar resposta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <OptimizedSkeleton className="h-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
            <h2 className="text-2xl font-bold">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se já respondeu
  if (supplierLetter.response_status && supplierLetter.response_status !== 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">Resposta Já Enviada</h2>
            <p className="text-muted-foreground">
              Você já respondeu a esta carta convite em {formatLocalDate(supplierLetter.response_date)}.
            </p>
            <Badge variant="default" className="text-lg py-2 px-4">
              Status: {
                supplierLetter.response_status === 'accepted' ? 'Aceito' :
                supplierLetter.response_status === 'declined' ? 'Recusado' :
                supplierLetter.response_status === 'no_interest' ? 'Sem Interesse' :
                supplierLetter.response_status
              }
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-6 w-6 text-primary" />
              <CardTitle>Carta Convite de Cotação</CardTitle>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Nº:</strong> {letter.letter_number}</p>
              <p><strong>Cliente:</strong> {letter.clients?.name}</p>
              <p><strong>Fornecedor:</strong> {supplier.name}</p>
            </div>
          </CardHeader>
        </Card>

        {/* Detalhes da Carta */}
        <Card>
          <CardHeader>
            <CardTitle>{letter.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Prazo: {formatLocalDate(letter.deadline)}</span>
              </div>
              {new Date(letter.deadline) < new Date() && (
                <Badge variant="destructive">Prazo Expirado</Badge>
              )}
            </div>

            <div>
              <Label className="text-base">Descrição</Label>
              <p className="text-sm whitespace-pre-wrap mt-2 p-4 bg-muted rounded-lg">
                {letter.description}
              </p>
            </div>

            {letter.attachments && letter.attachments.length > 0 && (
              <div>
                <Label className="text-base">Anexos do Cliente</Label>
                <div className="space-y-2 mt-2">
                  {letter.attachments.map((att: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{att.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário de Resposta */}
        <Card>
          <CardHeader>
            <CardTitle>Sua Resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Status de Resposta */}
              <div className="space-y-3">
                <Label className="text-base">Como deseja responder? *</Label>
                <RadioGroup value={responseStatus} onValueChange={(value) => setResponseStatus(value as any)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="accepted" id="accepted" />
                    <Label htmlFor="accepted" className="flex-1 cursor-pointer flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Aceitar Convite</p>
                        <p className="text-xs text-muted-foreground">Tenho interesse e enviarei proposta</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="declined" id="declined" />
                    <Label htmlFor="declined" className="flex-1 cursor-pointer flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">Recusar Convite</p>
                        <p className="text-xs text-muted-foreground">Não posso participar desta cotação</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="no_interest" id="no_interest" />
                    <Label htmlFor="no_interest" className="flex-1 cursor-pointer flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">Sem Interesse</p>
                        <p className="text-xs text-muted-foreground">Não tenho interesse neste tipo de cotação</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Adicione observações, justificativas ou comentários..."
                  rows={4}
                />
              </div>

              {/* Upload de Proposta */}
              {responseStatus === 'accepted' && (
                <div className="space-y-2">
                  <Label>Anexar Proposta (opcional)</Label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, XLS (max 10MB)
                    </p>
                  </div>
                  {responseFile && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{responseFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setResponseFile(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Envio */}
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isSubmitting || !responseStatus} size="lg">
                  {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
