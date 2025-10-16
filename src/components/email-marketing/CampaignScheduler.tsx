import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Calendar, Clock } from 'lucide-react';

interface CampaignSchedulerProps {
  onScheduleChange: (schedule: any) => void;
}

export function CampaignScheduler({ onScheduleChange }: CampaignSchedulerProps) {
  const [sendType, setSendType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [abTestingEnabled, setAbTestingEnabled] = useState(false);
  const [abTestPercentage, setAbTestPercentage] = useState([50]);

  const updateSchedule = () => {
    const schedule = {
      send_immediately: sendType === 'now',
      scheduled_send_at: sendType === 'scheduled' && scheduledDate
        ? `${scheduledDate}T${scheduledTime}:00`
        : null,
      timezone,
      ab_testing_enabled: abTestingEnabled,
      ab_test_percentage: abTestPercentage[0]
    };
    onScheduleChange(schedule);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamento e Envio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={sendType} onValueChange={(v: 'now' | 'scheduled') => {
          setSendType(v);
          setTimeout(updateSchedule, 0);
        }}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="now" id="now" />
            <Label htmlFor="now">Enviar imediatamente</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="scheduled" id="scheduled" />
            <Label htmlFor="scheduled">Agendar para depois</Label>
          </div>
        </RadioGroup>

        {sendType === 'scheduled' && (
          <div className="space-y-4 pl-6 border-l-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Data
                </Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => {
                    setScheduledDate(e.target.value);
                    setTimeout(updateSchedule, 0);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  Hora
                </Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => {
                    setScheduledTime(e.target.value);
                    setTimeout(updateSchedule, 0);
                  }}
                />
              </div>
            </div>

            <div>
              <Label>Fuso Horário</Label>
              <Select value={timezone} onValueChange={(v) => {
                setTimezone(v);
                setTimeout(updateSchedule, 0);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">Brasília (BRT)</SelectItem>
                  <SelectItem value="America/New_York">Nova York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Londres (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-semibold">A/B Testing</Label>
              <p className="text-xs text-muted-foreground">Testar diferentes versões do assunto</p>
            </div>
            <Switch
              checked={abTestingEnabled}
              onCheckedChange={(checked) => {
                setAbTestingEnabled(checked);
                setTimeout(updateSchedule, 0);
              }}
            />
          </div>

          {abTestingEnabled && (
            <div className="space-y-2 pl-6 border-l-2">
              <Label>Percentual para Variante A: {abTestPercentage[0]}%</Label>
              <Slider
                value={abTestPercentage}
                onValueChange={(value) => {
                  setAbTestPercentage(value);
                  setTimeout(updateSchedule, 0);
                }}
                min={10}
                max={90}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Variante B receberá {100 - abTestPercentage[0]}%
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}