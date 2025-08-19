import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useUsers, type User } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";

interface DeleteUserModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

export function DeleteUserModal({ open, onClose, user }: DeleteUserModalProps) {
  const { deleteUser } = useUsers();
  const { toast } = useToast();

  const handleDelete = () => {
    try {
      deleteUser(user.id);
      
      toast({
        title: "Usuário excluído",
        description: `O usuário ${user.name} foi excluído com sucesso.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao excluir usuário",
        description: "Ocorreu um erro ao excluir o usuário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Atenção!</p>
              <p className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              Você está prestes a excluir o usuário:
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {user.role === "admin" ? "Administrador" :
                 user.role === "manager" ? "Gerente" :
                 user.role === "collaborator" ? "Colaborador" :
                 user.role === "supplier" ? "Fornecedor" : user.role}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Consequências da exclusão:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>O usuário não poderá mais fazer login</li>
              <li>Histórico de ações será mantido para auditoria</li>
              <li>Cotações criadas pelo usuário permanecerão no sistema</li>
              {user.role === "manager" && (
                <li>Aprovações pendentes serão reatribuídas</li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Confirmar Exclusão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}