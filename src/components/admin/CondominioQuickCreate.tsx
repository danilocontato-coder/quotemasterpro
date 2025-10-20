import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CondominioApprovalService } from '@/services/condominioApprovalService';
import { CredentialsModal } from '@/components/admin/CredentialsModal';
import { useAuth } from '@/contexts/AuthContext';

interface CondominioQuickCreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administradoraId: string;
  administradoraBrandingId?: string;
  administradoraPlanId?: string;
  onSuccess?: () => void;
}

export function CondominioQuickCreate({
  open,
  onOpenChange,
  administradoraId,
  administradoraBrandingId,
  administradoraPlanId,
  onSuccess
}: CondominioQuickCreateProps) {
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: ''
  });
  const [copyApprovalLevels, setCopyApprovalLevels] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [userCredentials, setUserCredentials] = useState<{
    email: string;
    temporaryPassword: string;
    condominioName: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cnpj || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, CNPJ e e-mail do condomínio",
        variant: "destructive"
      });
      return;
    }

    console.log('🏗️ CondominioQuickCreate: Criando condomínio vinculado');
    setIsLoading(true);

    try {
      // Criar condomínio vinculado
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          cnpj: formData.cnpj,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address || null,
          client_type: 'condominio_vinculado',
          parent_client_id: administradoraId,
          branding_settings_id: administradoraBrandingId || null,
          subscription_plan_id: administradoraPlanId || 'plan-basic',
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ CondominioQuickCreate: Erro ao criar condomínio:', error);
        throw error;
      }

      console.log('✅ CondominioQuickCreate: Condomínio criado com sucesso:', data.id);
      console.log('🔗 CondominioQuickCreate: Vinculado à administradora:', administradoraId);
      
      if (administradoraBrandingId) {
        console.log('🎨 CondominioQuickCreate: Branding herdado:', administradoraBrandingId);
      }

      // Buscar nome da administradora para o email
      const { data: adminClient } = await supabase
        .from('clients')
        .select('name')
        .eq('id', administradoraId)
        .single();

      const administradoraName = adminClient?.name || 'Administradora';

      // Criar usuário e credenciais
      console.log('👤 CondominioQuickCreate: Criando usuário para o condomínio...');
      const { data: userResult, error: userError } = await supabase.functions.invoke(
        'create-condominio-user',
        {
          body: {
            condominioId: data.id,
            condominioName: formData.name,
            condominioEmail: formData.email,
            administradoraName
          }
        }
      );

      if (userError || !userResult?.success) {
        console.error('❌ CondominioQuickCreate: Erro ao criar usuário:', userError);
        throw new Error(userError?.message || 'Erro ao criar usuário');
      }

      console.log('✅ CondominioQuickCreate: Usuário criado:', userResult.userId);

      // Criar níveis de aprovação
      console.log('🎯 CondominioQuickCreate: Criando níveis de aprovação...');
      if (copyApprovalLevels) {
        await CondominioApprovalService.copyApprovalLevelsFromAdministradora(
          data.id,
          administradoraId
        );
        console.log('📋 CondominioQuickCreate: Níveis copiados da administradora');
      } else {
        await CondominioApprovalService.createDefaultApprovalLevels(data.id);
        console.log('🎯 CondominioQuickCreate: Níveis padrão criados');
      }

      toast({
        title: "Condomínio criado com sucesso!",
        description: `${formData.name} foi vinculado e o usuário foi criado.`
      });

      // Exibir modal com credenciais
      setUserCredentials({
        email: userResult.email,
        temporaryPassword: userResult.temporaryPassword,
        condominioName: formData.name
      });
      setShowCredentialsModal(true);

      // Resetar formulário
      setFormData({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: ''
      });
      setCopyApprovalLevels(true);

      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('❌ CondominioQuickCreate: Erro:', error);
      toast({
        title: "Erro ao criar condomínio",
        description: error.message || "Não foi possível criar o condomínio. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Criar Condomínio Vinculado
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Condomínio *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: Condomínio Jardim das Flores"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contato@condominio.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Endereço completo do condomínio"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="copy-approval-levels"
                checked={copyApprovalLevels}
                onCheckedChange={(checked) => setCopyApprovalLevels(checked as boolean)}
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="copy-approval-levels" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Usar mesmos níveis de aprovação da administradora
                </Label>
                <p className="text-xs text-muted-foreground">
                  O condomínio herdará os valores de threshold da administradora
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-900 mb-1">Configurações Automáticas:</p>
            <ul className="text-blue-700 space-y-1 text-xs">
              <li>✓ Usuário e senha criados automaticamente</li>
              <li>✓ Vinculado a esta administradora</li>
              <li>✓ Herda branding personalizado</li>
              <li>✓ Mesmo plano de assinatura</li>
              <li>✓ Aprovação de cotações habilitada</li>
              <li>✓ E-mail de boas-vindas enviado</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              Criar Condomínio
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Modal de Credenciais */}
      {userCredentials && (
        <CredentialsModal
          open={showCredentialsModal}
          onOpenChange={setShowCredentialsModal}
          condominioName={userCredentials.condominioName}
          email={userCredentials.email}
          temporaryPassword={userCredentials.temporaryPassword}
        />
      )}
    </Dialog>
  );
}
