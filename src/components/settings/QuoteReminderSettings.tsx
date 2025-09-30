import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, Clock, Save } from 'lucide-react';

interface ReminderSettings {
  auto_reminders_enabled: boolean;
  first_reminder_hours: number;
  second_reminder_hours: number;
  reminder_message_template?: string;
}

export function QuoteReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>({
    auto_reminders_enabled: true,
    first_reminder_hours: 48,
    second_reminder_hours: 72,
    reminder_message_template: 'Olá! Gostaríamos de lembrar que ainda estamos aguardando sua proposta para a cotação "{quote_title}". Por favor, nos retorne assim que possível.'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadSettings = async () => {
    if (!user?.clientId) return;

    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('settings')
        .eq('id', user.clientId)
        .single();

      if (error) throw error;

      if (clientData?.settings) {
        const clientSettings = clientData.settings as Record<string, any>;
        setSettings({
          auto_reminders_enabled: clientSettings.auto_reminders_enabled ?? true,
          first_reminder_hours: clientSettings.first_reminder_hours ?? 48,
          second_reminder_hours: clientSettings.second_reminder_hours ?? 72,
          reminder_message_template: clientSettings.reminder_message_template || settings.reminder_message_template
        });
      }
    } catch (error) {
      console.error('Error loading reminder settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações de lembretes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.clientId) return;

    // Validação básica
    if (settings.first_reminder_hours < 1 || settings.second_reminder_hours < 1) {
      toast({
        title: 'Erro de Validação',
        description: 'Os intervalos de lembrete devem ser maiores que 0 horas',
        variant: 'destructive',
      });
      return;
    }

    if (settings.second_reminder_hours <= settings.first_reminder_hours) {
      toast({
        title: 'Erro de Validação',
        description: 'O segundo lembrete deve ser enviado após o primeiro',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Buscar configurações atuais primeiro
      const { data: currentData } = await supabase
        .from('clients')
        .select('settings')
        .eq('id', user.clientId)
        .single();

      const currentSettings = (currentData?.settings as Record<string, any>) || {};

      // Mesclar com novas configurações
      const { error } = await supabase
        .from('clients')
        .update({
          settings: {
            ...currentSettings,
            auto_reminders_enabled: settings.auto_reminders_enabled,
            first_reminder_hours: settings.first_reminder_hours,
            second_reminder_hours: settings.second_reminder_hours,
            reminder_message_template: settings.reminder_message_template
          }
        })
        .eq('id', user.clientId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configurações de lembretes salvas com sucesso',
      });
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações de lembretes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user?.clientId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lembretes Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Lembretes Automáticos para Fornecedores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-reminders" className="text-base font-medium">
                Ativar lembretes automáticos
              </Label>
              <p className="text-sm text-muted-foreground">
                Enviar lembretes automáticos via WhatsApp para fornecedores que ainda não responderam às cotações
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings.auto_reminders_enabled ? (
                <Bell className="h-4 w-4 text-blue-600" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
              <Switch
                id="auto-reminders"
                checked={settings.auto_reminders_enabled}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, auto_reminders_enabled: checked }))
                }
              />
            </div>
          </div>

          {settings.auto_reminders_enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="first-reminder">
                    Primeiro lembrete (horas após envio)
                  </Label>
                  <Input
                    id="first-reminder"
                    type="number"
                    min="1"
                    value={settings.first_reminder_hours}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, first_reminder_hours: parseInt(e.target.value) || 1 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Padrão: 48 horas (2 dias)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="second-reminder">
                    Segundo lembrete (horas após envio)
                  </Label>
                  <Input
                    id="second-reminder"
                    type="number"
                    min="1"
                    value={settings.second_reminder_hours}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, second_reminder_hours: parseInt(e.target.value) || 1 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Padrão: 72 horas (3 dias)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-template">
                  Modelo de mensagem de lembrete
                </Label>
                <Textarea
                  id="reminder-template"
                  placeholder="Use {quote_title} para inserir o título da cotação"
                  value={settings.reminder_message_template || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, reminder_message_template: e.target.value }))
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {'{quote_title}'} para o título da cotação
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Como funcionam os lembretes</p>
              <p className="text-blue-700 mt-1">
                O sistema verifica diariamente às 6h (horário de Brasília) se há fornecedores 
                que ainda não responderam às cotações. Lembretes são enviados automaticamente 
                via WhatsApp de acordo com os intervalos configurados acima.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
