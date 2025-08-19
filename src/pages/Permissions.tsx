import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Shield, 
  User, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Check,
  X
} from "lucide-react";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

export function Permissions() {
  const { roles, permissions, updatePermission } = usePermissions();
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState("manager");

  const currentRole = roles.find(r => r.id === activeRole);

  const handlePermissionChange = (module: string, action: keyof Permission, value: boolean) => {
    updatePermission(activeRole, module, action, value);
    toast({
      title: "Permissão atualizada",
      description: `Permissão ${value ? 'concedida' : 'removida'} com sucesso.`,
    });
  };

  const getRoleIcon = (roleId: string) => {
    const icons = {
      admin: Shield,
      manager: User,
      collaborator: Users,
      supplier: Settings
    };
    const IconComponent = icons[roleId as keyof typeof icons] || User;
    return <IconComponent className="h-4 w-4" />;
  };

  const getRoleColor = (roleId: string) => {
    const colors = {
      admin: "bg-destructive",
      manager: "bg-primary",
      collaborator: "bg-secondary",
      supplier: "bg-warning"
    };
    return colors[roleId as keyof typeof colors] || "bg-secondary";
  };

  const getModuleIcon = (module: string) => {
    const icons = {
      quotes: "💼",
      items: "📦",
      suppliers: "🏢",
      approvals: "✅",
      payments: "💳",
      users: "👥",
      settings: "⚙️",
      reports: "📊"
    };
    return icons[module as keyof typeof icons] || "📄";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissões do Sistema</h1>
          <p className="text-muted-foreground">
            Configure permissões por perfil de usuário
          </p>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className={activeRole === role.id ? "ring-2 ring-primary" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${getRoleColor(role.id)} text-white mr-3`}>
                    {getRoleIcon(role.id)}
                  </div>
                  <div>
                    <p className="font-medium">{role.name}</p>
                    <p className="text-sm text-muted-foreground">{role.userCount} usuários</p>
                  </div>
                </div>
                <Button
                  variant={activeRole === role.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveRole(role.id)}
                >
                  {activeRole === role.id ? "Ativo" : "Selecionar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentRole && getRoleIcon(currentRole.id)}
            Permissões - {currentRole?.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure quais ações este perfil pode realizar em cada módulo
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(permissions[activeRole] || {}).map(([module, modulePermissions]) => (
              <div key={module} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{getModuleIcon(module)}</span>
                  <h3 className="text-lg font-semibold capitalize">
                    {module === "quotes" ? "Cotações" :
                     module === "items" ? "Itens" :
                     module === "suppliers" ? "Fornecedores" :
                     module === "approvals" ? "Aprovações" :
                     module === "payments" ? "Pagamentos" :
                     module === "users" ? "Usuários" :
                     module === "settings" ? "Configurações" :
                     module === "reports" ? "Relatórios" : module}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(Object.entries(modulePermissions) as Array<[keyof Permission, boolean]>).map(([action, hasPermission]) => (
                    <div key={String(action)} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-2">
                        {String(action) === "view" && <Eye className="h-4 w-4 text-primary" />}
                        {String(action) === "create" && <Plus className="h-4 w-4 text-success" />}
                        {String(action) === "edit" && <Edit className="h-4 w-4 text-warning" />}
                        {String(action) === "delete" && <Trash2 className="h-4 w-4 text-destructive" />}
                         <span className="text-sm font-medium">
                           {String(action) === "view" ? "Visualizar" :
                            String(action) === "create" ? "Criar" :
                            String(action) === "edit" ? "Editar" :
                            String(action) === "delete" ? "Excluir" : String(action)}
                         </span>
                      </div>
                      <Switch
                        checked={hasPermission}
                        onCheckedChange={(value) => handlePermissionChange(module, action, value)}
                        disabled={activeRole === "admin"} // Admin sempre tem todas as permissões
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Visualizar</TableHead>
                  <TableHead>Criar</TableHead>
                  <TableHead>Editar</TableHead>
                  <TableHead>Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(permissions[activeRole] || {}).map(([module, modulePermissions]) => (
                  <TableRow key={module}>
                    <TableCell className="font-medium capitalize">
                      <div className="flex items-center gap-2">
                        <span>{getModuleIcon(module)}</span>
                        {module === "quotes" ? "Cotações" :
                         module === "items" ? "Itens" :
                         module === "suppliers" ? "Fornecedores" :
                         module === "approvals" ? "Aprovações" :
                         module === "payments" ? "Pagamentos" :
                         module === "users" ? "Usuários" :
                         module === "settings" ? "Configurações" :
                         module === "reports" ? "Relatórios" : module}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(modulePermissions as any).view ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {(modulePermissions as any).create ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {(modulePermissions as any).edit ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {(modulePermissions as any).delete ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}