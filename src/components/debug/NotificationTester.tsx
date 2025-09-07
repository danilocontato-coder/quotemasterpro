import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createTestNotification, createTestNotifications } from '@/utils/createTestNotification';
import { useToast } from '@/hooks/use-toast';
import { Bell, TestTube } from 'lucide-react';

export function NotificationTester() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket'>('info');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [actionUrl, setActionUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateNotification = async () => {
    if (!title || !message) {
      toast({
        title: 'Erro',
        description: 'Título e mensagem são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      await createTestNotification({
        title,
        message,
        type,
        priority,
        action_url: actionUrl || undefined,
        metadata: {
          source: 'notification-tester',
          timestamp: new Date().toISOString()
        }
      });

      toast({
        title: 'Sucesso',
        description: 'Notificação de teste criada com sucesso!'
      });

      // Limpar formulário
      setTitle('');
      setMessage('');
      setActionUrl('');
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar notificação de teste',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMultipleNotifications = async () => {
    setIsLoading(true);
    try {
      await createTestNotifications();
      toast({
        title: 'Sucesso',
        description: 'Múltiplas notificações de teste criadas!'
      });
    } catch (error) {
      console.error('Erro ao criar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar notificações de teste',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Testador de Notificações
        </CardTitle>
        <CardDescription>
          Crie notificações de teste para verificar o funcionamento do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da notificação"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensagem da notificação"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="quote">Cotação</SelectItem>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="payment">Pagamento</SelectItem>
                <SelectItem value="delivery">Entrega</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="actionUrl">URL de Ação (opcional)</Label>
          <Input
            id="actionUrl"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="/quotes, /payments, etc."
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCreateNotification}
            disabled={isLoading}
            className="flex-1"
          >
            <Bell className="h-4 w-4 mr-2" />
            Criar Notificação
          </Button>
          <Button
            onClick={handleCreateMultipleNotifications}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            Criar Várias
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}