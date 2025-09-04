import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Building2, 
  FileText,
  Users,
  DollarSign,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  companyName: string;
  cnpj: string;
  email: string;
  status: string;
  quotesCount: number;
  revenue: number;
}

interface DeleteClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onDeleteClient: (id: string) => Promise<void>;
}

export const DeleteClientModal: React.FC<DeleteClientModalProps> = ({
  open,
  onOpenChange,
  client,
  onDeleteClient
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const expectedText = client?.companyName || '';
  const canDelete = confirmText === expectedText;

  const handleDelete = async () => {
    if (!client || !canDelete || isDeleting) return;

    console.log('Iniciando exclusão do cliente:', client.id);
    setIsDeleting(true);
    
    try {
      await onDeleteClient(client.id);
      console.log('Cliente excluído com sucesso');
      
      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso do sistema.",
      });
      
      // Limpar estado antes de fechar
      setConfirmText('');
      
      // Aguardar um pouco antes de fechar para garantir que a operação foi concluída
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
      
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (isDeleting) return; // Não permitir cancelar durante operação
    
    console.log('Cancelando exclusão do cliente');
    setConfirmText('');
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Excluir Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aviso */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Ação Irreversível</h3>
                <p className="text-sm text-red-700 mt-1">
                  Esta ação não pode ser desfeita. Todos os dados relacionados ao cliente serão permanentemente removidos do sistema.
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

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-600">{client.quotesCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Cotações</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">{formatCurrency(client.revenue)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Receita</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-600">5</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* O que será excluído */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3">O que será excluído:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  Todas as informações da empresa
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  Histórico de cotações e propostas
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  Documentos e anexos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  Usuários e permissões
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  Relatórios e métricas
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Confirmação */}
          <div className="space-y-3">
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
                disabled={isDeleting}
              />
            </div>
            
            {confirmText && !canDelete && (
              <p className="text-sm text-red-600">
                O nome não confere. Digite exatamente: {client.companyName}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Excluir Cliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};