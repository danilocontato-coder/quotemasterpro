import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Building2, AlertTriangle, Network, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseSubscriptionPlans } from '@/hooks/useSupabaseSubscriptionPlans';
import { usePerformanceDebug, useMemoryDebug } from '@/hooks/usePerformanceDebug';
import { useAdministradoras } from '@/hooks/useAdministradoras';
import { ClientTypeSelect } from './ClientTypeSelect';
import { ParentClientSelect } from './ParentClientSelect';
import { BrandingSettingsForm } from './BrandingSettingsForm';

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
  clientType?: 'direct' | 'administradora' | 'condominio_vinculado';
  parentClientId?: string;
  parentClientName?: string;
  brandingSettingsId?: string;
  requiresApproval?: boolean;
  childClientsCount?: number;
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
    notes: '',
    clientType: 'direct' as 'direct' | 'administradora' | 'condominio_vinculado',
    parentClientId: '',
    brandingSettingsId: '',
    requiresApproval: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [showTypeChangeWarning, setShowTypeChangeWarning] = useState(false);
  const [originalClientType, setOriginalClientType] = useState<'direct' | 'administradora' | 'condominio_vinculado'>('direct');
  const { toast } = useToast();
  const { plans } = useSupabaseSubscriptionPlans();
  const { trackAsyncOperation } = usePerformanceDebug('EditClientModal');
  const { checkMemory } = useMemoryDebug('EditClientModal');
  const { administradoras, loading: loadingAdministradoras } = useAdministradoras();

  useEffect(() => {
    if (client) {
      console.log('🔄 EditClientModal: Carregando dados do cliente', client.id);
      const clientType = client.clientType || 'direct';
      setOriginalClientType(clientType);
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
        notes: client.notes || '',
        clientType: clientType,
        parentClientId: client.parentClientId || '',
        brandingSettingsId: client.brandingSettingsId || '',
        requiresApproval: client.requiresApproval ?? true
      });
      console.log('✅ EditClientModal: Dados carregados no formulário', { clientType, parentClientId: client.parentClientId });
    }
  }, [client]);

  // Avisar quando houver mudança de tipo que pode afetar vínculos
  useEffect(() => {
    if (!client) return;
    
    const typeChanged = formData.clientType !== originalClientType;
    const wasAdministradora = originalClientType === 'administradora';
    const hasChildClients = (client.childClientsCount || 0) > 0;
    
    if (typeChanged && wasAdministradora && hasChildClients) {
      console.log('⚠️ EditClientModal: Alerta - Administradora com condomínios vinculados alterando tipo');
      setShowTypeChangeWarning(true);
    } else {
      setShowTypeChangeWarning(false);
    }
  }, [formData.clientType, originalClientType, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-submission
    const now = Date.now();
    if (now - lastSubmitTime < 2000) {
      console.log('🚫 EditClientModal: Submissão ignorada (muito recente)');
      return;
    }
    
    if (!client || isLoading) {
      console.log('🚫 EditClientModal: Submissão cancelada', { client: !!client, isLoading });
      return;
    }

    setLastSubmitTime(now);

    await trackAsyncOperation('updateClient', async () => {
      setIsLoading(true);
      checkMemory();
      
      try {
        console.log('🚀 EditClientModal: Iniciando atualização do cliente:', client.id);
        
        // Convert "none" back to null/empty for the API
        const dataToUpdate = {
          ...formData,
          groupId: formData.groupId === 'none' ? null : formData.groupId,
          clientType: formData.clientType,
          parentClientId: formData.clientType === 'condominio_vinculado' ? formData.parentClientId : null,
          brandingSettingsId: formData.clientType === 'administradora' ? formData.brandingSettingsId : null,
          requiresApproval: formData.requiresApproval
        };
        
        console.log('📤 EditClientModal: Dados sendo enviados:', dataToUpdate);
        
        await onUpdateClient(client.id, dataToUpdate);
        
        console.log('✅ EditClientModal: Cliente atualizado com sucesso, fechando modal...');
        
        // Close modal after a small delay to prevent conflicts
        setTimeout(() => {
          onOpenChange(false);
        }, 100);
        
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

          {/* Hierarquia e Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4" />
                Hierarquia e Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aviso de mudança de tipo */}
              {showTypeChangeWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atenção:</strong> Esta administradora possui {client?.childClientsCount} condomínio(s) vinculado(s). 
                    Alterar o tipo pode afetar esses vínculos. Confirme se deseja continuar.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Cliente */}
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <ClientTypeSelect
                    value={formData.clientType}
                    onChange={(value) => {
                      console.log('🔄 EditClientModal: Tipo de cliente alterado para:', value);
                      handleChange('clientType', value);
                    }}
                  />
                  {formData.clientType === 'administradora' && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Network className="h-3 w-3" />
                      Pode gerenciar múltiplos condomínios vinculados
                    </p>
                  )}
                  {formData.clientType === 'condominio_vinculado' && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      Vinculado a uma administradora
                    </p>
                  )}
                </div>

                {/* Administradora Pai (apenas para condomínios vinculados) */}
                {formData.clientType === 'condominio_vinculado' && (
                  <div className="space-y-2">
                    <Label>Administradora Responsável *</Label>
                    <ParentClientSelect
                      value={formData.parentClientId}
                      onChange={(value) => {
                        console.log('🔄 EditClientModal: Administradora pai selecionada:', value);
                        handleChange('parentClientId', value);
                      }}
                      administradoras={administradoras}
                      disabled={loadingAdministradoras}
                    />
                    {client?.parentClientName && (
                      <p className="text-xs text-muted-foreground">
                        Atual: {client.parentClientName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Branding personalizado (apenas para administradoras) */}
              {formData.clientType === 'administradora' && (
                <Accordion type="single" collapsible className="border rounded-lg">
                  <AccordionItem value="branding" className="border-0">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">Configurações de Branding</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <BrandingSettingsForm
                        onSave={(settingsId) => {
                          console.log('✅ EditClientModal: Branding salvo com ID:', settingsId);
                          handleChange('brandingSettingsId', settingsId);
                          toast({
                            title: "Branding configurado",
                            description: "As configurações de marca foram salvas com sucesso."
                          });
                        }}
                        clientId={client?.id}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Requer Aprovação */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="requiresApproval">Requer Aprovação</Label>
                  <p className="text-sm text-muted-foreground">
                    Cotações devem ser aprovadas antes de serem enviadas aos fornecedores
                  </p>
                </div>
                <Switch
                  id="requiresApproval"
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) => {
                    console.log('🔄 EditClientModal: Requer aprovação alterado para:', checked);
                    handleChange('requiresApproval', checked.toString());
                  }}
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