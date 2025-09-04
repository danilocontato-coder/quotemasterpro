import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, MessageSquare, Mail, CreditCard, Zap, Brain, Truck, Globe } from "lucide-react";
import { Integration } from "@/hooks/useSupabaseIntegrations";
import { toast } from "sonner";

interface IntegrationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  editingIntegration?: Integration | null;
}

const integrationTypes = [
  {
    id: 'whatsapp_twilio',
    name: 'WhatsApp (Twilio)',
    description: 'Envio de mensagens via WhatsApp usando Twilio',
    icon: MessageSquare,
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
      { key: 'phone_number', label: 'Número WhatsApp', type: 'text', required: true },
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: false }
    ]
  },
  {
    id: 'whatsapp_evolution',
    name: 'WhatsApp (Evolution API)',
    description: 'Envio de mensagens via Evolution API (usa segredos nas Edge Functions)',
    icon: MessageSquare,
    fields: [
      { key: 'instance', label: 'Instância', type: 'text', required: true },
      { key: 'api_url', label: 'API URL (opcional, usa segredo se vazio)', type: 'url', required: false }
    ]
  },
  {
    id: 'email_sendgrid',
    name: 'E-mail (SendGrid)',
    description: 'Envio de e-mails transacionais via SendGrid',
    icon: Mail,
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'from_email', label: 'E-mail Remetente', type: 'email', required: true },
      { key: 'from_name', label: 'Nome Remetente', type: 'text', required: true },
      { key: 'reply_to', label: 'E-mail para Respostas', type: 'email', required: false }
    ]
  },
  {
    id: 'email_smtp',
    name: 'E-mail (SMTP)',
    description: 'Envio de e-mails via servidor SMTP personalizado',
    icon: Mail,
    fields: [
      { key: 'host', label: 'Host SMTP', type: 'text', required: true },
      { key: 'port', label: 'Porta', type: 'number', required: true },
      { key: 'username', label: 'Usuário', type: 'text', required: true },
      { key: 'password', label: 'Senha', type: 'password', required: true },
      { key: 'from_email', label: 'E-mail Remetente', type: 'email', required: true },
      { key: 'from_name', label: 'Nome Remetente', type: 'text', required: true }
    ]
  },
  {
    id: 'payment_stripe',
    name: 'Pagamentos (Stripe)',
    description: 'Processamento de pagamentos via Stripe',
    icon: CreditCard,
    fields: [
      { key: 'public_key', label: 'Chave Pública', type: 'text', required: true },
      { key: 'secret_key', label: 'Chave Secreta', type: 'password', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false },
      { key: 'currency', label: 'Moeda', type: 'select', options: ['BRL', 'USD', 'EUR'], required: true }
    ]
  },
  {
    id: 'zapier_webhook',
    name: 'Zapier Webhook',
    description: 'Automação de workflows via Zapier',
    icon: Zap,
    fields: [
      { key: 'webhook_url', label: 'URL do Webhook', type: 'url', required: true },
      { key: 'trigger_events', label: 'Eventos que Disparam', type: 'textarea', required: false, placeholder: 'quote_created, quote_approved, payment_received' }
    ]
  },
  {
    id: 'n8n_webhook',
    name: 'N8N Webhook',
    description: 'Automação via N8N',
    icon: Brain,
    fields: [
      { key: 'webhook_url', label: 'URL do Webhook N8N', type: 'url', required: true },
      { key: 'auth_header', label: 'Header de Autenticação', type: 'text', required: false },
      { key: 'headers', label: 'Headers Personalizados (JSON)', type: 'textarea', required: false, placeholder: '{"X-Webhook-Secret":"..."}' },
      { key: 'trigger_events', label: 'Eventos que Disparam', type: 'textarea', required: false }
    ]
  },
  {
    id: 'generic_webhook',
    name: 'Webhook Genérico',
    description: 'Webhook personalizado para integrações customizadas',
    icon: Globe,
    fields: [
      { key: 'webhook_url', label: 'URL do Webhook', type: 'url', required: true },
      { key: 'method', label: 'Método HTTP', type: 'select', options: ['POST', 'PUT', 'PATCH'], required: true },
      { key: 'headers', label: 'Headers Personalizados', type: 'textarea', required: false, placeholder: '{"Content-Type": "application/json"}' },
      { key: 'auth_type', label: 'Tipo de Autenticação', type: 'select', options: ['none', 'bearer', 'basic', 'api_key'], required: true }
    ]
  }
];

export function IntegrationFormModal({ open, onOpenChange, onSubmit, editingIntegration }: IntegrationFormModalProps) {
  const [selectedType, setSelectedType] = useState<string>(editingIntegration?.integration_type || '');
  const [formData, setFormData] = useState<Record<string, any>>(
    editingIntegration?.configuration || {}
  );
  const [active, setActive] = useState(editingIntegration?.active || false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedIntegrationType = integrationTypes.find(type => type.id === selectedType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error('Selecione um tipo de integração');
      return;
    }

    const requiredFields = selectedIntegrationType?.fields.filter(field => field.required) || [];
    const missingFields = requiredFields.filter(field => !formData[field.key]);
    
    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios não preenchidos: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        integration_type: selectedType,
        configuration: formData,
        active
      });
      
      // Reset form
      setSelectedType('');
      setFormData({});
      setActive(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar integração:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (fieldKey: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const renderField = (field: any) => {
    const value = formData[field.key] || '';

    switch (field.type) {
      case 'password':
        return (
          <div className="relative">
            <Input
              type={showPasswords[field.key] ? 'text' : 'password'}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => togglePasswordVisibility(field.key)}
            >
              {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      
      default:
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
          <DialogTitle>
            {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
          </DialogTitle>
          <DialogDescription>
            Cadastre integrações por cliente/fornecedor. Segredos sensíveis serão usados via Edge Functions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção do Tipo */}
          {!editingIntegration && (
            <div className="space-y-4">
              <Label>Tipo de Integração</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {integrationTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.id}
                      className={`cursor-pointer transition-all ${
                        selectedType === type.id
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{type.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Campos de Configuração */}
          {selectedIntegrationType && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <selectedIntegrationType.icon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">{selectedIntegrationType.name}</h3>
                <Badge variant="outline">{selectedIntegrationType.id}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedIntegrationType.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>

              {/* Status Ativo */}
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="active">Integração Ativa</Label>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedType || isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Salvando...' : editingIntegration ? 'Atualizar' : 'Criar Integração'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}