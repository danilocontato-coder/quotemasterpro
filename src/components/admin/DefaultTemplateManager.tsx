import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Mail, Bell, Smartphone, Settings, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  template_type: string;
  is_default: boolean;
  is_global: boolean;
  client_id?: string;
  active: boolean;
  clients?: { name: string };
}

const TEMPLATE_TYPES = [
  { value: 'quote_request', label: 'Solicitação de Cotação (WhatsApp)', icon: MessageSquare },
  { value: 'supplier_notification_whatsapp', label: 'Notificação para Fornecedor (WhatsApp)', icon: MessageSquare },
  { value: 'proposal_received_whatsapp', label: 'Proposta Recebida (WhatsApp)', icon: MessageSquare },
  { value: 'email_quote', label: 'Solicitação de Cotação (Email)', icon: Mail },
  { value: 'supplier_notification_email', label: 'Notificação para Fornecedor (Email)', icon: Mail },
  { value: 'notification_system', label: 'Notificação do Sistema', icon: Bell },
  { value: 'sms_quote', label: 'Solicitação de Cotação (SMS)', icon: Smartphone },
];

export default function DefaultTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select(`
          *,
          clients (name)
        `)
        .eq('active', true)
        .order('template_type')
        .order('is_global', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const setAsDefault = async (templateId: string, templateType: string, isGlobal: boolean, clientId?: string) => {
    try {
      setUpdating(templateId);

      // Remove default from other templates of same type and scope
      if (isGlobal) {
        // Remove default from other global templates of same type
        await supabase
          .from('whatsapp_templates')
          .update({ is_default: false })
          .eq('template_type', templateType)
          .eq('is_global', true)
          .neq('id', templateId);
      } else if (clientId) {
        // Remove default from other client templates of same type
        await supabase
          .from('whatsapp_templates')
          .update({ is_default: false })
          .eq('template_type', templateType)
          .eq('client_id', clientId)
          .neq('id', templateId);
      }

      // Set this template as default
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Template definido como padrão');
      fetchTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error('Erro ao definir template padrão');
    } finally {
      setUpdating(null);
    }
  };

  const removeDefault = async (templateId: string) => {
    try {
      setUpdating(templateId);

      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ is_default: false })
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Template padrão removido');
      fetchTemplates();
    } catch (error) {
      console.error('Error removing default template:', error);
      toast.error('Erro ao remover template padrão');
    } finally {
      setUpdating(null);
    }
  };

  const groupedTemplates = TEMPLATE_TYPES.reduce((acc, type) => {
    acc[type.value] = {
      ...type,
      globalTemplates: templates.filter(t => t.template_type === type.value && t.is_global),
      clientTemplates: templates.filter(t => t.template_type === type.value && !t.is_global)
    };
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciar Templates Padrão
          </CardTitle>
          <CardDescription>
            Carregando...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Gerenciar Templates Padrão
        </CardTitle>
        <CardDescription>
          Defina qual template será usado automaticamente pelo sistema para cada tipo de comunicação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedTemplates).map(([typeKey, typeData]) => (
          <div key={typeKey} className="space-y-4">
            <div className="flex items-center gap-2">
              <typeData.icon className="h-4 w-4" />
              <h3 className="font-semibold">{typeData.label}</h3>
            </div>

            {/* Templates Globais */}
            {typeData.globalTemplates.length > 0 && (
              <div className="pl-6 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Templates Globais</h4>
                {typeData.globalTemplates.map((template: Template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{template.name}</span>
                      {template.is_default && (
                        <Badge variant="default" className="bg-yellow-500 text-white flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Padrão Global
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!template.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAsDefault(template.id, template.template_type, true)}
                          disabled={updating === template.id}
                        >
                          {updating === template.id ? 'Definindo...' : 'Definir como Padrão'}
                        </Button>
                      )}
                      {template.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeDefault(template.id)}
                          disabled={updating === template.id}
                        >
                          {updating === template.id ? 'Removendo...' : 'Remover Padrão'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Templates por Cliente */}
            {typeData.clientTemplates.length > 0 && (
              <div className="pl-6 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Templates por Cliente</h4>
                {typeData.clientTemplates.map((template: Template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{template.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.clients?.name || 'Cliente específico'}
                      </Badge>
                      {template.is_default && (
                        <Badge variant="default" className="bg-blue-500 text-white flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Padrão Cliente
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!template.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAsDefault(template.id, template.template_type, false, template.client_id)}
                          disabled={updating === template.id}
                        >
                          {updating === template.id ? 'Definindo...' : 'Definir como Padrão'}
                        </Button>
                      )}
                      {template.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeDefault(template.id)}
                          disabled={updating === template.id}
                        >
                          {updating === template.id ? 'Removendo...' : 'Remover Padrão'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {typeData.globalTemplates.length === 0 && typeData.clientTemplates.length === 0 && (
              <div className="pl-6 text-sm text-muted-foreground">
                Nenhum template ativo encontrado para este tipo
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}