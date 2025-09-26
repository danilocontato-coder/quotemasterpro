import React from 'react';
import { AlertTriangle, ExternalLink, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InactiveSupplierModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  supplierData: {
    supplier_name: string;
    supplier_cnpj: string;
    supplier_email: string;
    supplier_status: string;
  } | null;
  onRequestReactivation?: () => void;
  onContactSupport?: () => void;
}

const getStatusConfig = (status: string) => {
  const configs = {
    pending: {
      label: 'Pendente',
      variant: 'secondary' as const,
      description: 'O fornecedor ainda não foi aprovado pela administração.',
      canRequest: true
    },
    suspended: {
      label: 'Suspenso',
      variant: 'destructive' as const,
      description: 'O fornecedor foi temporariamente suspenso por questões administrativas.',
      canRequest: true
    },
    inactive: {
      label: 'Inativo',
      variant: 'outline' as const,
      description: 'O fornecedor optou por desativar sua conta na plataforma.',
      canRequest: true
    },
    blocked: {
      label: 'Bloqueado',
      variant: 'destructive' as const,
      description: 'O fornecedor foi bloqueado por violação dos termos de uso.',
      canRequest: false
    },
    rejected: {
      label: 'Rejeitado',
      variant: 'destructive' as const,
      description: 'O cadastro do fornecedor foi rejeitado pela administração.',
      canRequest: false
    }
  };
  
  return configs[status as keyof typeof configs] || configs.inactive;
};

export function InactiveSupplierModal({ 
  isOpen, 
  onOpenChange, 
  supplierData,
  onRequestReactivation,
  onContactSupport 
}: InactiveSupplierModalProps) {
  if (!supplierData) return null;

  const statusConfig = getStatusConfig(supplierData.supplier_status);

  const handleRequestReactivation = () => {
    // Criar ticket de suporte solicitando reativação
    onRequestReactivation?.();
  };

  const handleContactSupport = () => {
    // Abrir canal de suporte
    onContactSupport?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Fornecedor Inativo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este fornecedor não pode ser associado pois está atualmente inativo no sistema.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div>
              <p className="font-medium text-sm">Fornecedor:</p>
              <p className="text-sm text-muted-foreground">{supplierData.supplier_name}</p>
            </div>
            
            <div>
              <p className="font-medium text-sm">CNPJ:</p>
              <p className="text-sm text-muted-foreground">{supplierData.supplier_cnpj}</p>
            </div>
            
            <div>
              <p className="font-medium text-sm">Status:</p>
              <Badge variant={statusConfig.variant} className="mt-1">
                {statusConfig.label}
              </Badge>
            </div>
            
            <div>
              <p className="font-medium text-sm">Motivo:</p>
              <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">O que você pode fazer:</h4>
            
            {statusConfig.canRequest ? (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRequestReactivation}
                  className="w-full justify-start"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Solicitar reativação via suporte
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleContactSupport}
                  className="w-full justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Entrar em contato direto
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Infelizmente este fornecedor não pode ser reativado. Para mais informações, entre em contato com o suporte.
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Entendi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}