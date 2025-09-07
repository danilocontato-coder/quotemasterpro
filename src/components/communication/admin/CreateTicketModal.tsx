import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useSupabaseTickets } from '@/hooks/useSupabaseTickets';
import { useSupabaseAdminClients } from '@/hooks/useSupabaseAdminClients';
import { useSupabaseAdminSuppliers } from '@/hooks/useSupabaseAdminSuppliers';

interface CreateTicketModalProps {
  onTicketCreated?: () => void;
}

export function CreateTicketModal({ onTicketCreated }: CreateTicketModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: '',
    targetAudience: 'clients' as 'clients' | 'suppliers',
    targetEntityId: ''
  });

  const { createTicket } = useSupabaseTickets();
  const { clients } = useSupabaseAdminClients();
  const { suppliers } = useSupabaseAdminSuppliers();

  const handleCreateTicket = async () => {
    if (!formData.subject.trim() || !formData.description.trim() || !formData.targetEntityId) {
      return;
    }

    const selectedEntity = formData.targetAudience === 'clients' 
      ? clients.find(c => c.id === formData.targetEntityId)
      : suppliers.find(s => s.id === formData.targetEntityId);

    if (!selectedEntity) return;

    const ticketId = await createTicket(
      formData.subject,
      formData.description,
      formData.priority,
      formData.category || 'Geral',
      formData.targetAudience === 'clients' ? formData.targetEntityId : undefined,
      formData.targetAudience === 'suppliers' ? formData.targetEntityId : undefined,
      formData.targetAudience === 'clients' 
        ? (selectedEntity as any).companyName 
        : (selectedEntity as any).name
    );

    if (ticketId) {
      setIsOpen(false);
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: '',
        targetAudience: 'clients',
        targetEntityId: ''
      });
      onTicketCreated?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Criar Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Ticket</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Digite o assunto do ticket"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o problema ou solicitação"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
              >
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

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Ex: Técnico, Suporte"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Destinatário</Label>
            <Select
              value={formData.targetAudience}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                targetAudience: value as any,
                targetEntityId: '' 
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">Cliente</SelectItem>
                <SelectItem value="suppliers">Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {formData.targetAudience === 'clients' ? 'Cliente' : 'Fornecedor'}
            </Label>
            <Select
              value={formData.targetEntityId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, targetEntityId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  formData.targetAudience === 'clients' 
                    ? "Selecione o cliente" 
                    : "Selecione o fornecedor"
                } />
              </SelectTrigger>
              <SelectContent>
                {formData.targetAudience === 'clients' 
                  ? clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName}
                      </SelectItem>
                    ))
                  : suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTicket}
              disabled={!formData.subject.trim() || !formData.description.trim() || !formData.targetEntityId}
            >
              Criar Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}