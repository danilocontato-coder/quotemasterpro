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
import { useSupabasePermissions } from "@/hooks/useSupabasePermissions";
import { useToast } from "@/hooks/use-toast";

interface CreateProfileModalSupabaseProps {
  open: boolean;
  onClose: () => void;
}

const availablePermissions = {
  "Cotações": [
    { id: "quotes.view", name: "Visualizar cotações" },
    { id: "quotes.create", name: "Criar cotações" },
    { id: "quotes.edit", name: "Editar cotações" },
    { id: "quotes.delete", name: "Excluir cotações" }
  ],
  "Produtos": [
    { id: "products.view", name: "Visualizar produtos" },
    { id: "products.create", name: "Criar produtos" },
    { id: "products.edit", name: "Editar produtos" },
    { id: "products.delete", name: "Excluir produtos" }
  ],
  "Fornecedores": [
    { id: "suppliers.view", name: "Visualizar fornecedores" },
    { id: "suppliers.create", name: "Criar fornecedores" },
    { id: "suppliers.edit", name: "Editar fornecedores" },
    { id: "suppliers.delete", name: "Excluir fornecedores" }
  ],
  "Pagamentos": [
    { id: "payments.view", name: "Visualizar pagamentos" },
    { id: "payments.create", name: "Criar pagamentos" },
    { id: "payments.edit", name: "Editar pagamentos" },
    { id: "payments.delete", name: "Excluir pagamentos" }
  ],
  "Comunicação": [
    { id: "communication.view", name: "Visualizar comunicações" },
    { id: "communication.create", name: "Criar comunicações" },
    { id: "communication.edit", name: "Editar comunicações" },
    { id: "communication.delete", name: "Excluir comunicações" }
  ],
  "Usuários": [
    { id: "users.view", name: "Visualizar usuários" },
    { id: "users.create", name: "Criar usuários" },
    { id: "users.edit", name: "Editar usuários" },
    { id: "users.delete", name: "Excluir usuários" }
  ],
  "Configurações": [
    { id: "settings.view", name: "Visualizar configurações" },
    { id: "settings.create", name: "Criar configurações" },
    { id: "settings.edit", name: "Editar configurações" },
    { id: "settings.delete", name: "Excluir configurações" }
  ],
  "Relatórios": [
    { id: "reports.view", name: "Visualizar relatórios" },
    { id: "reports.create", name: "Criar relatórios" },
    { id: "reports.edit", name: "Editar relatórios" },
    { id: "reports.delete", name: "Excluir relatórios" }
  ]
};

export function CreateProfileModalSupabase({ open, onClose }: CreateProfileModalSupabaseProps) {
  const { createPermissionProfile } = useSupabasePermissions();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedPermissions: [] as string[],
    active: true
  });
  const [loading, setLoading] = useState(false);

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: checked
        ? [...prev.selectedPermissions, permissionId]
        : prev.selectedPermissions.filter(p => p !== permissionId)
    }));
  };

  const convertPermissionsToStructure = (selectedPermissions: string[]) => {
    const permissions: Record<string, Record<string, boolean>> = {};
    
    // Initialize all modules with false permissions
    const modules = ['quotes', 'products', 'suppliers', 'payments', 'communication', 'users', 'settings', 'reports'];
    modules.forEach(module => {
      permissions[module] = {
        view: false,
        create: false,
        edit: false,
        delete: false
      };
    });

    // Set selected permissions to true
    selectedPermissions.forEach(permission => {
      const [module, action] = permission.split('.');
      if (permissions[module] && action in permissions[module]) {
        permissions[module][action] = true;
      }
    });

    return permissions;
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e descrição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.selectedPermissions.length === 0) {
      toast({
        title: "Permissões obrigatórias",
        description: "Selecione pelo menos uma permissão.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const permissions = convertPermissionsToStructure(formData.selectedPermissions);
      
      await createPermissionProfile({
        name: formData.name,
        description: formData.description,
        permissions
      });

      onClose();
      // Reset form
      setFormData({
        name: "",
        description: "",
        selectedPermissions: [],
        active: true
      });
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Criar Novo Perfil de Permissões
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
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
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
                          checked={formData.selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(permission.id, checked as boolean)
                          }
                          disabled={loading}
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
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Criando..." : "Criar Perfil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}