import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { usePerformanceDebug, useMemoryDebug } from '@/hooks/usePerformanceDebug';

interface Client {
  id: string;
  name: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  plan: string;
  groupName?: string;
  groupId?: string;
  notes?: string;
}

interface ClientGroup {
  id: string;
  name: string;
  color?: string;
}

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  clientGroups: ClientGroup[];
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<void>;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  open,
  onOpenChange,
  client,
  clientGroups,
  onUpdateClient
}) => {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    plan: 'basic',
    groupId: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { plans } = useSupabaseSubscriptionPlans();
  const { trackAsyncOperation } = usePerformanceDebug('EditClientModal');
  const { checkMemory } = useMemoryDebug('EditClientModal');

  useEffect(() => {
    if (client) {
      console.log('🔄 EditClientModal: Carregando dados do cliente', client.id);
      setFormData({
        name: client.name || '',
        companyName: client.companyName || '',
        cnpj: client.cnpj || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        status: client.status || 'active',
        plan: client.plan || 'basic',
        groupId: client.groupId || 'none',
        notes: client.notes || ''
      });
      console.log('✅ EditClientModal: Dados carregados no formulário');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || isLoading) {
      console.log('🚫 EditClientModal: Submissão cancelada', { client: !!client, isLoading });
      return;
    }

    await trackAsyncOperation('updateClient', async () => {
      setIsLoading(true);
      checkMemory();
      
      try {
        console.log('🚀 EditClientModal: Iniciando atualização do cliente:', client.id);
        
        // Convert "none" back to null/empty for the API
        const dataToUpdate = {
          ...formData,
          groupId: formData.groupId === 'none' ? null : formData.groupId
        };
        
        console.log('📤 EditClientModal: Dados sendo enviados:', dataToUpdate);
        
        await onUpdateClient(client.id, dataToUpdate);
        
        console.log('✅ EditClientModal: Cliente atualizado com sucesso, fechando modal...');
        onOpenChange(false);
        
      } catch (error) {
        console.error('❌ EditClientModal: Erro ao atualizar cliente:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o cliente. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        checkMemory();
      }
    });
  };

  const handleChange = (field: string, value: string) => {
    console.log(`🔄 EditClientModal: Campo alterado - ${field}:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!client) return null;

  console.log('🔄 EditClientModal: Renderizando para cliente', client.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Editar Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Nome da empresa"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Endereço completo"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Ativo
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Inativo
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Pendente
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plano</Label>
                  <Select value={formData.plan} onValueChange={(value) => handleChange('plan', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans
                        .filter(plan => plan.target_audience === 'clients' || plan.target_audience === 'both')
                        .filter(plan => plan.status === 'active')
                        .map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.display_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupId">Grupo</Label>
                  <Select value={formData.groupId} onValueChange={(value) => handleChange('groupId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem grupo</SelectItem>
                      {clientGroups.filter(group => group.id && group.id.trim() !== '').map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-${group.color || 'blue'}-500`}></div>
                            {group.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Observações internas sobre o cliente"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};