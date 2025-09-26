import React, { useState } from 'react';
import { AlertCircle, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupplierAssociation } from '@/hooks/useSupplierAssociation';

interface SupplierInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: {
    id: string;
    name: string;
    cnpj: string;
    email: string;
    certification_status: string;
  };
  onInviteSent?: () => void;
}

export function SupplierInviteModal({ 
  isOpen, 
  onClose, 
  supplier,
  onInviteSent 
}: SupplierInviteModalProps) {
  const [message, setMessage] = useState('');
  const { inviteSupplierCertification, isLoading } = useSupplierAssociation();

  const handleInvite = async () => {
    try {
      const success = await inviteSupplierCertification(supplier.id, message);
      if (success) {
        onInviteSent?.();
        onClose();
        setMessage('');
      }
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
    }
  };

  const handleAssociateOnly = async () => {
    try {
      // Implementar associação direta sem convite
      onClose();
    } catch (error) {
      console.error('Erro ao associar fornecedor:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Fornecedor Não Certificado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="text-orange-800">{supplier.name}</span>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  {supplier.certification_status === 'pending' ? 'Não Certificado' : supplier.certification_status}
                </Badge>
              </CardTitle>
              <div className="text-sm space-y-1 text-orange-700">
                <p><strong>CNPJ:</strong> {supplier.cnpj}</p>
                <p><strong>Email:</strong> {supplier.email}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 mb-2">
                      Este fornecedor já está cadastrado no sistema, mas ainda não é certificado.
                    </p>
                    <p className="text-orange-700">
                      Fornecedores certificados têm acesso prioritário às cotações, 
                      podem responder diretamente pelo sistema e oferecem maior segurança 
                      nas transações.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Mensagem personalizada (opcional)
              </label>
              <Textarea
                placeholder="Escreva uma mensagem personalizada para convidar este fornecedor a se certificar na plataforma..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Uma mensagem padrão será enviada se você não escrever nada.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleInvite}
                disabled={isLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Convidar para Certificação
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAssociateOnly}
                disabled={isLoading}
                className="flex-1"
              >
                Associar Sem Convite
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              <p>
                <strong>Benefícios da certificação:</strong> Resposta mais rápida, 
                maior confiabilidade, prioridade nas cotações e acesso ao sistema completo.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}