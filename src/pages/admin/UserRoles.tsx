import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Search, UserPlus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { RoleManagementModal } from '@/components/admin/RoleManagementModal';

interface UserWithRoles {
  id: string;
  email: string;
  name: string;
  active: boolean;
  roles: string[];
}

export default function UserRoles() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Buscar todos os usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, active')
        .order('name');

      if (profilesError) throw profilesError;

      // Buscar roles de cada usuário
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            ...profile,
            roles: userRoles?.map((r) => r.role) || [],
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();

    // Realtime para atualizações de roles
    const channel = supabase
      .channel('user_roles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
        },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'destructive';
      case 'admin_cliente':
        return 'default';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      admin_cliente: 'Admin Cliente',
      manager: 'Gerente',
      collaborator: 'Colaborador',
      supplier: 'Fornecedor',
      support: 'Suporte',
    };
    return labels[role] || role;
  };

  const handleEditRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUser(null);
    loadUsers();
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Acesso Negado</p>
          <p className="text-sm">Apenas Super Admins podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestão de Roles de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as permissões e funções dos usuários do sistema
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Total de Usuários</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.roles.includes('admin') || u.roles.includes('super_admin')).length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Gerentes</p>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.roles.includes('manager')).length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Sem Roles</p>
          <p className="text-2xl font-bold text-destructive">
            {users.filter((u) => u.roles.length === 0).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Sem role
                        </Badge>
                      ) : (
                        u.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)}>
                            {getRoleLabel(role)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'secondary'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRoles(u)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Gerenciar Roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      {selectedUser && (
        <RoleManagementModal
          open={modalOpen}
          onClose={handleModalClose}
          user={selectedUser}
        />
      )}
    </div>
  );
}
