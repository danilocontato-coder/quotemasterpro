import { useState, useEffect } from "react";
import { Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VisitSettings as VisitSettingsType } from "@/types/visit";

export function VisitSettings() {
  const [settings, setSettings] = useState<Partial<VisitSettingsType>>({
    overdue_tolerance_days: 2,
    max_reschedule_attempts: 3,
    auto_disqualify_on_overdue: false,
    auto_confirm_after_days: undefined,
    notify_before_visit_days: 1,
    notify_on_overdue: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.client_id) {
        throw new Error('Client not found');
      }

      const { data, error } = await supabase
        .from('visit_settings')
        .select('*')
        .eq('client_id', profile.client_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error loading visit settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.client_id) {
        throw new Error('Client not found');
      }

      const { error } = await supabase
        .from('visit_settings')
        .upsert({
          client_id: profile.client_id,
          ...settings,
        });

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving visit settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Configurações de Visitas Técnicas</CardTitle>
        </div>
        <CardDescription>
          Defina como o sistema deve lidar com visitas técnicas para cotações de serviço
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tolerance">Tolerância de Atraso (dias)</Label>
          <Input
            id="tolerance"
            type="number"
            min={0}
            max={10}
            value={settings.overdue_tolerance_days || 2}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              overdue_tolerance_days: parseInt(e.target.value) 
            }))}
          />
          <p className="text-xs text-muted-foreground">
            Após quantos dias considerar a visita atrasada? (0-10)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-reschedules">Máximo de Reagendamentos</Label>
          <Input
            id="max-reschedules"
            type="number"
            min={1}
            max={10}
            value={settings.max_reschedule_attempts || 3}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              max_reschedule_attempts: parseInt(e.target.value) 
            }))}
          />
          <p className="text-xs text-muted-foreground">
            Quantos reagendamentos permitir por visita? (1-10)
          </p>
        </div>

        <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
          <div className="flex-1 space-y-1">
            <p className="font-medium">Desqualificar fornecedor ao atrasar</p>
            <p className="text-sm text-muted-foreground">
              Fornecedores que não realizarem visitas no prazo serão automaticamente desqualificados
            </p>
          </div>
          <Switch
            checked={settings.auto_disqualify_on_overdue || false}
            onCheckedChange={(checked) => setSettings(prev => ({ 
              ...prev, 
              auto_disqualify_on_overdue: checked 
            }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auto-confirm">Confirmação Automática (dias)</Label>
          <Input
            id="auto-confirm"
            type="number"
            min={0}
            max={30}
            value={settings.auto_confirm_after_days || ''}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              auto_confirm_after_days: e.target.value ? parseInt(e.target.value) : undefined
            }))}
            placeholder="Deixe vazio para exigir confirmação manual"
          />
          <p className="text-xs text-muted-foreground">
            Se preenchido, visitas serão confirmadas automaticamente após X dias da data agendada
          </p>
        </div>

        <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
          <div className="flex-1 space-y-1">
            <p className="font-medium">Notificar sobre visitas atrasadas</p>
            <p className="text-sm text-muted-foreground">
              Enviar notificações quando visitas estiverem atrasadas
            </p>
          </div>
          <Switch
            checked={settings.notify_on_overdue ?? true}
            onCheckedChange={(checked) => setSettings(prev => ({ 
              ...prev, 
              notify_on_overdue: checked 
            }))}
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
}
