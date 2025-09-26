import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Eye, 
  Globe2, 
  Building2, 
  MessageSquare, 
  Mail, 
  Bell, 
  Smartphone,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TemplateModal from '@/components/admin/TemplateModal';
import { TemplatePreview } from '@/components/admin/TemplatePreview';

interface Template {
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

const TEMPLATE_CATEGORIES = [
  { value: 'all', label: 'Todos os Templates', icon: Filter },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-600' },
  { value: 'notification', label: 'Notificações', icon: Bell, color: 'text-purple-600' },
  { value: 'sms', label: 'SMS', icon: Smartphone, color: 'text-orange-600' },
];

const getTemplateCategory = (templateType: string) => {
  if (templateType === 'quote_request' || templateType === 'supplier_notification_whatsapp' || templateType === 'proposal_received_whatsapp') return 'whatsapp';
  if (templateType.includes('email') || templateType === 'supplier_notification_email') return 'email';
  if (templateType.includes('notification')) return 'notification';
  if (templateType.includes('sms')) return 'sms';
  return 'whatsapp';
};

const getTemplateTypeIcon = (templateType: string) => {
  const category = getTemplateCategory(templateType);
  switch (category) {
    case 'whatsapp': return MessageSquare;
    case 'email': return Mail;
    case 'notification': return Bell;
    case 'sms': return Smartphone;
    default: return MessageSquare;
  }
};

const getTemplateTypeLabel = (templateType: string) => {
  const typeLabels: Record<string, string> = {
    'quote_request': 'Solicitação de Cotação (WhatsApp)',
    'supplier_notification_whatsapp': 'Notificação para Fornecedor (WhatsApp)',
    'proposal_received_whatsapp': 'Proposta Recebida (WhatsApp)',
    'email_quote': 'Solicitação de Cotação (Email)',
    'supplier_notification_email': 'Notificação para Fornecedor (Email)',
    'notification_system': 'Notificação do Sistema',
    'sms_quote': 'Solicitação de Cotação (SMS)',
  };
  return typeLabels[templateType] || templateType;
};

export default function TemplatesManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
  };

  const toggleActive = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ active: !template.active })
        .eq('id', template.id);

      if (error) throw error;

      toast.success(`Template ${template.active ? 'desativado' : 'ativado'} com sucesso`);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
    }
  };

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.message_content.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategory === 'all') return matchesSearch;
    
    const templateCategory = getTemplateCategory(template.template_type);
    return matchesSearch && templateCategory === selectedCategory;
  });

  // Group templates by category for tabs view
  const templatesByCategory = TEMPLATE_CATEGORIES.slice(1).reduce((acc, category) => {
    acc[category.value] = filteredTemplates.filter(template => 
      getTemplateCategory(template.template_type) === category.value
    );
    return acc;
  }, {} as Record<string, Template[]>);

  const renderTemplatesList = (templatesList: Template[]) => (
    <div className="space-y-4">
      {templatesList.map((template) => {
        const Icon = getTemplateTypeIcon(template.template_type);
        const category = getTemplateCategory(template.template_type);
        const categoryConfig = TEMPLATE_CATEGORIES.find(c => c.value === category);
        
        return (
          <Card key={template.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`h-5 w-5 ${categoryConfig?.color || 'text-gray-600'}`} />
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {getTemplateTypeLabel(template.template_type)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
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

                  {template.subject && (
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {template.subject}
                    </p>
                  )}
                  
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {template.message_content.substring(0, 200)}
                    {template.message_content.length > 200 && '...'}
                  </div>

                  {template.variables && Object.keys(template.variables).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {Object.keys(template.variables).slice(0, 5).map(key => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {`{{${key}}}`}
                        </Badge>
                      ))}
                      {Object.keys(template.variables).length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{Object.keys(template.variables).length - 5} mais
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="w-full"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  
                  <Button
                    variant={template.active ? "secondary" : "default"}
                    size="sm"
                    onClick={() => toggleActive(template)}
                    className="w-full"
                  >
                    {template.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {templatesList.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Tente ajustar sua pesquisa ou' : 'Comece'} criando um novo template
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Templates & Mensagens</h1>
          <p className="text-muted-foreground">
            Gerencie todos os templates de comunicação do sistema
          </p>
        </div>
        <Button onClick={() => {
          setEditingTemplate(null);
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates por nome ou conteúdo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <category.icon className={`h-4 w-4 ${category.color || 'text-gray-600'}`} />
                      {category.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todos ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="whatsapp">
            WhatsApp ({templatesByCategory.whatsapp?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="email">
            Email ({templatesByCategory.email?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="notification">
            Notificações ({templatesByCategory.notification?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sms">
            SMS ({templatesByCategory.sms?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {renderTemplatesList(filteredTemplates)}
        </TabsContent>

        {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {renderTemplatesList(categoryTemplates)}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modals */}
      <TemplateModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSuccess={fetchTemplates}
      />

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Preview do Template</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                ×
              </Button>
            </div>
            
            <TemplatePreview 
              template={previewTemplate}
              variables={{
                client_name: '[Nome do Cliente]',
                quote_title: '[Título da Cotação]',
                quote_id: '[ID]',
                deadline_formatted: '[Data Limite]',
                total_formatted: '[Valor Total]',
                items_count: '[Número de Itens]',
                items_list: '[Lista de Itens]',
                proposal_link: '[Link da Proposta]',
                client_email: '[Email do Cliente]',
                client_phone: '[Telefone do Cliente]'
              }}
            />
            
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setPreviewTemplate(null)}
                className="flex-1"
              >
                Fechar
              </Button>
              <Button 
                onClick={() => {
                  setPreviewTemplate(null);
                  handleEdit(previewTemplate);
                }}
                className="flex-1"
              >
                Editar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}