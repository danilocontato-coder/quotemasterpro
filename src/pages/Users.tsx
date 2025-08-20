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
  Phone
} from "lucide-react";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { EditUserModal } from "@/components/users/EditUserModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { CreateProfileModal } from "@/components/profiles/CreateProfileModal";
import { useUsers } from "@/hooks/useUsers";
import { useProfiles } from "@/hooks/useProfiles";

export function Users() {
  const { users, searchTerm, setSearchTerm } = useUsers();
  const { profiles } = useProfiles();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createProfileModalOpen, setCreateProfileModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: "Administrador",
      manager: "Gerente", 
      collaborator: "Colaborador",
      supplier: "Fornecedor"
    };
    return roles[role as keyof typeof roles] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: "bg-destructive",
      manager: "bg-primary",
      collaborator: "bg-secondary", 
      supplier: "bg-warning"
    };
    return colors[role as keyof typeof colors] || "bg-secondary";
  };

  const getStatusColor = (status: string) => {
    return status === "active" ? "bg-success" : "bg-muted";
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
          <Button variant="outline" onClick={() => setCreateProfileModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Criar Perfil
          </Button>
        </div>
      </div>

      {/* Stats Cards - showing profile statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserPlus className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Profile-based stats */}
        {profiles.slice(0, 3).map((profile) => {
          const profileUserCount = users.filter(u => u.role === profile.id).length;
          return (
            <Card key={profile.id}>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-sm font-bold text-accent-foreground">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{profileUserCount}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-24">
                      {profile.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Show "More profiles" if there are many */}
        {profiles.length > 3 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-bold">+{profiles.length - 3}</span>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold">{profiles.length - 3}</p>
                  <p className="text-sm text-muted-foreground">Mais Perfis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou perfil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === "active" ? "default" : "secondary"}
                        className={getStatusColor(user.status)}
                      >
                        {user.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastAccess}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(user)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateUserModal 
        open={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
      
      <CreateProfileModal
        open={createProfileModalOpen}
        onClose={() => setCreateProfileModalOpen(false)}
      />
      
      {selectedUser && (
        <>
          <EditUserModal 
            open={editModalOpen} 
            onClose={() => setEditModalOpen(false)}
            user={selectedUser}
          />
          <DeleteUserModal 
            open={deleteModalOpen} 
            onClose={() => setDeleteModalOpen(false)}
            user={selectedUser}
          />
        </>
      )}
    </div>
  );
}