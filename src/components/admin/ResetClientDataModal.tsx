import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  Building2, 
  FileText,
  Package,
  Bell,
  DollarSign,
  Loader2,
  Trash2
} from 'lucide-react';

interface Client {
  id: string;
  companyName: string;
  cnpj: string;
  email: string;
  status: string;
  quotesCount: number;
  usersCount?: number;
}

interface ResetClientDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onResetClientData: (id: string) => Promise<void>;
}

export const ResetClientDataModal: React.FC<ResetClientDataModalProps> = ({
  open,
  onOpenChange,
  client,
  onResetClientData
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const expectedText = client?.companyName || '';
  const canReset = confirmText === expectedText && understood;

  const handleReset = async () => {
    if (!client || !canReset || isResetting) return;

    console.log('Iniciando reset de dados do cliente:', client.id);
    setIsResetting(true);
    
    try {
      await onResetClientData(client.id);
      console.log('Dados do cliente resetados com sucesso');
      
      // Limpar estado antes de fechar
      setConfirmText('');
      setUnderstood(false);
      
      // Aguardar um pouco antes de fechar
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
      
    } catch (error) {
      console.error('Erro ao resetar dados do cliente:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancel = () => {
    if (isResetting) return;
    
    console.log('Cancelando reset de dados do cliente');
    setConfirmText('');
    setUnderstood(false);
    onOpenChange(false);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Trash2 className="h-5 w-5" />
            Limpar Dados do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aviso */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-800">Ação de Limpeza</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Esta ação irá remover <strong>TODOS</strong> os dados operacionais do cliente, mas manterá:
                </p>
                <ul className="text-sm text-orange-700 mt-2 list-disc list-inside space-y-1">
                  <li>✅ Cadastro da empresa</li>
                  <li>✅ Usuários e permissões</li>
                  <li>✅ Plano de assinatura</li>
                  <li>✅ Configurações da conta</li>
                </ul>
                <p className="text-sm text-orange-700 mt-2 font-medium">
                  ⚠️ Ideal para ambientes de teste ou para recomeçar do zero
                </p>
              </div>
            </div>
          </div>

          {/* Informações do Cliente */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-muted">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{client.companyName}</p>
                  <p className="text-sm text-muted-foreground">{client.cnpj}</p>
                </div>
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                  {client.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* O que será deletado */}
          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3 text-orange-800">📦 O que será REMOVIDO:</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Cotações e Propostas</p>
                    <p className="text-xs text-muted-foreground">
                      {client.quotesCount || 0} cotação(ões), itens, respostas e aprovações
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Produtos e Estoque</p>
                    <p className="text-xs text-muted-foreground">
                      Todos os produtos cadastrados e movimentações
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Pagamentos e Centros de Custo</p>
                    <p className="text-xs text-muted-foreground">
                      Histórico financeiro e categorias
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Notificações e Logs</p>
                    <p className="text-xs text-muted-foreground">
                      Histórico de atividades e auditoria
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* O que será mantido */}
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3 text-green-800">✅ O que será MANTIDO:</h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Cadastro da empresa ({client.companyName})
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  {client.usersCount || 0} usuário(s) e suas permissões
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Plano de assinatura ativo
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Configurações de branding e tema
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Confirmação */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
                disabled={isResetting}
              />
              <Label 
                htmlFor="understood"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Entendo que esta ação é irreversível e vai limpar todos os dados operacionais
              </Label>
            </div>

            <div>
              <Label htmlFor="confirm">
                Para confirmar, digite o nome da empresa: <strong>{client.companyName}</strong>
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={client.companyName}
                className="mt-2"
                disabled={isResetting || !understood}
              />
            </div>
            
            {confirmText && !canReset && understood && (
              <p className="text-sm text-orange-600">
                O nome não confere. Digite exatamente: {client.companyName}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isResetting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReset}
            disabled={!canReset || isResetting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            🧹 Limpar Dados
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
