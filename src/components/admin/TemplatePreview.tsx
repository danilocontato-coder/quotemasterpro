import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Bell, Smartphone } from 'lucide-react';

interface TemplatePreviewProps {
  template: {
    name: string;
    subject: string;
    message_content: string;
    template_type: string;
    active: boolean;
  };
  variables?: Record<string, string>;
}

const getTemplateTypeIcon = (type: string) => {
  switch (type) {
    case 'whatsapp':
    case 'quote_request':
      return MessageSquare;
    case 'email':
      return Mail;
    case 'notification':
      return Bell;
    case 'sms':
      return Smartphone;
    default:
      return MessageSquare;
  }
};

const getTemplateTypeColor = (type: string) => {
  switch (type) {
    case 'whatsapp':
    case 'quote_request':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'email':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'notification':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'sms':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export function TemplatePreview({ template, variables = {} }: TemplatePreviewProps) {
  const Icon = getTemplateTypeIcon(template.template_type);
  
  // Replace template variables for preview
  const renderContent = (content: string) => {
    let rendered = content;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return rendered;
  };

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${getTemplateTypeColor(template.template_type)}`}
          >
            {template.template_type === 'quote_request' ? 'WhatsApp' : template.template_type.toUpperCase()}
          </Badge>
        </div>
        {template.subject && (
          <p className="text-sm text-muted-foreground font-medium">
            {renderContent(template.subject)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {renderContent(template.message_content)}
        </div>
      </CardContent>
    </Card>
  );
}