import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Globe2, Eye, MessageSquare, Mail, Bell, Smartphone } from 'lucide-react';
import { TemplatePreview } from './TemplatePreview';
import { toast } from 'sonner';

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  onSuccess: () => void;
}

const TEMPLATE_TYPES = [
  { value: 'quote_request', label: 'Solicitação de Cotação (WhatsApp)', icon: MessageSquare, category: 'whatsapp' },
  { value: 'supplier_notification_whatsapp', label: 'Notificação para Fornecedor (WhatsApp)', icon: MessageSquare, category: 'whatsapp' },
  { value: 'proposal_received_whatsapp', label: 'Proposta Recebida (WhatsApp)', icon: MessageSquare, category: 'whatsapp' },
  { value: 'email_quote', label: 'Solicitação de Cotação (Email)', icon: Mail, category: 'email' },
  { value: 'supplier_notification_email', label: 'Notificação para Fornecedor (Email)', icon: Mail, category: 'email' },
  { value: 'notification_system', label: 'Notificação do Sistema', icon: Bell, category: 'notification' },
  { value: 'sms_quote', label: 'Solicitação de Cotação (SMS)', icon: Smartphone, category: 'sms' },
];

const DEFAULT_VARIABLES: Record<string, Record<string, string>> = {
  quote_request: {
    client_name: 'Nome do cliente',
    quote_title: 'Título da cotação',
    quote_id: 'ID da cotação',
    deadline_formatted: 'Data limite formatada',
    total_formatted: 'Valor total formatado',
    items_count: 'Número total de itens',
    items_list: 'Lista de itens com quantidades',
    proposal_link: 'Link para envio de proposta',
    client_email: 'Email do cliente',
    client_phone: 'Telefone do cliente'
  },
  supplier_notification_whatsapp: {
    supplier_name: 'Nome do fornecedor',
    client_name: 'Nome do cliente',
    quote_title: 'Título da cotação',
    quote_id: 'ID da cotação',
    deadline_formatted: 'Data limite formatada',
    items_count: 'Número total de itens',
    items_list: 'Lista resumida de itens',
    proposal_link: 'Link para resposta da proposta',
    client_contact: 'Contato do cliente'
  },
  proposal_received_whatsapp: {
    quote_title: 'Título da cotação',
    quote_id: 'ID da cotação',
    supplier_name: 'Nome do fornecedor',
    total_value: 'Valor total formatado'
  },
  email_quote: {
    client_name: 'Nome do cliente',
    quote_title: 'Título da cotação',
    quote_id: 'ID da cotação',
    deadline_formatted: 'Data limite formatada',
    total_formatted: 'Valor total formatado',
    proposal_link: 'Link para envio de proposta'
  },
  supplier_notification_email: {
    supplier_name: 'Nome do fornecedor',
    client_name: 'Nome do cliente',
    quote_title: 'Título da cotação',
    quote_id: 'ID da cotação',
    deadline_formatted: 'Data limite formatada',
    items_count: 'Número total de itens',
    items_list: 'Lista detalhada de itens',
    proposal_link: 'Link para resposta da proposta',
    client_contact: 'Contato do cliente',
    company_name: 'Nome da empresa cliente'
  },
  notification_system: {
    user_name: 'Nome do usuário',
    action: 'Ação realizada',
    entity_name: 'Nome da entidade'
  },
  sms_quote: {
    client_name: 'Nome do cliente',
    quote_title: 'Título da cotação',
    proposal_link: 'Link para proposta'
  }
};

export default function TemplateModal({ 
  open, 
  onOpenChange, 
  template,
  onSuccess 
}: TemplateModalProps) {
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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  // Load data when template changes
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

  // Load clients for dropdown
  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data } = await supabase
          .from('clients')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        
        setClients(data || []);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    if (open) {
      loadClients();
    }
  }, [open]);

  const getTemplateVariables = () => {
    return DEFAULT_VARIABLES[formData.template_type] || {};
  };

  const getPreviewVariables = () => {
    const variables = getTemplateVariables();
    return Object.keys(variables).reduce((acc, key) => {
      acc[key] = `[${variables[key]}]`;
      return acc;
    }, {} as Record<string, string>);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const variables = getTemplateVariables();
      
      const data = {
        name: formData.name,
        subject: formData.subject,
        message_content: formData.message_content,
        template_type: formData.template_type,
        active: formData.active,
        is_global: formData.is_global,
        client_id: formData.is_global ? null : formData.client_id || null,
        variables: variables
      };

      if (template) {
        // Use whatsapp_templates table for backwards compatibility
        const { error } = await supabase
          .from('whatsapp_templates')
          .update(data)
          .eq('id', template.id);

        if (error) throw error;
      } else {
        // Use whatsapp_templates table for all template types
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert([data]);

        if (error) throw error;
      }

      toast.success(`Template ${template ? 'atualizado' : 'criado'} com sucesso`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(`Erro ao ${template ? 'atualizar' : 'criar'} template: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTemplateType = TEMPLATE_TYPES.find(t => t.value === formData.template_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedTemplateType?.icon && <selectedTemplateType.icon className="h-5 w-5" />}
            {template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Configuração</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-6 mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Solicitação de Cotação Padrão"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template_type">Tipo do Template</Label>
                  <Select 
                    value={formData.template_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject (for email templates) */}
              {(formData.template_type.includes('email') || formData.template_type === 'notification_system') && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    placeholder="Assunto da mensagem"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
              )}

              {/* Message Content */}
              <div className="space-y-2">
                <Label htmlFor="message_content">Conteúdo da Mensagem</Label>
                <Textarea
                  id="message_content"
                  placeholder="Digite o conteúdo do template..."
                  value={formData.message_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, message_content: e.target.value }))}
                  rows={10}
                  className="resize-none font-mono text-sm"
                  required
                />
              </div>

              {/* Variables Help */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(getTemplateVariables()).map(([key, description]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {`{{${key}}}`} - {description}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Scope Settings */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Escopo do Template</Label>
                    <p className="text-xs text-muted-foreground">
                      Defina se este template será usado globalmente ou apenas por um cliente específico
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4" />
                    <Switch
                      checked={formData.is_global}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_global: checked }))}
                    />
                    <span className="text-sm">
                      {formData.is_global ? 'Global' : 'Cliente Específico'}
                    </span>
                  </div>
                </div>

                {!formData.is_global && (
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente</Label>
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
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {client.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Status do Template</Label>
                  <p className="text-xs text-muted-foreground">
                    Templates inativos não serão usados pelo sistema
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <span className="text-sm">
                    {formData.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : (template ? 'Atualizar' : 'Criar')} Template
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Preview do Template</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Visualize como o template aparecerá com dados de exemplo
              </p>
            </div>

            <div className="flex justify-center">
              <TemplatePreview 
                template={formData} 
                variables={getPreviewVariables()}
              />
            </div>

            <div className="flex justify-center gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setActiveTab('form')}>
                Voltar à Edição
              </Button>
              <Button type="button" onClick={() => setActiveTab('form')}>
                Continuar Editando
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}