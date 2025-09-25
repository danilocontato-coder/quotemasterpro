import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, User } from 'lucide-react';
import { useSupplierUsers, SupplierUser } from '@/hooks/useSupplierUsers';

interface DeleteSupplierUserModalProps {
  open: boolean;
  onClose: () => void;
  user: SupplierUser | null;
}

export function DeleteSupplierUserModal({ open, onClose, user }: DeleteSupplierUserModalProps) {
  const { deleteUser } = useSupplierUsers();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) {
      console.error('❌ [DELETE-MODAL] Nenhum usuário selecionado');
      return;
    }

    console.log('🗑️ [DELETE-MODAL] Iniciando exclusão do usuário:', user);
    setLoading(true);
    
    try {
      await deleteUser(user.id);
      console.log('✅ [DELETE-MODAL] Exclusão bem-sucedida, fechando modal');
      onClose();
    } catch (error) {
      console.error('❌ [DELETE-MODAL] Erro ao remover usuário:', error);
      // Toast já é exibido no hook, não precisa duplicar aqui
    } finally {
      console.log('🔄 [DELETE-MODAL] Finalizando loading state');
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Remover Usuário
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. O usuário será removido permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Ao remover este usuário, todas as suas atividades e 
              dados associados serão mantidos no sistema, mas ele perderá acesso imediatamente.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{user.name}</h4>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Função: {user.role === 'manager' ? 'Gerente' : 
                          user.role === 'collaborator' ? 'Colaborador' : 'Fornecedor'}
                  {user.status === 'inactive' && ' • Inativo'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">O que acontecerá:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• O usuário perderá acesso imediato ao sistema</li>
              <li>• Todas as cotações e atividades criadas por ele serão mantidas</li>
              <li>• O histórico de ações será preservado para auditoria</li>
              <li>• Esta ação não pode ser revertida</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Removendo...' : 'Remover Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}