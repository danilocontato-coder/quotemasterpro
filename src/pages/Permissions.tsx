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
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useSupabasePermissions, type Permission } from "@/hooks/useSupabasePermissions";
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { useGroupPermissionsSync } from "@/hooks/useGroupPermissionsSync";
import { useToast } from "@/hooks/use-toast";
import { CreateProfileModalSupabase } from "@/components/profiles/CreateProfileModalSupabase";

export function Permissions() {
  const { roles, permissions, updatePermission, loading, permissionProfiles } = useSupabasePermissions();
  const { groups } = useSupabaseUsers();
  const { 
    forceSyncGroup, 
    forceSyncPermissionProfile 
  } = useGroupPermissionsSync();
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");

  const currentRole = roles.find(r => r.id === activeRole);

  // Set first role as active when roles load
  useEffect(() => {
    if (roles.length > 0 && !activeRole) {
      setActiveRole(roles[0].id);
    }
  }, [roles, activeRole]);

  const handleSyncGroup = async (groupId: string) => {
    try {
      await forceSyncGroup(groupId);
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Falha ao sincronizar grupo", 
        variant: "destructive" 
      });
    }
  };

  const handleSyncProfile = async (profileId: string) => {
    try {
      await forceSyncPermissionProfile(profileId);
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Falha ao sincronizar perfil", 
        variant: "destructive" 
      });
    }
  };

  const isGroupSynced = (group: any) => {
    return permissionProfiles.some(p => p.name === `Grupo: ${group.name}` || p.id === group.permission_profile_id);
  };

  const getLinkedProfile = (group: any) => {
    return permissionProfiles.find(p => p.name === `Grupo: ${group.name}` || p.id === group.permission_profile_id);
  };

  const handlePermissionChange = async (module: string, action: keyof Permission, value: boolean) => {
    try {
      await updatePermission(activeRole, module, action, value);
    } catch (error) {
      // Error handling is done in the hook
    }
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
            Configure permissões por perfil e gerencie sincronização com grupos de usuários
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Perfil
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profiles">Perfis de Permissão</TabsTrigger>
          <TabsTrigger value="groups">Sincronização com Grupos</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-6">
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
              {loading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando permissões...</p>
                </div>
              )}
              {!loading && !currentRole && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Selecione um perfil para configurar suas permissões</p>
                </div>
              )}
              {!loading && currentRole && (
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
              )}
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
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          {/* Grupos e Sincronização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos de Usuários
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sincronize grupos de usuários com perfis de permissão
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groups.map((group) => {
                  const synced = isGroupSynced(group);
                  const linkedProfile = getLinkedProfile(group);
                  
                  return (
                    <div 
                      key={group.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <h4 className="font-medium">{group.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{group.user_count} usuários</span>
                            <span>•</span>
                            <span>{group.permissions.length} permissões</span>
                            {linkedProfile && (
                              <>
                                <span>•</span>
                                <span>Perfil: {linkedProfile.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {synced ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sincronizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Não Sincronizado
                          </Badge>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSyncGroup(group.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sincronizar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Perfis Vinculados a Grupos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Perfis Vinculados a Grupos
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Perfis de permissão criados automaticamente para grupos
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {permissionProfiles
                  .filter(profile => profile.name.startsWith('Grupo:'))
                  .map((profile) => {
                    const groupName = profile.name.replace('Grupo: ', '');
                    const linkedGroup = groups.find(g => g.name === groupName);
                    
                    return (
                      <div 
                        key={profile.id} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{profile.name}</h4>
                          <p className="text-sm text-muted-foreground">{profile.description}</p>
                          {linkedGroup && (
                            <div className="flex items-center gap-2 mt-1">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: linkedGroup.color }}
                              />
                              <span className="text-xs text-muted-foreground">
                                Grupo: {linkedGroup.name}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSyncProfile(profile.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sincronizar
                        </Button>
                      </div>
                    );
                  })}
                {permissionProfiles.filter(p => p.name.startsWith('Grupo:')).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum perfil vinculado a grupos encontrado</p>
                    <p className="text-sm text-muted-foreground">
                      Os perfis são criados automaticamente quando grupos são sincronizados
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Profile Modal */}
      <CreateProfileModalSupabase 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}