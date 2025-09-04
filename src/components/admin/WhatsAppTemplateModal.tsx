import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Globe2, Eye } from 'lucide-react';

interface WhatsAppTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  onSuccess: () => void;
}

export default function WhatsAppTemplateModal({ 
  open, 
  onOpenChange, 
  template,
  onSuccess 
}: WhatsAppTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    message_content: '',
    template_type: 'quote_request',
    active: true,
    is_global: true,
    client_id: ''
  });
  const [clients, setClients] = useState<any[]>([]);
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const defaultVariables = {
    client_name: "Nome do cliente",
    quote_title: "Título da cotação",
    quote_id: "ID da cotação", 
    deadline_formatted: "Data limite formatada",
    total_formatted: "Valor total formatado",
    items_list: "Lista de itens com quantidades",
    items_count: "Número total de itens",
    proposal_link: "Link para envio de proposta",
    client_email: "Email do cliente",
    client_phone: "Telefone do cliente"
  };

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        subject: template.subject || '',
        message_content: template.message_content || '',
        template_type: template.template_type || 'quote_request',
        active: template.active ?? true,
        is_global: template.is_global ?? true,
        client_id: template.client_id || ''
      });
    } else {
      setFormData({
        name: '',
        subject: '',
        message_content: '',
        template_type: 'quote_request',
        active: true,
        is_global: true,
        client_id: ''
      });
    }
  }, [template]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [formData.message_content]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
    }
  };

  const generatePreview = () => {
    let previewText = formData.message_content;
    
    // Substituir variáveis por valores de exemplo
    Object.entries(defaultVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewText = previewText.replace(regex, value);
    });

    // Exemplo específico para items_list
    previewText = previewText.replace(
      /Lista de itens com quantidades/g,
      '• Papel A4 - Qtd: 10 pacotes\n• Canetas azuis - Qtd: 50 unidades\n• Grampeador - Qtd: 2 unidades'
    );

    setPreview(previewText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        variables: defaultVariables,
        client_id: formData.is_global ? null : formData.client_id || null
      };

      if (template) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update(data)
          .eq('id', template.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert([data]);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: `Template ${template ? 'atualizado' : 'criado'} com sucesso`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Falha ao ${template ? 'atualizar' : 'criar'} template`,
        variant: "destructive"
      });
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('message_content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.message_content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + `{{${variable}}}` + after;
      
      setFormData(prev => ({ ...prev, message_content: newText }));
      
      // Reposicionar cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Novo Template'} WhatsApp
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Ex: Nova Cotação Disponível 📋"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_global"
                checked={formData.is_global}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_global: checked }))}
              />
              <Label htmlFor="is_global" className="flex items-center gap-2">
                {formData.is_global ? (
                  <>
                    <Globe2 className="w-4 h-4" />
                    Template Global
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Cliente Específico
                  </>
                )}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Ativo</Label>
            </div>
          </div>

          {!formData.is_global && (
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="message_content">Conteúdo da Mensagem</Label>
                <Textarea
                  id="message_content"
                  value={formData.message_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, message_content: e.target.value }))}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Digite a mensagem usando as variáveis disponíveis..."
                  required
                />
              </div>

              <div>
                <Label>Variáveis Disponíveis</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.keys(defaultVariables).map((variable) => (
                    <Badge
                      key={variable}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => insertVariable(variable)}
                    >
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clique em uma variável para inserir na mensagem
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Preview da Mensagem</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Ocultar' : 'Mostrar'} Preview
                </Button>
              </div>

              {showPreview && (
                <Card className="p-4">
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border-l-4 border-green-500">
                    <div className="font-semibold text-sm mb-2 text-green-800 dark:text-green-200">
                      WhatsApp Preview:
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-green-900 dark:text-green-100">
                      {preview}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {template ? 'Atualizar' : 'Criar'} Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}