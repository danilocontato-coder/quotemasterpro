import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Shield } from "lucide-react";
import { useUsers, type User as UserType } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: UserType;
}

export function EditUserModal({ open, onClose, user }: EditUserModalProps) {
  const { updateUser } = useUsers();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "collaborator" as const,
    status: "active" as const,
    client: "",
    supplier: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        status: user.status,
        client: user.client || "",
        supplier: user.supplier || ""
      });
    }
  }, [user]);

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      updateUser(user.id, formData);
      
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao atualizar usuário",
        description: "Ocorreu um erro ao atualizar o usuário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getRoleDescription = (role: string) => {
    const descriptions = {
      admin: "Acesso completo ao sistema e configurações",
      manager: "Gerenciamento de cotações, aprovações e usuários",
      collaborator: "Criação e edição de cotações",
      supplier: "Resposta a cotações e gestão de produtos"
    };
    return descriptions[role as keyof typeof descriptions] || "";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
              <CardDescription>
                Dados básicos do usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+55 11 99999-0000"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perfil de Acesso</CardTitle>
              <CardDescription>
                Configure o perfil e permissões do usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Perfil do Usuário</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-destructive" />
                        <span>Administrador</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span>Gerente</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="collaborator">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-secondary" />
                        <span>Colaborador</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="supplier">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-warning" />
                        <span>Fornecedor</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.role && (
                  <p className="text-sm text-muted-foreground">
                    {getRoleDescription(formData.role)}
                  </p>
                )}
              </div>

              <Separator />

              {(formData.role === "manager" || formData.role === "collaborator") && (
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente/Condomínio</Label>
                  <Select value={formData.client} onValueChange={(value) => setFormData({...formData, client: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Condomínio Azul">Condomínio Azul</SelectItem>
                      <SelectItem value="Condomínio Verde">Condomínio Verde</SelectItem>
                      <SelectItem value="Condomínio Amarelo">Condomínio Amarelo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.role === "supplier" && (
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Select value={formData.supplier} onValueChange={(value) => setFormData({...formData, supplier: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fornecedor Alpha">Fornecedor Alpha</SelectItem>
                      <SelectItem value="Fornecedor Beta">Fornecedor Beta</SelectItem>
                      <SelectItem value="Fornecedor Gamma">Fornecedor Gamma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Status do Usuário</Label>
                  <p className="text-sm text-muted-foreground">
                    Usuário pode fazer login no sistema
                  </p>
                </div>
                <Switch
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) => setFormData({...formData, status: checked ? "active" : "inactive"})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}