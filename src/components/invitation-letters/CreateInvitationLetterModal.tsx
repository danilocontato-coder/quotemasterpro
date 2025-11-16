import { useState, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseInvitationLetters } from '@/hooks/useSupabaseInvitationLetters';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupplierSelectionWithDocs } from '@/components/suppliers/SupplierSelectionWithDocs';
import { DOCUMENT_TYPES } from '@/hooks/useSupplierDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

interface CreateInvitationLetterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateInvitationLetterModal({ open, onClose }: CreateInvitationLetterModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'standalone' | 'linked'>('standalone');
  const [quoteId, setQuoteId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [directEmails, setDirectEmails] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sendImmediately, setSendImmediately] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiredDocuments, setRequiredDocuments] = useState<Array<{ type: string; label: string; mandatory: boolean }>>([]);

  const { createLetter } = useSupabaseInvitationLetters();
  const { suppliers } = useSupabaseSuppliers();
  const { quotes } = useSupabaseQuotes();

  // Dropzone para anexos
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      setAttachments([...attachments, ...acceptedFiles]);
    }
  });

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const toggleRequiredDocument = (docType: string) => {
    setRequiredDocuments(prev => {
      const exists = prev.find(d => d.type === docType);
      if (exists) {
        return prev.filter(d => d.type !== docType);
      } else {
        return [...prev, { type: docType, label: DOCUMENT_TYPES[docType], mandatory: true }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações específicas por modo
    if (mode === 'linked') {
      if (!quoteId) {
        toast.error('Selecione uma cotação');
        return;
      }
    } else {
      if (!category) {
        toast.error('Selecione uma categoria');
        return;
      }
    }

    if (!title || !description || !deadline) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (selectedSuppliers.length === 0 && !directEmails) {
      toast.error('Selecione fornecedores ou adicione e-mails diretos');
      return;
    }

    setIsSubmitting(true);
    try {
      const directEmailsArray = directEmails
        ? directEmails.split(',').map(e => e.trim()).filter(e => e)
        : [];

      const letterId = await createLetter({
        quote_id: mode === 'linked' ? quoteId : undefined,
        quote_category: mode === 'standalone' ? category : undefined,
        estimated_budget: mode === 'standalone' && estimatedBudget ? parseFloat(estimatedBudget) : undefined,
        title,
        description,
        deadline,
        supplier_ids: selectedSuppliers,
        direct_emails: directEmailsArray,
        attachments,
        send_immediately: sendImmediately,
        required_documents: requiredDocuments.length > 0 ? requiredDocuments : undefined,
      });

      if (letterId) {
        toast.success(sendImmediately ? 'Carta enviada!' : 'Carta salva como rascunho');
        onClose();
      }
    } catch (error: any) {
      toast.error('Erro ao criar carta');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSuppliers = suppliers.filter(s => s.status === 'active');

  // Pré-preencher título baseado na cotação selecionada
  useEffect(() => {
    if (mode === 'linked' && quoteId) {
      const quote = quotes.find(q => q.id === quoteId);
      if (quote && !title) {
        setTitle(`Carta Convite - ${quote.title}`);
      }
    }
  }, [mode, quoteId, quotes]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Carta Convite</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Modo de Criação */}
          <div className="space-y-3">
            <Label>Tipo de Carta Convite</Label>
            <RadioGroup value={mode} onValueChange={(value: 'standalone' | 'linked') => setMode(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="standalone" id="standalone" />
                <Label htmlFor="standalone" className="flex-1 cursor-pointer">
                  <p className="font-medium">Carta Convite Independente</p>
                  <p className="text-xs text-muted-foreground">
                    Sondagem de mercado ou convite formal sem RFQ específica
                  </p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="linked" id="linked" />
                <Label htmlFor="linked" className="flex-1 cursor-pointer">
                  <p className="font-medium">Vincular a Cotação Existente</p>
                  <p className="text-xs text-muted-foreground">
                    Enviar carta formal para RFQ já criada
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Campos Condicionais por Modo */}
          {mode === 'linked' ? (
            <div className="space-y-2">
              <Label htmlFor="quote">Cotação Relacionada *</Label>
              <Select value={quoteId} onValueChange={setQuoteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cotação" />
                </SelectTrigger>
                <SelectContent>
                  {quotes
                    .filter(q => q.status === 'draft' || q.status === 'sent')
                    .map(quote => (
                      <SelectItem key={quote.id} value={quote.id}>
                        {quote.local_code} - {quote.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria/Tipo *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manutencao">Manutenção Predial</SelectItem>
                    <SelectItem value="limpeza">Materiais de Limpeza</SelectItem>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="jardinagem">Jardinagem</SelectItem>
                    <SelectItem value="elevadores">Elevadores</SelectItem>
                    <SelectItem value="piscina">Piscina e Área de Lazer</SelectItem>
                    <SelectItem value="portaria">Portaria e Recepção</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedBudget">Orçamento Estimado (opcional)</Label>
                <Input
                  id="estimatedBudget"
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Carta Convite - Materiais de Limpeza Q1 2025"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes da solicitação, requisitos, condições..."
              rows={6}
              required
            />
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo de Resposta *</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Documentos Obrigatórios */}
          <div className="space-y-2">
            <Label>Documentos Obrigatórios (opcional)</Label>
            <p className="text-sm text-muted-foreground">Exigir documentos específicos dos fornecedores</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`doc-${key}`}
                    checked={requiredDocuments.some(d => d.type === key)}
                    onCheckedChange={() => toggleRequiredDocument(key)}
                  />
                  <Label htmlFor={`doc-${key}`} className="text-sm cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Fornecedores */}
          <div className="space-y-2">
            <Label>Fornecedores Convidados ({selectedSuppliers.length} selecionados)</Label>
            <SupplierSelectionWithDocs
              suppliers={activeSuppliers}
              selectedSuppliers={selectedSuppliers}
              onToggleSupplier={toggleSupplier}
              requiredDocuments={requiredDocuments}
              clientId={user?.clientId || ''}
            />
          </div>

          {/* E-mails Diretos (apenas modo independente) */}
          {mode === 'standalone' && (
            <div className="space-y-2">
              <Label htmlFor="directEmails">E-mails Diretos (opcional)</Label>
              <Textarea
                id="directEmails"
                value={directEmails}
                onChange={(e) => setDirectEmails(e.target.value)}
                placeholder="fornecedor1@email.com, fornecedor2@email.com"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Envie para fornecedores não cadastrados. Separe por vírgula.
              </p>
            </div>
          )}

          {/* Anexos */}
          <div className="space-y-2">
            <Label>Anexos (opcional)</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, XLS, Imagens (max 10MB cada)
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2 mt-4">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enviar Imediatamente */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="send-immediately" className="cursor-pointer">
                Enviar Imediatamente
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Marque para enviar emails aos fornecedores agora
              </p>
            </div>
            <Switch
              id="send-immediately"
              checked={sendImmediately}
              onCheckedChange={setSendImmediately}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Salvando...'
                : sendImmediately
                ? 'Criar e Enviar'
                : 'Salvar Rascunho'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}