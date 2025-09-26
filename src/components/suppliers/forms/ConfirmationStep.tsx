import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Building, Mail, MessageCircle, Phone, Globe, MapPin, Wrench } from 'lucide-react';
import { SupplierFormData } from './SupplierFormSchema';

interface ConfirmationStepProps {
  data: Partial<SupplierFormData>;
}

export function ConfirmationStep({ data }: ConfirmationStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Confirmar Dados do Fornecedor
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Revise todas as informações antes de finalizar o cadastro
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dados Básicos */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building className="h-4 w-4" />
            Dados Básicos
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nome:</span>
              <span className="text-sm font-medium">{data.name || 'Não informado'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">CNPJ:</span>
              <span className="text-sm font-mono">{data.cnpj || 'Não informado'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <Badge variant="outline" className="text-xs">
                {data.type === 'local' ? 'Local' : 'Certificado'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Informações de Contato
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email:
              </span>
              <span className="text-sm font-medium">{data.email || 'Não informado'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MessageCircle className="h-3 w-3 text-green-600" />
                WhatsApp:
              </span>
              <span className="text-sm font-medium">{data.whatsapp || 'Não informado'}</span>
            </div>
            {data.phone && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Telefone:
                </span>
                <span className="text-sm font-medium">{data.phone}</span>
              </div>
            )}
            {data.website && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Website:
                </span>
                <span className="text-sm font-medium truncate max-w-48">{data.website}</span>
              </div>
            )}
          </div>
        </div>

        {/* Localização */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localização
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado:</span>
              <span className="text-sm font-medium">{data.state || 'Não informado'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cidade:</span>
              <span className="text-sm font-medium">{data.city || 'Não informado'}</span>
            </div>
            {data.address && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Endereço:</span>
                <span className="text-sm font-medium text-right max-w-64">{data.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Especialidades */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Especialidades ({(data.specialties || []).length})
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {(data.specialties || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(data.specialties || []).map((specialty) => (
                  <Badge 
                    key={specialty} 
                    variant="secondary"
                    className="text-xs bg-primary/10 text-primary border-primary/20"
                  >
                    {specialty}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma especialidade informada</span>
            )}
          </div>
        </div>

        {/* Aviso Final */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Pronto para cadastrar</h4>
              <p className="text-xs text-blue-700 mt-1">
                Após confirmar, o fornecedor será cadastrado e poderá receber cotações automaticamente via WhatsApp. 
                Você poderá editar essas informações posteriormente se necessário.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}