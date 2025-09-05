import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Link, AlertCircle } from 'lucide-react';
import { useAuthTenant } from '@/hooks/useAuthTenant';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenantOnboardingProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TenantOnboarding({ open, onOpenChange }: TenantOnboardingProps) {
  const { availableClients, linkToClient, isLoading } = useAuthTenant();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [customClientId, setCustomClientId] = useState<string>('');
  const [mode, setMode] = useState<'select' | 'custom'>('select');
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async () => {
    const clientId = mode === 'select' ? selectedClientId : customClientId.trim();
    
    if (!clientId) {
      return;
    }

    setIsLinking(true);
    const success = await linkToClient(clientId);
    setIsLinking(false);

    if (success && onOpenChange) {
      onOpenChange(false);
    }
  };

  const canProceed = mode === 'select' ? !!selectedClientId : !!customClientId.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Vincular Conta
          </DialogTitle>
          <DialogDescription>
            Para continuar, você precisa vincular sua conta a um cliente da plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Essa vinculação é necessária para acessar dados e funcionalidades específicas do seu cliente.
            </AlertDescription>
          </Alert>

          {availableClients.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Clientes Disponíveis</CardTitle>
                <CardDescription>
                  Selecione um cliente da lista abaixo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="client-select">Cliente</Label>
                    <Select
                      value={mode === 'select' ? selectedClientId : ''}
                      onValueChange={(value) => {
                        setSelectedClientId(value);
                        setMode('select');
                      }}
                    >
                      <SelectTrigger id="client-select">
                        <SelectValue placeholder="Selecione um cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name || client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ID do Cliente</CardTitle>
              <CardDescription>
                Ou insira o ID do cliente fornecido pelo administrador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="custom-client-id">ID do Cliente</Label>
                  <Input
                    id="custom-client-id"
                    placeholder="ex: 550e8400-e29b-41d4-a716-446655440000"
                    value={customClientId}
                    onChange={(e) => {
                      setCustomClientId(e.target.value);
                      setMode('custom');
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleLink}
              disabled={!canProceed || isLinking || isLoading}
              className="flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              {isLinking ? 'Vinculando...' : 'Vincular Conta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}