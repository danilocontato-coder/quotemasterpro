import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Layers, 
  Plus, 
  Pencil, 
  Trash2, 
  Copy, 
  Users, 
  DollarSign,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useCondominioApprovalLevels, ApprovalLevel } from '@/hooks/useCondominioApprovalLevels';
import { formatCurrency } from '@/lib/utils';

interface CondominioNiveisAprovacaoTabProps {
  condominioId: string;
  administradoraId?: string | null;
}

export const CondominioNiveisAprovacaoTab: React.FC<CondominioNiveisAprovacaoTabProps> = ({
  condominioId,
  administradoraId
}) => {
  const {
    approvalLevels,
    condominioUsers,
    isLoading,
    isLoadingUsers,
    createApprovalLevel,
    updateApprovalLevel,
    deleteApprovalLevel,
    copyDefaultLevels,
    getUserNameById,
  } = useCondominioApprovalLevels({ condominioId });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ApprovalLevel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount_threshold: 0,
    max_amount_threshold: null as number | null,
    approvers: [] as string[],
    order_level: 1,
    active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      amount_threshold: 0,
      max_amount_threshold: null,
      approvers: [],
      order_level: approvalLevels.length + 1,
      active: true
    });
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await createApprovalLevel(formData);
      setShowCreateDialog(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedLevel) return;
    
    setIsSaving(true);
    try {
      await updateApprovalLevel(selectedLevel.id, formData);
      setShowEditDialog(false);
      setSelectedLevel(null);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLevel) return;
    
    setIsSaving(true);
    try {
      await deleteApprovalLevel(selectedLevel.id);
      setShowDeleteDialog(false);
      setSelectedLevel(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyFromAdmin = async () => {
    if (!administradoraId) return;
    
    setIsCopying(true);
    try {
      await copyDefaultLevels(administradoraId);
    } finally {
      setIsCopying(false);
    }
  };

  const openEditDialog = (level: ApprovalLevel) => {
    setSelectedLevel(level);
    setFormData({
      name: level.name,
      amount_threshold: level.amount_threshold,
      max_amount_threshold: level.max_amount_threshold,
      approvers: level.approvers || [],
      order_level: level.order_level,
      active: level.active
    });
    setShowEditDialog(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const toggleApprover = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      approvers: prev.approvers.includes(userId)
        ? prev.approvers.filter(id => id !== userId)
        : [...prev.approvers, userId]
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Níveis de Aprovação
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure os níveis de aprovação para este condomínio
          </p>
        </div>
        <div className="flex gap-2">
          {administradoraId && approvalLevels.length === 0 && (
            <Button 
              variant="outline" 
              onClick={handleCopyFromAdmin}
              disabled={isCopying}
            >
              <Copy className="h-4 w-4 mr-2" />
              {isCopying ? 'Copiando...' : 'Copiar Níveis Padrão'}
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Nível
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {approvalLevels.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum nível configurado</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Configure níveis de aprovação para definir quem pode aprovar cotações baseado no valor.
            </p>
            <div className="flex gap-2">
              {administradoraId && (
                <Button variant="outline" onClick={handleCopyFromAdmin} disabled={isCopying}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Níveis Padrão
                </Button>
              )}
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Nível
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Levels List */}
      <div className="grid gap-4">
        {approvalLevels.map((level) => (
          <Card key={level.id} className={`border-l-4 ${level.active ? 'border-l-primary' : 'border-l-muted'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{level.name}</CardTitle>
                    <Badge variant={level.active ? 'default' : 'secondary'}>
                      {level.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">Nível {level.order_level}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(level.amount_threshold)}
                    {level.max_amount_threshold && ` - ${formatCurrency(level.max_amount_threshold)}`}
                    {!level.max_amount_threshold && ' - Sem limite'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(level)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedLevel(level);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Aprovadores:</span>
                {level.approvers && level.approvers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {level.approvers.map(approverId => (
                      <Badge key={approverId} variant="secondary">
                        {getUserNameById(approverId)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Nenhum aprovador configurado
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Nível de Aprovação</DialogTitle>
            <DialogDescription>
              Defina as configurações para este nível de aprovação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Nível</Label>
              <Input
                id="name"
                placeholder="Ex: Nível Básico"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min">Valor Mínimo (R$)</Label>
                <Input
                  id="min"
                  type="number"
                  min={0}
                  value={formData.amount_threshold}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    amount_threshold: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Valor Máximo (R$)</Label>
                <Input
                  id="max"
                  type="number"
                  min={0}
                  placeholder="Sem limite"
                  value={formData.max_amount_threshold || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    max_amount_threshold: e.target.value ? parseFloat(e.target.value) : null
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Ordem do Nível</Label>
              <Input
                id="order"
                type="number"
                min={1}
                value={formData.order_level}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  order_level: parseInt(e.target.value) || 1 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Aprovadores</Label>
              {isLoadingUsers ? (
                <Skeleton className="h-20 w-full" />
              ) : condominioUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhum usuário cadastrado neste condomínio.
                </p>
              ) : (
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {condominioUsers.map(user => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        formData.approvers.includes(user.id) 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleApprover(user.id)}
                    >
                      <div>
                        <p className="font-medium text-sm">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                      {formData.approvers.includes(user.id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Nível Ativo</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving || !formData.name}>
              {isSaving ? 'Criando...' : 'Criar Nível'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Nível de Aprovação</DialogTitle>
            <DialogDescription>
              Atualize as configurações deste nível.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Nível</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-min">Valor Mínimo (R$)</Label>
                <Input
                  id="edit-min"
                  type="number"
                  min={0}
                  value={formData.amount_threshold}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    amount_threshold: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max">Valor Máximo (R$)</Label>
                <Input
                  id="edit-max"
                  type="number"
                  min={0}
                  placeholder="Sem limite"
                  value={formData.max_amount_threshold || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    max_amount_threshold: e.target.value ? parseFloat(e.target.value) : null
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-order">Ordem do Nível</Label>
              <Input
                id="edit-order"
                type="number"
                min={1}
                value={formData.order_level}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  order_level: parseInt(e.target.value) || 1 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Aprovadores</Label>
              {isLoadingUsers ? (
                <Skeleton className="h-20 w-full" />
              ) : condominioUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhum usuário cadastrado neste condomínio.
                </p>
              ) : (
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {condominioUsers.map(user => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        formData.approvers.includes(user.id) 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleApprover(user.id)}
                    >
                      <div>
                        <p className="font-medium text-sm">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                      {formData.approvers.includes(user.id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Nível Ativo</Label>
              <Switch
                id="edit-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isSaving || !formData.name}>
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Nível de Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o nível "{selectedLevel?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
