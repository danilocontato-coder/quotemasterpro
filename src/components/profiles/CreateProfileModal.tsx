import { useState, useMemo, useEffect } from "react";
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
} as const;

type PermissionId =
  | "quotes.view" | "quotes.create" | "quotes.edit" | "quotes.delete" | "quotes.manage" | "quotes.respond"
  | "approvals.view" | "approvals.level1" | "approvals.level2" | "approvals.level3" | "approvals.unlimited" | "approvals.manage"
  | "users.view" | "users.create" | "users.edit" | "users.delete" | "users.manage"
  | "products.view" | "products.create" | "products.edit" | "products.delete" | "products.manage"
  | "reports.view" | "reports.export" | "reports.manage"
  | "system.settings" | "system.permissions" | "system.audit";

export function CreateProfileModal({ open, onClose }: CreateProfileModalProps) {
  const { createProfile, listProfiles } = useProfiles(); // supondo que exista
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as PermissionId[],
    active: true
  });

  // Reseta quando o modal fecha (evita estado “sujo” ao cancelar)
  useEffect(() => {
    if (!open) {
      setFormData({ name: "", description: "", permissions: [], active: true });
      setIsSubmitting(false);
    }
  }, [open]);

  const allPermissionIds = useMemo<PermissionId[]>(
    () =>
      Object.values(availablePermissions).flat().map(p => p.id as PermissionId),
    []
  );

  const handlePermissionChange = (permissionId: PermissionId, checked: boolean | "indeterminate") => {
    const next = checked === true;
    setFormData(prev => ({
      ...prev,
      permissions: next
        ? Array.from(new Set([...prev.permissions, permissionId]))
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  const toggleCategory = (category: keyof typeof availablePermissions, selectAll: boolean) => {
    const ids = availablePermissions[category].map(p => p.id as PermissionId);
    setFormData(prev => {
      if (selectAll) {
        const merged = Array.from(new Set([...prev.permissions, ...ids]));
        return { ...prev, permissions: merged };
      } else {
        const filtered = prev.permissions.filter(p => !ids.includes(p));
        return { ...prev, permissions: filtered };
      }
    });
  };

  const validate = () => {
    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name || !description) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e descrição são obrigatórios.",
        variant: "destructive",
      });
      return false;
    }

    if (name.length < 3) {
      toast({
        title: "Nome muito curto",
        description: "Use ao menos 3 caracteres para o nome do perfil.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.permissions.length === 0) {
      toast({
        title: "Permissões obrigatórias",
        description: "Selecione pelo menos uma permissão.",
        variant: "destructive",
      });
      return false;
    }

    // Checagem opcional de duplicidade de nome
    try {
      const existing = listProfiles?.() ?? [];
      if (existing.some((p: any) => (p.name as string)?.toLowerCase().trim() === name.toLowerCase())) {
        toast({
          title: "Perfil já existe",
          description: "Já existe um perfil com esse nome. Escolha outro.",
          variant: "destructive",
        });
        return false;
      }
    } catch {
      // se o hook não expuser listagem, ignore
    }

    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
      };
      await Promise.resolve(createProfile(payload)); // garante await mesmo se for sync

      toast({
        title: "Perfil criado",
        description: "Novo perfil criado com sucesso. Configure suas permissões na página de Permissões.",
      });

      onClose(); // fechar modal (o useEffect fará o reset)
    } catch (error: any) {
      toast({
        title: "Erro ao criar perfil",
        description: error?.message ?? "Ocorreu um erro ao criar o perfil. Tente novamente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const switchId = "profile-active-switch";
  const switchDescId = "profile-active-desc";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Criar Novo Perfil
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Perfil *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Síndico, Conselho Fiscal..."
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor={switchId}>Perfil Ativo</Label>
                <p id={switchDescId} className="text-sm text-muted-foreground">
                  Perfil pode ser usado por usuários
                </p>
              </div>
              <Switch
                id={switchId}
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                aria-labelledby={switchId}
                aria-describedby={switchDescId}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva as responsabilidades deste perfil..."
              required
            />
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Permissões *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(availablePermissions).map(([category, permissions]) => {
                const allSelected = permissions.every(p => formData.permissions.includes(p.id as PermissionId));
                const someSelected = !allSelected && permissions.some(p => formData.permissions.includes(p.id as PermissionId));

                return (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{category}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleCategory(category as keyof typeof availablePermissions, true)}>
                            Selecionar todos
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleCategory(category as keyof typeof availablePermissions, false)}>
                            Limpar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={formData.permissions.includes(permission.id as PermissionId)}
                            onCheckedChange={(checked) => handlePermissionChange(permission.id as PermissionId, checked)}
                            aria-checked={formData.permissions.includes(permission.id as PermissionId) ? "true" : (someSelected ? "mixed" : "false")}
                          />
                          <Label htmlFor={permission.id} className="text-sm">
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Perfil"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
