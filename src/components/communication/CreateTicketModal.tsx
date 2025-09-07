import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headphones, Paperclip, X, Upload, File } from "lucide-react";
import { useSupabaseCommunication } from "@/hooks/useSupabaseCommunication";
import { ticketCategories } from "@/data/mockCommunication";

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTicketModal({ open, onOpenChange }: CreateTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { createTicket } = useSupabaseCommunication();

  // DEBUG: Log das categorias
  console.log("🔍 DEBUG: ticketCategories", ticketCategories);
  console.log("🔍 DEBUG: category state", category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !category) return;

    setIsLoading(true);
    try {
      // Convert files to names for mock data
      const attachmentNames = attachments.map(file => file.name);
      const ticketId = createTicket(subject.trim(), description.trim(), priority, category, attachmentNames);
      
      // Reset form
      setSubject("");
      setDescription("");
      setPriority('medium');
      setCategory("");
      setAttachments([]);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔍 DEBUG: handleFileSelect chamado", e.target.files);
    const files = Array.from(e.target.files || []);
    console.log("🔍 DEBUG: Arquivos selecionados", files.map(f => f.name));
    
    const validFiles = files.filter(file => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        console.log("🚨 DEBUG: Arquivo muito grande", file.name, file.size);
        alert(`Arquivo "${file.name}" é muito grande. Máximo 10MB.`);
        return false;
      }
      return true;
    });
    
    console.log("🔍 DEBUG: Arquivos válidos", validFiles.map(f => f.name));
    setAttachments(prev => {
      const newAttachments = [...prev, ...validFiles];
      console.log("🔍 DEBUG: Novos anexos", newAttachments.map(f => f.name));
      return newAttachments;
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isValid = subject.trim() && description.trim() && category;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Criar Ticket de Suporte
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para criar um novo ticket de suporte. Nossa equipe responderá em até 24h.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              placeholder="Descreva brevemente o problema ou solicitação"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select 
                value={category} 
                onValueChange={(value) => {
                  console.log("🔍 DEBUG: Select onValueChange", value);
                  setCategory(value);
                }}
                open={undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-[100]">
                  {ticketCategories.length > 0 ? (
                    ticketCategories.map((cat) => {
                      console.log("🔍 DEBUG: Renderizando categoria", cat);
                      return (
                        <SelectItem key={cat} value={cat} className="hover:bg-accent cursor-pointer">
                          {cat}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="loading" disabled>
                      Carregando categorias...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva detalhadamente o problema, incluindo:\n- O que você estava tentando fazer\n- O que aconteceu\n- Qual era o resultado esperado\n- Passos para reproduzir o problema (se aplicável)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Anexos (opcional)</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.zip,.rar,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    console.log("🔍 DEBUG: Clique no botão de anexar");
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Anexar Arquivo
                </Button>
                <span className="text-sm text-muted-foreground">
                  Máximo 10MB por arquivo
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Arquivos selecionados:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
                <p className="font-medium text-blue-900 mb-1">Tipos de arquivo suportados:</p>
                <p className="text-blue-800">
                  • Documentos: PDF, DOC, DOCX, TXT, XLS, XLSX<br/>
                  • Imagens: PNG, JPG, JPEG, GIF<br/>
                  • Compactados: ZIP, RAR
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Headphones className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-1">Como funciona</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Nossa equipe receberá seu ticket e responderá em até 24h</li>
                  <li>• Você receberá atualizações por email</li>
                  <li>• Pode acompanhar o progresso na aba "Suporte"</li>
                  <li>• Tickets urgentes têm prioridade</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isValid}
              className="flex-1"
            >
              {isLoading ? "Criando..." : "Criar Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}