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
import { useUsers } from '@/hooks/useUsersAndGroups';
import { toast } from 'sonner';

interface DeleteUserModalProps {
  open: boolean;
  onClose: () => void;
  user: any;
}

export function DeleteUserModal({ open, onClose, user }: DeleteUserModalProps) {
  const { deleteUser } = useUsers();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      deleteUser(user.id);
      toast.success('Usuário excluído com sucesso');
      onClose();
    } catch (error) {
      toast.error('Erro ao excluir usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o usuário <strong>{user?.name}</strong>?
            Esta ação não pode ser desfeita e removerá permanentemente:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Todas as informações do usuário</li>
            <li>Histórico de atividades</li>
            <li>Permissões e grupos associados</li>
            <li>Credenciais de acesso</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}