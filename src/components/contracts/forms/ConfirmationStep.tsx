import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, Calendar, DollarSign, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTRACT_TYPES, CONTRACT_STATUSES } from '@/constants/contracts';

interface ConfirmationStepProps {
  data: any;
  attachments: string[];
}

const PAYMENT_FREQUENCIES: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
  one_time: 'Pagamento Único'
};

export function ConfirmationStep({ data, attachments }: ConfirmationStepProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-3 bg-green-500/10 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Revisão Final</h3>
          <p className="text-sm text-muted-foreground">
            Confira todas as informações antes de salvar
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            <span>Informações Básicas</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Título</p>
              <p className="font-medium">{data.title}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <Badge variant="outline">{CONTRACT_TYPES[data.contract_type as keyof typeof CONTRACT_TYPES]}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge>{CONTRACT_STATUSES[data.status as keyof typeof CONTRACT_STATUSES]}</Badge>
            </div>
            {data.description && (
              <div className="md:col-span-2">
                <p className="text-muted-foreground">Descrição</p>
                <p className="font-medium">{data.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Período */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Período e Vigência</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Data de Início</p>
              <p className="font-medium">
                {data.start_date ? format(data.start_date, 'PPP', { locale: ptBR }) : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Data de Término</p>
              <p className="font-medium">
                {data.end_date ? format(data.end_date, 'PPP', { locale: ptBR }) : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Aviso de Renovação</p>
              <p className="font-medium">{data.alert_days_before || 30} dias antes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Renovação Automática</p>
              <Badge variant={data.auto_renewal ? 'default' : 'outline'}>
                {data.auto_renewal ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-primary" />
            <span>Valores e Pagamento</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="font-medium text-lg text-primary">
                {formatCurrency(data.total_value || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Periodicidade</p>
              <Badge variant="outline">
                {PAYMENT_FREQUENCIES[data.payment_frequency as keyof typeof PAYMENT_FREQUENCIES]}
              </Badge>
            </div>
            {data.payment_terms && (
              <div className="md:col-span-2">
                <p className="text-muted-foreground">Termos de Pagamento</p>
                <p className="font-medium">{data.payment_terms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Anexos */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4 text-primary" />
            <span>Anexos</span>
          </div>
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((_, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span>Anexo {index + 1}.pdf</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum anexo adicionado</p>
          )}
        </div>
      </div>
    </div>
  );
}
