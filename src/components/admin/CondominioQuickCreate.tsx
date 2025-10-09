import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

      toast({
        title: "Condomínio criado!",
        description: `${formData.name} foi vinculado com sucesso.`
      });

      // Resetar formulário
      setFormData({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: ''
      });

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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-900 mb-1">Configurações Automáticas:</p>
            <ul className="text-blue-700 space-y-1 text-xs">
              <li>✓ Vinculado a esta administradora</li>
              <li>✓ Herda branding personalizado</li>
              <li>✓ Mesmo plano de assinatura</li>
              <li>✓ Aprovação de cotações habilitada</li>
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
    </Dialog>
  );
}
