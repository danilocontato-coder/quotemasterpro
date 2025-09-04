import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, Globe2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppTemplateModal from '@/components/admin/WhatsAppTemplateModal';

interface WhatsAppTemplate {
  id: string;
  name: string;
  subject: string;
  message_content: string;
  template_type: string;
  active: boolean;
  is_global: boolean;
  client_id?: string;
  variables: any;
  created_at: string;
  clients?: { name: string };
}

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select(`
          *,
          clients (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao carregar templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const toggleActive = async (template: WhatsAppTemplate) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ active: !template.active })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Template ${template.active ? 'desativado' : 'ativado'} com sucesso`
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar template",
        variant: "destructive"
      });
    }
  };

  const renderVariablesList = (variables: Record<string, string>) => {
    return Object.keys(variables).map(key => (
      <Badge key={key} variant="outline" className="text-xs">
        {`{{${key}}}`}
      </Badge>
    ));
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Templates WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie modelos de mensagens para WhatsApp</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{template.name}</h3>
                  {template.is_global ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Globe2 className="w-3 h-3" />
                      Global
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {template.clients?.name || 'Cliente específico'}
                    </Badge>
                  )}
                  <Badge variant={template.active ? "default" : "secondary"}>
                    {template.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                <div className="text-sm text-muted-foreground mb-3 max-w-2xl">
                  {template.message_content.substring(0, 200)}...
                </div>
                <div className="flex flex-wrap gap-1">
                  {renderVariablesList(template.variables)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant={template.active ? "secondary" : "default"}
                  size="sm"
                  onClick={() => toggleActive(template)}
                >
                  {template.active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <WhatsAppTemplateModal
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSuccess={fetchTemplates}
      />
    </div>
  );
}