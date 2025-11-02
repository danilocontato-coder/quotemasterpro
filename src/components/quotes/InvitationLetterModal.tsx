import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, Upload, Eye, Send, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { mockInvitationLetters } from "@/data/mockInvitationLetters";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";

interface InvitationLetterModalProps {
  quote: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'basic' | 'suppliers' | 'attachments' | 'preview';

export function InvitationLetterModal({
  quote,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess
}: InvitationLetterModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [title, setTitle] = useState(`Carta Convite - ${quote?.title || ''}`);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const { suppliers } = useSupabaseSuppliers();
  const activeSuppliers = suppliers.filter(s => s.status === 'active');

  // Generate letter number (mock)
  const generateLetterNumber = () => {
    const year = new Date().getFullYear();
    const nextNumber = mockInvitationLetters.length + 1;
    return `CC-${year}-${String(nextNumber).padStart(3, '0')}`;
  };

  const handleNext = () => {
    if (currentStep === 'basic') {
      if (!title || !description || !deadline) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      setCurrentStep('suppliers');
    } else if (currentStep === 'suppliers') {
      if (selectedSuppliers.length === 0) {
        toast.error('Selecione pelo menos um fornecedor');
        return;
      }
      setCurrentStep('attachments');
    } else if (currentStep === 'attachments') {
      setCurrentStep('preview');
    }
  };

  const handleBack = () => {
    if (currentStep === 'suppliers') {
      setCurrentStep('basic');
    } else if (currentStep === 'attachments') {
      setCurrentStep('suppliers');
    } else if (currentStep === 'preview') {
      setCurrentStep('attachments');
    }
  };

  const handleToggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} arquivo(s) adicionado(s)`);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendLetter = async (asDraft: boolean = false) => {
    setIsLoading(true);
    
    try {
      // Mock: Simular envio
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const letterNumber = generateLetterNumber();
      
      const newLetter = {
        id: `inv-${Date.now()}`,
        letter_number: letterNumber,
        quote_id: quote.id,
        quote_title: quote.title,
        client_id: quote.client_id,
        client_name: 'Condomínio Jardim das Flores', // Mock
        supplier_ids: selectedSuppliers,
        supplier_names: selectedSuppliers.map(id => {
          const supplier = activeSuppliers.find(s => s.id === id);
          return supplier?.name || 'Fornecedor';
        }),
        title,
        description,
        deadline,
        status: asDraft ? 'draft' : 'sent',
        attachments: attachments.map((file, index) => ({
          id: `att-${Date.now()}-${index}`,
          name: file.name,
          url: `/attachments/${file.name}`,
          size: file.size,
          type: file.type
        })),
        created_at: new Date().toISOString(),
        sent_at: asDraft ? undefined : new Date().toISOString(),
        created_by: 'current-user',
        responses_count: 0,
        viewed_count: 0
      };
      
      // Mock: Adicionar à lista
      mockInvitationLetters.unshift(newLetter as any);
      
      toast.success(
        asDraft 
          ? `Carta Convite ${letterNumber} salva como rascunho` 
          : `Carta Convite ${letterNumber} enviada com sucesso para ${selectedSuppliers.length} fornecedor(es)`,
        {
          description: asDraft ? 'Você pode editá-la e enviá-la depois' : 'Os fornecedores receberão por e-mail e WhatsApp'
        }
      );
      
      // Reset form
      setTitle(`Carta Convite - ${quote?.title || ''}`);
      setDescription('');
      setDeadline('');
      setSelectedSuppliers([]);
      setAttachments([]);
      setCurrentStep('basic');
      
      if (onSuccess) {
        onSuccess();
      }
      
      setOpen(false);
    } catch (error) {
      console.error('Error sending invitation letter:', error);
      toast.error('Erro ao enviar carta convite');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="letter-title">Título da Carta Convite *</Label>
              <Input
                id="letter-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Carta Convite - Materiais de Construção"
              />
            </div>
            
            <div>
              <Label htmlFor="letter-description">Descrição/Instruções *</Label>
              <Textarea
                id="letter-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo da cotação, requisitos especiais, critérios de avaliação..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta descrição será incluída no PDF da carta convite
              </p>
            </div>
            
            <div>
              <Label htmlFor="letter-deadline">Prazo Limite para Resposta *</Label>
              <Input
                id="letter-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Data e hora limite para os fornecedores enviarem suas propostas
              </p>
            </div>
          </div>
        );
      
      case 'suppliers':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Selecionar Fornecedores *</Label>
              <Badge variant="outline">
                {selectedSuppliers.length} selecionado(s)
              </Badge>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {activeSuppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum fornecedor ativo disponível
                </p>
              ) : (
                activeSuppliers.map(supplier => (
                  <Card 
                    key={supplier.id}
                    className={`cursor-pointer transition-colors ${
                      selectedSuppliers.includes(supplier.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleToggleSupplier(supplier.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Checkbox 
                        checked={selectedSuppliers.includes(supplier.id)}
                        onCheckedChange={() => handleToggleSupplier(supplier.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {supplier.email}
                          {supplier.phone && ` • ${supplier.phone}`}
                        </p>
                      </div>
                      {supplier.is_certified && (
                        <Badge variant="outline" className="text-xs">
                          Certificado
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      
      case 'attachments':
        return (
          <div className="space-y-4">
            <div>
              <Label>Anexos (Opcional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Adicione editais, especificações técnicas, regulamentos ou outros documentos relevantes
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para adicionar arquivos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, XLS, JPG, PNG (máx. 10MB cada)
                  </p>
                </label>
              </div>
            </div>
            
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Arquivos Anexados ({attachments.length})</Label>
                {attachments.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'preview':
        const selectedSuppliersList = activeSuppliers.filter(s => 
          selectedSuppliers.includes(s.id)
        );
        
        return (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Número da Carta</Label>
                <p className="font-medium">{generateLetterNumber()}</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Título</Label>
                <p className="font-medium">{title}</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <p className="text-sm">{description}</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Prazo Limite</Label>
                <p className="font-medium">
                  {deadline && format(new Date(deadline), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">
                  Fornecedores Convidados ({selectedSuppliersList.length})
                </Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSuppliersList.map(supplier => (
                    <Badge key={supplier.id} variant="secondary">
                      {supplier.name}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {attachments.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Anexos ({attachments.length})
                  </Label>
                  <div className="space-y-1 mt-1">
                    {attachments.map((file, index) => (
                      <p key={index} className="text-sm flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {file.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Próximos passos:</strong> Após o envio, um PDF profissional será gerado 
                automaticamente e enviado para todos os fornecedores via e-mail e WhatsApp, 
                contendo um link exclusivo para resposta.
              </p>
            </div>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic': return 'Dados Básicos';
      case 'suppliers': return 'Seleção de Fornecedores';
      case 'attachments': return 'Anexos';
      case 'preview': return 'Revisão e Envio';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Criar Carta Convite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nova Carta Convite - {getStepTitle()}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className={`h-1 flex-1 rounded ${currentStep === 'basic' || currentStep === 'suppliers' || currentStep === 'attachments' || currentStep === 'preview' ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1 flex-1 rounded ${currentStep === 'suppliers' || currentStep === 'attachments' || currentStep === 'preview' ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1 flex-1 rounded ${currentStep === 'attachments' || currentStep === 'preview' ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1 flex-1 rounded ${currentStep === 'preview' ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </DialogHeader>
        
        <div className="py-4">
          {renderStep()}
        </div>
        
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'basic' || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-2">
            {currentStep === 'preview' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSendLetter(true)}
                disabled={isLoading}
              >
                Salvar Rascunho
              </Button>
            )}
            
            {currentStep === 'preview' ? (
              <Button
                onClick={() => handleSendLetter(false)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Carta Convite
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
