import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CondominioVinculado } from '@/hooks/useCondominiosVinculados';
import { Edit, Eye, Users, FileText, MoreVertical, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CondominiosListProps {
  condominios: CondominioVinculado[];
  isLoading?: boolean;
  onEdit?: (condominio: CondominioVinculado) => void;
  onView?: (condominio: CondominioVinculado) => void;
}

export function CondominiosList({
  condominios,
  isLoading = false,
  onEdit,
  onView
}: CondominiosListProps) {
  
  console.log('📋 CondominiosList: Renderizando lista com', condominios.length, 'condomínios');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      inactive: { variant: 'secondary', label: 'Inativo' },
      pending: { variant: 'secondary', label: 'Pendente' }
    };

    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatLastActivity = (date?: string) => {
    if (!date) return 'Sem atividade';
    
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Condomínios Vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (condominios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Condomínios Vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum condomínio vinculado ainda.</p>
            <p className="text-sm mt-1">Crie seu primeiro condomínio para começar!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Condomínios Vinculados ({condominios.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Cotações</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead>Última Atividade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominios.map((condominio) => (
                <TableRow key={condominio.id}>
                  <TableCell className="font-medium">
                    {condominio.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {condominio.cnpj}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(condominio.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{condominio.cotacoesCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{condominio.usuariosCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastActivity(condominio.lastActivity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView?.(condominio)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(condominio)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
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
  );
}
