import { useState, useEffect, useMemo } from "react";
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
  MessageSquare,
  UserPlus,
  Shield,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  UserCog
} from "lucide-react";
import { CreateUserModal } from "@/components/users/CreateUserModalSupabase";
import { EditUserModal } from "@/components/users/EditUserModalSupabase";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { ResendCredentialsModal } from "@/components/users/ResendCredentialsModal";
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { GroupManager } from "@/components/users/GroupManagerSupabase";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";


export default function Users() {
  const { users, groups, loading, searchTerm, setSearchTerm } = useSupabaseUsers();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Filtered users based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role && getRoleLabel(user.role).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  // Pagination
  const pagination = usePagination(filteredUsers, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  });

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: "Administrador",
      manager: "Gestor", 
      collaborator: "Colaborador",
      supplier: "Fornecedor"
    };
    return roles[role as keyof typeof roles] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: "bg-red-600 text-white",
      manager: "bg-blue-600 text-white",
      collaborator: "bg-green-600 text-white", 
      supplier: "bg-orange-600 text-white"
    };
    return colors[role as keyof typeof colors] || "bg-secondary";
  };

  const getStatusColor = (status: string) => {
    return status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const formatLastAccess = (lastAccess: string | null) => {
    if (!lastAccess) return 'Nunca acessou';
    
    const date = new Date(lastAccess);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Se foi hoje
    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMinutes === 0) {
          return 'Agora mesmo';
        }
        return `${diffMinutes} min atrás`;
      }
      return `${diffHours}h atrás`;
    }
    
    // Se foi ontem
    if (diffDays === 1) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Se foi esta semana (últimos 7 dias)
    if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    }
    
    // Data completa para acessos mais antigos
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleResendCredentials = (user: any) => {
    setSelectedUser(user);
    setResendModalOpen(true);
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
          <Button variant="outline" onClick={() => setGroupManagerOpen(true)}>
            <UsersIcon className="h-4 w-4 mr-2" />
            Gerenciar Grupos
          </Button>
        </div>
      </div>


      {/* Stats Cards */}
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
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{groups.length}</p>
                <p className="text-sm text-muted-foreground">Grupos Criados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{users.filter(u => u.force_password_change).length}</p>
                <p className="text-sm text-muted-foreground">Senhas Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span>Carregando usuários...</span>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Grupos</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedData.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url} />
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
                        <div className="flex flex-wrap gap-1">
                          {user.groups?.slice(0, 2).map(groupName => {
                            const group = groups.find(g => g.name === groupName);
                            return group ? (
                              <Badge 
                                key={group.id} 
                                variant="outline" 
                                className="text-xs"
                                style={{ 
                                  borderColor: group.color,
                                  color: group.color
                                }}
                              >
                                {group.name}
                              </Badge>
                            ) : (
                              <Badge key={groupName} variant="outline" className="text-xs">
                                {groupName}
                              </Badge>
                            );
                          })}
                          {user.groups && user.groups.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.groups.length - 2}
                            </Badge>
                          )}
                        </div>
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
                        {user.force_password_change && (
                          <Badge variant="outline" className="ml-2 text-xs text-yellow-600">
                            Senha Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastAccess(user.last_access)}
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
                            <DropdownMenuItem onClick={() => handleResendCredentials(user)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Reenviar Credenciais
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
            )}

            {/* Empty state */}
            {!loading && pagination.paginatedData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {filteredUsers.length === 0 ? 'Nenhum usuário encontrado' : 'Nenhum usuário nesta página'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {filteredUsers.length === 0 
                    ? 'Tente ajustar os filtros ou criar um novo usuário'
                    : 'Navegue para outra página ou ajuste os filtros'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && filteredUsers.length > 0 && (
        <DataTablePagination {...pagination} />
      )}

      <CreateUserModal 
        open={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
      
      <GroupManager
        open={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        users={users}
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
          <ResendCredentialsModal 
            open={resendModalOpen} 
            onClose={() => setResendModalOpen(false)}
            user={selectedUser}
          />
        </>
      )}
    </div>
  );
}