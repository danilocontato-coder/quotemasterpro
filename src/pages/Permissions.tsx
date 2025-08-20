import { useState, useEffect } from "react";
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
  const { roles, permissions, updatePermission, initializeProfilePermissions } = usePermissions();
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState("admin");

  const currentRole = roles.find(r => r.id === activeRole);

  // Initialize permissions for the active role if it doesn't exist
  useEffect(() => {
    if (activeRole && !permissions[activeRole]) {
      initializeProfilePermissions(activeRole);
    }
  }, [activeRole, permissions, initializeProfilePermissions]);

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
    // Default colors for system roles
    const systemColors = {
      admin: "bg-destructive",
      manager: "bg-primary",
      collaborator: "bg-secondary",
      supplier: "bg-warning"
    };
    
    // Return system color if it exists, otherwise use a default for custom profiles
    return systemColors[roleId as keyof typeof systemColors] || "bg-accent";
  };

  const getModuleIcon = (module: string) => {
    const icons = {
      quotes: "💼",
      products: "📦",
      suppliers: "🏢",
      communication: "💬",
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

      {/* Role Stats - Organized in scrollable grid for many profiles */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Perfis Disponíveis</h2>
        <div className="max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-2">
            {roles.map((role) => (
              <Card key={role.id} className={`cursor-pointer transition-all hover:shadow-md ${activeRole === role.id ? "ring-2 ring-primary shadow-md" : ""}`}>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-full ${getRoleColor(role.id)} text-white`}>
                        {getRoleIcon(role.id)}
                      </div>
                      <Badge variant={activeRole === role.id ? "default" : "outline"} className="text-xs">
                        {activeRole === role.id ? "Ativo" : "Clique para selecionar"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{role.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                      <p className="text-xs text-muted-foreground">{role.userCount} usuários</p>
                    </div>
                    <Button
                      variant={activeRole === role.id ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveRole(role.id)}
                    >
                      {activeRole === role.id ? "Configurando" : "Configurar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {roles.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum perfil encontrado</p>
              <p className="text-sm text-muted-foreground">Crie novos perfis na página de usuários</p>
            </div>
          )}
        </div>
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
                     module === "products" ? "Produtos" :
                     module === "suppliers" ? "Fornecedores" :
                     module === "communication" ? "Comunicação" :
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
                          module === "products" ? "Produtos" :
                          module === "suppliers" ? "Fornecedores" :
                          module === "communication" ? "Comunicação" :
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