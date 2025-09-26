import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Mail, Phone, Globe, AlertCircle } from 'lucide-react';
import { ContactData } from './SupplierFormSchema';

interface ContactStepProps {
  data: Partial<ContactData>;
  errors: Partial<Record<keyof ContactData, string>>;
  onChange: (field: keyof ContactData, value: string) => void;
}

export function ContactStep({ data, errors, onChange }: ContactStepProps) {
  const formatPhone = (value: string) => {
    // Remove tudo que não for dígito
    const digits = value.replace(/\D/g, '');
    
    // Aplica a máscara do telefone brasileiro
    if (digits.length <= 11) {
      if (digits.length <= 10) {
        return digits
          .replace(/^(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      } else {
        return digits
          .replace(/^(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{5})(\d)/, '$1-$2');
      }
    }
    return value;
  };

  const handlePhoneChange = (field: 'whatsapp' | 'phone') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange(field, formatted);
  };

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();
    
    // Se não está vazio e não começa com http, adicionar http://
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      value = 'https://' + value;
    }
    
    onChange('website', value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Informações de Contato
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Dados de contato essenciais para o envio de cotações
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-green-600" />
            WhatsApp * (Principal meio de envio)
          </Label>
          <Input
            id="whatsapp"
            value={data.whatsapp || ''}
            onChange={handlePhoneChange('whatsapp')}
            placeholder="(11) 99999-9999"
            className={`${errors.whatsapp ? "border-destructive focus:border-destructive" : "border-green-200 focus:border-green-400"}`}
            maxLength={15}
          />
          {errors.whatsapp && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.whatsapp}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-green-600">
            <div className="w-1 h-1 bg-green-600 rounded-full"></div>
            As cotações serão enviadas automaticamente para este número
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-blue-600" />
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange('email', e.target.value.trim())}
            placeholder="contato@empresa.com"
            className={errors.email ? "border-destructive focus:border-destructive" : ""}
            maxLength={255}
          />
          {errors.email && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Usado para envio de documentos e comunicações formais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-gray-600" />
              Telefone (Opcional)
            </Label>
            <Input
              id="phone"
              value={data.phone || ''}
              onChange={handlePhoneChange('phone')}
              placeholder="(11) 3333-4444"
              className={errors.phone ? "border-destructive focus:border-destructive" : ""}
              maxLength={15}
            />
            {errors.phone && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.phone}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-purple-600" />
              Website (Opcional)
            </Label>
            <Input
              id="website"
              value={data.website || ''}
              onChange={handleWebsiteChange}
              placeholder="www.empresa.com"
              className={errors.website ? "border-destructive focus:border-destructive" : ""}
            />
            {errors.website && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.website}
              </div>
            )}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <MessageCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-900">Dica importante</h4>
              <p className="text-xs text-amber-700 mt-1">
                O WhatsApp é o principal meio de comunicação para envio de cotações. 
                Certifique-se de que o número está correto e ativo.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}