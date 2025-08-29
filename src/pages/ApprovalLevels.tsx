import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Users,
  DollarSign,
  CheckCircle,
  Layers
} from "lucide-react";
import { CreateApprovalLevelModal } from "@/components/approvals/CreateApprovalLevelModal";
import { EditApprovalLevelModal } from "@/components/approvals/EditApprovalLevelModal";
import { DeleteApprovalLevelModal } from "@/components/approvals/DeleteApprovalLevelModal";
import { useSupabaseApprovalLevels, type ApprovalLevel } from "@/hooks/useSupabaseApprovalLevels";

export function ApprovalLevels() {
  const { 
    approvalLevels, 
    searchTerm, 
    setSearchTerm, 
    isLoading,
    updateApprovalLevel,
    deleteApprovalLevel 
  } = useSupabaseApprovalLevels();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ApprovalLevel | null>(null);
  
  const filteredLevels = approvalLevels || [];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleEdit = (level: ApprovalLevel) => {
    setSelectedLevel(level);
    setEditModalOpen(true);
  };

  const handleDelete = (level: ApprovalLevel) => {
    setSelectedLevel(level);
    setDeleteModalOpen(true);
  };

  const stats = {
    total: filteredLevels.length,
    active: filteredLevels.filter(l => l.active).length,
    approvers: [...new Set(filteredLevels.flatMap(l => l.approvers))].length,
    maxThreshold: Math.max(...filteredLevels.map(l => l.amount_threshold), 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Níveis de Aprovação</h1>
          <p className="text-muted-foreground">
            Configure os níveis de aprovação para diferentes valores de compra
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Nível
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Layers className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Níveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Níveis Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-info" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.approvers}</p>
                <p className="text-sm text-muted-foreground">Total de Aprovadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-warning" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{formatCurrency(stats.maxThreshold)}</p>
                <p className="text-sm text-muted-foreground">Maior Limite</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Níveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
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
                  <TableHead>Nível</TableHead>
                  <TableHead>Limite de Valor</TableHead>
                  <TableHead>Aprovadores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLevels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Layers className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhum nível de aprovação encontrado</p>
                        <Button onClick={() => setCreateModalOpen(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeiro nível
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{level.name}</div>
                          <div className="text-sm text-muted-foreground">Ordem: {level.order_level}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">A partir de {formatCurrency(level.amount_threshold)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {level.approvers.slice(0, 2).map((approver, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {approver}
                            </Badge>
                          ))}
                          {level.approvers.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{level.approvers.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={level.active ? "default" : "secondary"}>
                          {level.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(level.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(level)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(level)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateApprovalLevelModal 
        open={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
      
      {selectedLevel && (
        <>
          <EditApprovalLevelModal 
            open={editModalOpen} 
            onClose={() => setEditModalOpen(false)}
            level={selectedLevel}
          />
          <DeleteApprovalLevelModal 
            open={deleteModalOpen} 
            onClose={() => setDeleteModalOpen(false)}
            level={selectedLevel}
          />
        </>
      )}
    </div>
  );
}