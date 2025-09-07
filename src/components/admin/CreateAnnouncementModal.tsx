import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Calendar } from "lucide-react";
import { useSupabaseCommunication } from "@/hooks/useSupabaseCommunication";
import { useAdminClients } from "@/hooks/useAdminClients";

interface CreateAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAnnouncementModal({ open, onOpenChange }: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [targetAudience, setTargetAudience] = useState<'clients' | 'suppliers' | 'all'>('clients');
  const [targetClientId, setTargetClientId] = useState<string>('all_clients');
  const [expiresAt, setExpiresAt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { createAnnouncement } = useSupabaseCommunication();
  const { clients } = useAdminClients();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsLoading(true);
    try {
      const result = await createAnnouncement(
        title.trim(),
        content.trim(),
        type,
        priority,
        targetAudience,
        (targetClientId && targetClientId !== 'all_clients') ? targetClientId : undefined,
        expiresAt || undefined
      );

      if (result) {
        // Reset form
        setTitle("");
        setContent("");
        setType('info');
        setPriority('medium');
        setTargetAudience('clients');
        setTargetClientId('all_clients');
        setExpiresAt("");
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = title.trim() && content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Criar Comunicado
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Título do comunicado"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informação</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Público-alvo</Label>
              <Select value={targetAudience} onValueChange={(value: any) => setTargetAudience(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">Clientes</SelectItem>
                  <SelectItem value="suppliers">Fornecedores</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {targetAudience === 'clients' && (
            <div className="space-y-2">
              <Label htmlFor="client">Cliente Específico (opcional)</Label>
              <Select value={targetClientId} onValueChange={setTargetClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente específico ou deixar em branco para todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_clients">Todos os clientes</SelectItem>
                  {(clients || [])
                    .filter(client => client?.id && client.id.trim() !== '' && client.companyName)
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo *</Label>
            <Textarea
              id="content"
              placeholder="Escreva aqui o conteúdo do comunicado..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Data de Expiração (opcional)</Label>
            <div className="relative">
              <Input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="pl-10"
              />
              <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Se definido, o comunicado não será mais exibido após esta data
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-1">Informações do Comunicado</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Este comunicado será enviado para todos os usuários do público-alvo selecionado</li>
                  <li>• Comunicados urgentes aparecem em destaque</li>
                  <li>• Usuários podem marcar comunicados como lidos</li>
                  <li>• Comunicados expirados ficam ocultos automaticamente</li>
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
              {isLoading ? "Criando..." : "Criar Comunicado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}