import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, Settings, Save } from 'lucide-react';

interface QuoteApprovalSettings {
  auto_notify_rejected_proposals: boolean;
  rejection_message_template?: string;
}

export function QuoteApprovalSettings() {
  const [settings, setSettings] = useState<QuoteApprovalSettings>({
    auto_notify_rejected_proposals: true,
    rejection_message_template: 'Sua proposta para "{quote_title}" não foi selecionada. Outra proposta foi aprovada pelo cliente.'
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
          auto_notify_rejected_proposals: clientSettings.auto_notify_rejected_proposals ?? true,
          rejection_message_template: clientSettings.rejection_message_template || settings.rejection_message_template
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.clientId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          settings: {
            auto_notify_rejected_proposals: settings.auto_notify_rejected_proposals,
            rejection_message_template: settings.rejection_message_template
          }
        })
        .eq('id', user.clientId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações',
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
            <Settings className="h-5 w-5" />
            Configurações de Aprovação
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
          <Settings className="h-5 w-5" />
          Configurações de Aprovação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-notify" className="text-base font-medium">
                Notificar propostas não selecionadas
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando uma proposta é aprovada, notificar automaticamente os fornecedores cujas propostas não foram selecionadas
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings.auto_notify_rejected_proposals ? (
                <Bell className="h-4 w-4 text-blue-600" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
              <Switch
                id="auto-notify"
                checked={settings.auto_notify_rejected_proposals}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, auto_notify_rejected_proposals: checked }))
                }
              />
            </div>
          </div>

          {settings.auto_notify_rejected_proposals && (
            <div className="space-y-2">
              <Label htmlFor="message-template">
                Modelo de mensagem (opcional)
              </Label>
              <Textarea
                id="message-template"
                placeholder="Use {quote_title} para inserir o título da cotação automaticamente"
                value={settings.rejection_message_template || ''}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, rejection_message_template: e.target.value }))
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {'{quote_title}'} para o título da cotação
              </p>
            </div>
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
            <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Sobre as notificações</p>
              <p className="text-blue-700 mt-1">
                Quando desabilitado, apenas o fornecedor aprovado será notificado. 
                Os demais fornecedores não receberão qualquer comunicação sobre o resultado.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}