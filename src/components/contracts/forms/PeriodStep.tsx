import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const CONTRACT_DURATIONS = [
  { value: '6m', label: '6 meses' },
  { value: '1y', label: '1 ano' },
  { value: '2y', label: '2 anos' },
  { value: '3y', label: '3 anos' },
  { value: '5y', label: '5 anos' },
  { value: 'custom', label: 'Período personalizado' }
];

interface PeriodStepProps {
  data: any;
  errors: Record<string, string>;
  contractDuration: string;
  onChange: (field: string, value: any) => void;
  onDurationChange: (duration: string) => void;
}

export function PeriodStep({ data, errors, contractDuration, onChange, onDurationChange }: PeriodStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Período e Vigência</h3>
          <p className="text-sm text-muted-foreground">
            Defina as datas e duração do contrato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="duration">
            Duração do Contrato <span className="text-destructive">*</span>
          </Label>
          <Select value={contractDuration} onValueChange={onDurationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a duração" />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_DURATIONS.map((duration) => (
                <SelectItem key={duration.value} value={duration.value}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">
            Data de Início <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !data.start_date && 'text-muted-foreground',
                  errors.start_date && 'border-destructive'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.start_date ? format(data.start_date, 'PPP', { locale: ptBR }) : 'Selecione a data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.start_date}
                onSelect={(date) => onChange('start_date', date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {errors.start_date && (
            <p className="text-sm text-destructive">{errors.start_date}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">
            Data de Término <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !data.end_date && 'text-muted-foreground',
                  errors.end_date && 'border-destructive'
                )}
                disabled={contractDuration !== 'custom'}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.end_date ? format(data.end_date, 'PPP', { locale: ptBR }) : 'Selecione a data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.end_date}
                onSelect={(date) => onChange('end_date', date)}
                disabled={(date) => data.start_date && date <= data.start_date}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {errors.end_date && (
            <p className="text-sm text-destructive">{errors.end_date}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="alert_days_before">
            Aviso de Renovação (dias)
          </Label>
          <Input
            id="alert_days_before"
            type="number"
            min="0"
            max="365"
            value={data.alert_days_before || 30}
            onChange={(e) => onChange('alert_days_before', parseInt(e.target.value))}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">
            Número de dias antes do vencimento para enviar alerta
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="auto_renewal" className="cursor-pointer">
                  Renovação Automática
                </Label>
                <p className="text-sm text-muted-foreground">
                  Marque para renovar automaticamente ao vencimento
                </p>
              </div>
            </div>
            <Switch
              id="auto_renewal"
              checked={data.auto_renewal || false}
              onCheckedChange={(checked) => onChange('auto_renewal', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
