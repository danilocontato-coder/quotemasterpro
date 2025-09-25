import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Mail,
  Phone,
  Users as UsersIcon,
  UserCog,
  Building2,
  Clock,
  AlertCircle
} from "lucide-react";
import { CreateSupplierUserModal } from "@/components/supplier/CreateSupplierUserModal";
import { EditSupplierUserModal } from "@/components/supplier/EditSupplierUserModal";
import { DeleteSupplierUserModal } from "@/components/supplier/DeleteSupplierUserModal";
import { SupplierUserPermissionsModal } from "@/components/supplier/SupplierUserPermissionsModal";
import { useSupplierUsers, SupplierUser, SupplierPermissionProfile } from "@/hooks/useSupplierUsers";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SupplierUsers() {
  const { 
    filteredUsers, 
    permissionProfiles, 
    loading, 
    searchTerm, 
    setSearchTerm, 
    toggleUserStatus 
  } = useSupplierUsers();

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SupplierUser | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<SupplierPermissionProfile | null>(null);

  // Handle user actions
  const handleEditUser = (user: SupplierUser) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteUser = (user: SupplierUser) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleToggleStatus = (user: SupplierUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    toggleUserStatus(user.id, newStatus);
  };

  const handleEditProfile = (profile: SupplierPermissionProfile) => {
    setSelectedProfile(profile);
    setPermissionsModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      manager: { variant: "default" as const, label: "Gerente" },
      collaborator: { variant: "secondary" as const, label: "Colaborador" },
      supplier: { variant: "outline" as const, label: "Fornecedor" }
    };
    
    const config = variants[role as keyof typeof variants] || variants.collaborator;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">Inativo</Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <UsersIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground">Gerencie usuários e permissões da empresa</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <UsersIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e permissões da empresa</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="profiles">Perfis de Permissão</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Usuários ({filteredUsers.length})
                </CardTitle>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? "Não encontramos usuários com este termo de busca."
                      : "Comece adicionando o primeiro usuário da empresa."
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Usuário
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Último Acesso</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getRoleBadge(user.role)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {user.last_access 
                                ? new Date(user.last_access).toLocaleDateString('pt-BR')
                                : 'Nunca acessou'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  {user.status === 'active' ? 'Desativar' : 'Ativar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Perfis de Permissão ({permissionProfiles.length})
                </CardTitle>
                <Button onClick={() => {
                  setSelectedProfile(null);
                  setPermissionsModalOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Perfil
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {permissionProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum perfil de permissão</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie perfis de permissão para organizar o acesso dos usuários aos recursos do sistema.
                  </p>
                  <Button onClick={() => {
                    setSelectedProfile(null);
                    setPermissionsModalOpen(true);
                  }}>
                    <Shield className="h-4 w-4 mr-2" />
                    Criar Primeiro Perfil
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {permissionProfiles.map((profile) => (
                    <Card key={profile.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{profile.name}</CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {profile.description && (
                          <p className="text-sm text-muted-foreground">{profile.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Módulos com acesso:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(profile.permissions).map(([module, permissions]) => {
                              const hasAnyPermission = Object.values(permissions as Record<string, boolean>)
                                .some(Boolean);
                              
                              if (!hasAnyPermission) return null;
                              
                              return (
                                <Badge key={module} variant="secondary" className="text-xs">
                                  {module}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateSupplierUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <EditSupplierUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <DeleteSupplierUserModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <SupplierUserPermissionsModal
        open={permissionsModalOpen}
        onClose={() => {
          setPermissionsModalOpen(false);
          setSelectedProfile(null);
        }}
        profile={selectedProfile}
      />
    </div>
  );
}