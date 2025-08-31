import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useProfiles } from "@/hooks/useProfiles";
import { useToast } from "@/hooks/use-toast";

interface CreateProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const availablePermissions = {
  "Cotações": [
    { id: "quotes.view", name: "Visualizar cotações" },
    { id: "quotes.create", name: "Criar cotações" },
    { id: "quotes.edit", name: "Editar cotações" },
    { id: "quotes.delete", name: "Excluir cotações" },
    { id: "quotes.manage", name: "Gerenciar todas as cotações" },
    { id: "quotes.respond", name: "Responder cotações" }
  ],
  "Aprovações": [
    { id: "approvals.view", name: "Visualizar aprovações" },
    { id: "approvals.level1", name: "Aprovar até R$ 1.000" },
    { id: "approvals.level2", name: "Aprovar até R$ 5.000" },
    { id: "approvals.level3", name: "Aprovar até R$ 20.000" },
    { id: "approvals.unlimited", name: "Aprovar valores ilimitados" },
    { id: "approvals.manage", name: "Gerenciar aprovações" }
  ],
  "Usuários": [
    { id: "users.view", name: "Visualizar usuários" },
    { id: "users.create", name: "Criar usuários" },
    { id: "users.edit", name: "Editar usuários" },
    { id: "users.delete", name: "Excluir usuários" },
    { id: "users.manage", name: "Gerenciar usuários" }
  ],
  "Produtos": [
    { id: "products.view", name: "Visualizar produtos" },
    { id: "products.create", name: "Criar produtos" },
    { id: "products.edit", name: "Editar produtos" },
    { id: "products.delete", name: "Excluir produtos" },
    { id: "products.manage", name: "Gerenciar produtos" }
  ],
  "Relatórios": [
    { id: "reports.view", name: "Visualizar relatórios" },
    { id: "reports.export", name: "Exportar relatórios" },
    { id: "reports.manage", name: "Gerenciar relatórios" }
  ],
  "Sistema": [
    { id: "system.settings", name: "Configurações do sistema" },
    { id: "system.permissions", name: "Gerenciar permissões" },
    { id: "system.audit", name: "Logs de auditoria" }
  ]
};

export function CreateProfileModal({ open, onClose }: CreateProfileModalProps) {
  const { createProfile } = useProfiles();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    active: true
  });

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e descrição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.permissions.length === 0) {
      toast({
        title: "Permissões obrigatórias",
        description: "Selecione pelo menos uma permissão.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newProfile = createProfile(formData);
      // Initialize permissions for the new profile
      // This would be handled by the permissions system
      toast({
        title: "Perfil criado",
        description: "Novo perfil criado com sucesso. Configure suas permissões na página de Permissões.",
      });
      onClose();
      // Reset form
      setFormData({
        name: "",
        description: "",
        permissions: [],
        active: true
      });
    } catch (error) {
      toast({
        title: "Erro ao criar perfil",
        description: "Ocorreu um erro ao criar o perfil. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Criar Novo Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Perfil *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Síndico, Conselho Fiscal..."
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Perfil Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Perfil pode ser usado por usuários
                </p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descreva as responsabilidades deste perfil..."
            />
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Permissões *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(availablePermissions).map(([category, permissions]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={formData.permissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(permission.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={permission.id} className="text-sm">
                          {permission.name}
                        </Label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Criar Perfil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
