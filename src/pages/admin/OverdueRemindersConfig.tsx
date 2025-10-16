import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Bell, Mail, MessageSquare, Calendar, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface FinancialSettings {
  overdue_reminder_enabled: boolean;
  overdue_reminder_channels: string[];
  overdue_reminder_schedule: number[];
  overdue_reminder_stop_after_days: number;
  late_fee_percentage: number;
}

interface OverdueReminder {
  id: string;
  invoice_id: string;
  client: {
    name: string;
    company_name: string | null;
  };
  reminder_day: number;
  days_overdue: number;
  sent_at: string;
  sent_via_whatsapp: boolean;
  sent_via_email: boolean;
  invoice_amount: number;
}

export default function OverdueRemindersConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FinancialSettings>({
    overdue_reminder_enabled: true,
    overdue_reminder_channels: ['whatsapp', 'email'],
    overdue_reminder_schedule: [1, 3, 7, 15, 30],
    overdue_reminder_stop_after_days: 45,
    late_fee_percentage: 2.0,
  });
  const [recentReminders, setRecentReminders] = useState<OverdueReminder[]>([]);
  const [scheduleInput, setScheduleInput] = useState('1, 3, 7, 15, 30');
  
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadRecentReminders();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const channels = Array.isArray(data.overdue_reminder_channels) 
          ? data.overdue_reminder_channels as string[]
          : ['whatsapp', 'email'];
        
        const schedule = Array.isArray(data.overdue_reminder_schedule)
          ? data.overdue_reminder_schedule as number[]
          : [1, 3, 7, 15, 30];
        
        setSettings({
          overdue_reminder_enabled: data.overdue_reminder_enabled ?? true,
          overdue_reminder_channels: channels,
          overdue_reminder_schedule: schedule,
          overdue_reminder_stop_after_days: data.overdue_reminder_stop_after_days ?? 45,
          late_fee_percentage: data.late_fee_percentage ?? 2.0,
        });
        setScheduleInput(schedule.join(', '));
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar configurações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('overdue_reminders')
        .select(`
          id,
          invoice_id,
          reminder_day,
          days_overdue,
          sent_at,
          sent_via_whatsapp,
          sent_via_email,
          invoice_amount,
          client:clients (
            name,
            company_name
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setRecentReminders(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validar e converter schedule input
      const scheduleArray = scheduleInput
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);

      if (scheduleArray.length === 0) {
        toast({
          title: 'Agenda inválida',
          description: 'Insira pelo menos um dia válido (ex: 1, 3, 7)',
          variant: 'destructive',
        });
        return;
      }

      const updatedSettings = {
        ...settings,
        overdue_reminder_schedule: scheduleArray,
      };

      const { error } = await supabase
        .from('financial_settings')
        .upsert(updatedSettings, { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de lembretes foram atualizadas com sucesso.',
      });

      setSettings(updatedSettings);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChannelChange = (channel: string, checked: boolean) => {
    const newChannels = checked
      ? [...settings.overdue_reminder_channels, channel]
      : settings.overdue_reminder_channels.filter(c => c !== channel);

    setSettings({ ...settings, overdue_reminder_channels: newChannels });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Lembretes de Cobrança Automáticos</h1>
        <p className="text-muted-foreground mt-2">
          Configure lembretes por WhatsApp e E-mail para boletos em atraso
        </p>
      </div>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Lembretes
          </CardTitle>
          <CardDescription>
            Personalize como e quando os lembretes são enviados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Habilitar/Desabilitar */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enabled" className="text-base font-medium">
                Lembretes Automáticos
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativar envio automático de lembretes de cobrança
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.overdue_reminder_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, overdue_reminder_enabled: checked })
              }
            />
          </div>

          {/* Canais */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Canais de Envio</Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whatsapp"
                  checked={settings.overdue_reminder_channels.includes('whatsapp')}
                  onCheckedChange={(checked) =>
                    handleChannelChange('whatsapp', checked as boolean)
                  }
                />
                <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  WhatsApp
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={settings.overdue_reminder_channels.includes('email')}
                  onCheckedChange={(checked) =>
                    handleChannelChange('email', checked as boolean)
                  }
                />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4 text-blue-600" />
                  E-mail
                </Label>
              </div>
            </div>
          </div>

          {/* Agenda de Lembretes */}
          <div className="space-y-3">
            <Label htmlFor="schedule" className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agenda de Lembretes
            </Label>
            <p className="text-sm text-muted-foreground">
              Dias após o vencimento para enviar lembretes (separados por vírgula)
            </p>
            <Input
              id="schedule"
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
              placeholder="1, 3, 7, 15, 30"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Exemplo: 1, 3, 7, 15, 30 (enviará nos dias D+1, D+3, D+7, D+15, D+30)
            </p>
          </div>

          {/* Limite de dias */}
          <div className="space-y-3">
            <Label htmlFor="stop_days" className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Parar de Enviar Após
            </Label>
            <p className="text-sm text-muted-foreground">
              Número de dias em atraso para parar de enviar lembretes
            </p>
            <Input
              id="stop_days"
              type="number"
              min={1}
              value={settings.overdue_reminder_stop_after_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overdue_reminder_stop_after_days: parseInt(e.target.value) || 45,
                })
              }
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Recomendado: 45 dias
            </p>
          </div>

          {/* Percentual de multa */}
          <div className="space-y-3">
            <Label htmlFor="late_fee" className="text-base font-medium">
              Percentual de Multa por Atraso
            </Label>
            <p className="text-sm text-muted-foreground">
              Percentual aplicado ao cálculo de multa nos lembretes
            </p>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                id="late_fee"
                type="number"
                min={0}
                step={0.1}
                value={settings.late_fee_percentage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    late_fee_percentage: parseFloat(e.target.value) || 2.0,
                  })
                }
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico Recente */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Lembretes Enviados</CardTitle>
          <CardDescription>
            Últimos 20 lembretes processados pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentReminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum lembrete enviado ainda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dias Atraso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Canais</TableHead>
                  <TableHead>Enviado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-mono text-sm">
                      {reminder.invoice_id}
                    </TableCell>
                    <TableCell>
                      {reminder.client?.company_name || reminder.client?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        D+{reminder.days_overdue}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      R$ {reminder.invoice_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {reminder.sent_via_whatsapp && (
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        )}
                        {reminder.sent_via_email && (
                          <Mail className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(reminder.sent_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
