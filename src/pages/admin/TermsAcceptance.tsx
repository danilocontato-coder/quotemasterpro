import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTermsAcceptance, TermsAcceptanceData } from '@/hooks/useTermsAcceptance';
import { TermsAcceptanceHistoryModal } from '@/components/admin/TermsAcceptanceHistoryModal';
import { RevokeAcceptanceDialog } from '@/components/admin/RevokeAcceptanceDialog';
import {
  Users,
  CheckCircle,
  Clock,
  ShieldCheck,
  Search,
  MoreVertical,
  History,
  XCircle,
  Download,
  Loader2,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function TermsAcceptance() {
  const {
    users,
    stats,
    loading,
    fetchUserHistory,
    toggleBypass,
    revokeAcceptance,
    exportToCSV,
  } = useTermsAcceptance();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: '', userName: '' });
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: '', userName: '' });

  // Filtrar usuários
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'accepted' && user.terms_accepted) ||
      (statusFilter === 'pending' && !user.terms_accepted && !user.bypass_terms) ||
      (statusFilter === 'bypass' && user.bypass_terms);

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (user: TermsAcceptanceData) => {
    if (user.bypass_terms) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Bypass Ativo
        </Badge>
      );
    }
    if (user.terms_accepted) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aceito
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: string }> = {
      admin: { label: 'Admin', variant: 'destructive' },
      manager: { label: 'Gestor', variant: 'default' },
      collaborator: { label: 'Colaborador', variant: 'secondary' },
      supplier: { label: 'Fornecedor', variant: 'outline' },
    };
    const config = roleMap[role] || { label: role, variant: 'secondary' };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Controle de Aceite de Termos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os aceites de termos de uso de todos os usuários da plataforma
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.acceptedCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.acceptanceRate.toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bypass Ativo</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.bypassCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>
            Encontre usuários específicos ou filtre por status e papel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="accepted">Aceito</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="bypass">Bypass Ativo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Papéis</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="collaborator">Colaborador</SelectItem>
                <SelectItem value="supplier">Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => exportToCSV()} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar Relatório Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum usuário encontrado com os filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Aceite</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Bypass</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell>
                        {user.terms_accepted_at
                          ? format(new Date(user.terms_accepted_at), 'dd/MM/yyyy HH:mm', {
                              locale: ptBR,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {user.accepted_version ? (
                          <Badge variant="outline">{user.accepted_version}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.bypass_terms}
                          onCheckedChange={(checked) => toggleBypass(user.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setHistoryModal({
                                  open: true,
                                  userId: user.id,
                                  userName: user.name,
                                })
                              }
                            >
                              <History className="h-4 w-4 mr-2" />
                              Ver Histórico
                            </DropdownMenuItem>
                            {user.terms_accepted && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setRevokeDialog({
                                    open: true,
                                    userId: user.id,
                                    userName: user.name,
                                  })
                                }
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Revogar Aceite
                              </DropdownMenuItem>
                            )}
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

      {/* Modais */}
      <TermsAcceptanceHistoryModal
        open={historyModal.open}
        onOpenChange={(open) => setHistoryModal({ ...historyModal, open })}
        userId={historyModal.userId}
        userName={historyModal.userName}
        fetchHistory={fetchUserHistory}
      />

      <RevokeAcceptanceDialog
        open={revokeDialog.open}
        onOpenChange={(open) => setRevokeDialog({ ...revokeDialog, open })}
        userName={revokeDialog.userName}
        onConfirm={() => revokeAcceptance(revokeDialog.userId)}
      />
    </div>
  );
}
