import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { useGroupPermissionsSync } from "@/hooks/useGroupPermissionsSync";
import { toast } from "sonner";

export function Permissions() {
  const { groups } = useSupabaseUsers();
  const { updateGroupPermissions, createPermissionProfileForGroup, hasPermissionProfile, getGroupPermissionProfile } = useGroupPermissionsSync();
  const [activeGroupId, setActiveGroupId] = useState("");

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const activeProfile = activeGroup ? getGroupPermissionProfile(activeGroup.id) : null;

  console.log('🔍 DEBUG Permissions Page:', {
    activeGroupId,
    activeGroup: activeGroup?.name,
    hasProfile: !!activeProfile,
    profileId: activeProfile?.id,
    groupPermissionProfileId: activeGroup?.permission_profile_id
  });

  // Set first group as active when groups load
  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  // Force re-render when group permission profile changes
  useEffect(() => {
    if (activeGroup) {
      console.log('👀 Grupo ativo mudou:', activeGroup.name, 'Profile ID:', activeGroup.permission_profile_id);
    }
  }, [activeGroup?.permission_profile_id]);

  const handlePermissionChange = async (module: string, action: 'view' | 'create' | 'edit' | 'delete', value: boolean) => {
    if (!activeGroupId) return;
    
    try {
      console.log('🔄 Alterando permissão:', { module, action, value });
      await updateGroupPermissions(activeGroupId, module, action, value);
    } catch (error) {
      console.error('Erro ao alterar permissão:', error);
    }
  };

  const handleCreatePermissions = async () => {
    if (!activeGroupId) return;
    
    console.log('🚀 Criando permissões para grupo:', activeGroupId);
    const success = await createPermissionProfileForGroup(activeGroupId);
    
    if (success) {
      console.log('✅ Permissões criadas, forçando re-render...');
      // Forçar uma nova busca dos dados após sucesso
      setTimeout(() => {
        const updatedProfile = getGroupPermissionProfile(activeGroupId);
        console.log('🔍 Perfil após criação:', updatedProfile);
      }, 2000);
    }
  };

  const getGroupIcon = (groupName: string) => {
    const name = groupName.toLowerCase();
    if (name.includes('admin')) return Shield;
    if (name.includes('gestor') || name.includes('manager')) return User;
    if (name.includes('colaborador') || name.includes('collaborator')) return Users;
    return Settings;
  };

  const getGroupColor = (groupName: string) => {
    const name = groupName.toLowerCase();
    if (name.includes('admin')) return "bg-destructive";
    if (name.includes('gestor') || name.includes('manager')) return "bg-primary";
    if (name.includes('colaborador') || name.includes('collaborator')) return "bg-secondary";
    return "bg-accent";
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

  const getModuleName = (module: string) => {
    const names = {
      quotes: "Cotações",
      products: "Produtos",
      suppliers: "Fornecedores",
      communication: "Comunicação",
      payments: "Pagamentos",
      users: "Usuários",
      settings: "Configurações",
      reports: "Relatórios"
    };
    return names[module as keyof typeof names] || module;
  };

  const getActionName = (action: string) => {
    const names = {
      view: "Visualizar",
      create: "Criar",
      edit: "Editar",
      delete: "Excluir"
    };
    return names[action as keyof typeof names] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissões por Grupo</h1>
          <p className="text-muted-foreground">
            Configure as permissões de cada grupo de usuários do sistema
          </p>
        </div>
      </div>

      {/* Grupos Disponíveis */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Grupos de Usuários</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((group) => {
            const IconComponent = getGroupIcon(group.name);
            return (
              <Card 
                key={group.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeGroupId === group.id ? "ring-2 ring-primary shadow-md" : ""
                }`}
                onClick={() => setActiveGroupId(group.id)}
              >
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div 
                        className={`p-2 rounded-full ${getGroupColor(group.name)} text-white`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <Badge 
                        variant={activeGroupId === group.id ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {activeGroupId === group.id ? "Ativo" : "Selecionar"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {group.description || `Grupo ${group.name}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.user_count} usuários
                      </p>
                    </div>
                    <Button
                      variant={activeGroupId === group.id ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                    >
                      {activeGroupId === group.id ? "Configurando" : "Configurar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {groups.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum grupo encontrado</p>
            <p className="text-sm text-muted-foreground">
              Vá para a página de Usuários para criar grupos
            </p>
          </div>
        )}
      </div>

      {/* Configuração de Permissões */}
      {activeGroup && activeProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const IconComponent = getGroupIcon(activeGroup.name);
                return <IconComponent className="h-5 w-5" />;
              })()}
              Permissões - {activeGroup.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure quais ações este grupo pode realizar em cada módulo do sistema
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(activeProfile.permissions || {}).map(([module, modulePermissions]) => (
                <div key={module} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{getModuleIcon(module)}</span>
                    <h3 className="text-lg font-semibold">
                      {getModuleName(module)}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(modulePermissions as Record<string, boolean>).map(([action, hasPermission]) => (
                      <div key={action} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          {action === "view" && <Eye className="h-4 w-4 text-primary" />}
                          {action === "create" && <Plus className="h-4 w-4 text-success" />}
                          {action === "edit" && <Edit className="h-4 w-4 text-warning" />}
                          {action === "delete" && <Trash2 className="h-4 w-4 text-destructive" />}
                          <span className="text-sm font-medium">
                            {getActionName(action)}
                          </span>
                        </div>
                        <Switch
                          checked={hasPermission}
                          onCheckedChange={(value) => 
                            handlePermissionChange(module, action as 'view' | 'create' | 'edit' | 'delete', value)
                          }
                          disabled={activeGroup.name.toLowerCase().includes('admin')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo de Permissões */}
      {activeGroup && activeProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Permissões - {activeGroup.name}</CardTitle>
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
                  {Object.entries(activeProfile.permissions || {}).map(([module, modulePermissions]) => (
                    <TableRow key={module}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{getModuleIcon(module)}</span>
                          {getModuleName(module)}
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
      )}

      {!activeProfile && activeGroup && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <div>
                <p className="text-muted-foreground">
                  O grupo "{activeGroup.name}" ainda não possui permissões configuradas.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Clique no botão abaixo para criar as permissões padrão para este grupo.
                </p>
              </div>
              <Button 
                onClick={handleCreatePermissions}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Permissões para {activeGroup.name}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Permissions;