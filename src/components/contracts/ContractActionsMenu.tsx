import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  RefreshCw,
  FileText,
  DollarSign,
  PauseCircle,
  PlayCircle,
  XCircle,
  Copy,
  Download,
  Edit,
  Trash2,
} from 'lucide-react';

interface ContractActionsMenuProps {
  contractStatus: string;
  onRenew: () => void;
  onAddendum: () => void;
  onAdjust: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onTerminate: () => void;
  onDuplicate: () => void;
  onExportPDF: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ContractActionsMenu = ({
  contractStatus,
  onRenew,
  onAddendum,
  onAdjust,
  onSuspend,
  onReactivate,
  onTerminate,
  onDuplicate,
  onExportPDF,
  onEdit,
  onDelete,
}: ContractActionsMenuProps) => {
  const canSuspend = contractStatus === 'ativo';
  const canReactivate = contractStatus === 'suspenso';
  const canTerminate = ['ativo', 'suspenso', 'renovacao_pendente'].includes(contractStatus);
  const canRenew = ['ativo', 'renovacao_pendente'].includes(contractStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canRenew && (
          <DropdownMenuItem onClick={onRenew}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Renovar Contrato
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onAddendum}>
          <FileText className="mr-2 h-4 w-4" />
          Criar Aditivo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAdjust}>
          <DollarSign className="mr-2 h-4 w-4" />
          Reajustar Valor
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {canSuspend && (
          <DropdownMenuItem onClick={onSuspend}>
            <PauseCircle className="mr-2 h-4 w-4" />
            Suspender
          </DropdownMenuItem>
        )}
        {canReactivate && (
          <DropdownMenuItem onClick={onReactivate}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Reativar
          </DropdownMenuItem>
        )}
        {canTerminate && (
          <DropdownMenuItem onClick={onTerminate} className="text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            Encerrar Contrato
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF}>
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
