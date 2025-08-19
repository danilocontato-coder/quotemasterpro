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
  Users,
  DollarSign,
  CheckCircle,
  Settings
} from "lucide-react";
import { CreateApprovalLevelModal } from "@/components/approvals/CreateApprovalLevelModal";
import { EditApprovalLevelModal } from "@/components/approvals/EditApprovalLevelModal";
import { DeleteApprovalLevelModal } from "@/components/approvals/DeleteApprovalLevelModal";
import { useApprovalLevels } from "@/hooks/useApprovalLevels";

export function ApprovalLevels() {
  const { approvalLevels, searchTerm, setSearchTerm } = useApprovalLevels();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<any>(null);

  const filteredLevels = approvalLevels.filter(level =>
    level.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    level.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleEdit = (level: any) => {
    setSelectedLevel(level);
    setEditModalOpen(true);
  };

  const handleDelete = (level: any) => {
    setSelectedLevel(level);
    setDeleteModalOpen(true);
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
              <Settings className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{approvalLevels.length}</p>
                <p className="text-sm text-muted-foreground">Níveis Configurados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {approvalLevels.filter(l => l.active).length}
                </p>
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
                <p className="text-2xl font-bold">
                  {approvalLevels.reduce((total, level) => total + level.approvers.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Aprovadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-warning" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {formatCurrency(Math.max(...approvalLevels.map(l => l.maxValue)))}
                </p>
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
                placeholder="Buscar por nome ou descrição..."
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
                  <TableHead>Faixa de Valores</TableHead>
                  <TableHead>Aprovadores</TableHead>
                  <TableHead>Tipo de Aprovação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLevels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{level.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {level.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Min: {formatCurrency(level.minValue)}</div>
                        <div>Max: {formatCurrency(level.maxValue)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {level.approvers.slice(0, 3).map((approver: string) => (
                          <Badge key={approver} variant="secondary" className="text-xs">
                            {approver}
                          </Badge>
                        ))}
                        {level.approvers.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{level.approvers.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={level.approvalType === "all" ? "default" : "secondary"}
                      >
                        {level.approvalType === "all" ? "Todos" : 
                         level.approvalType === "any" ? "Qualquer um" : 
                         `${level.requiredApprovals} de ${level.approvers.length}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={level.active ? "default" : "secondary"}
                        className={level.active ? "bg-success" : "bg-muted"}
                      >
                        {level.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(level)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(level)}
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