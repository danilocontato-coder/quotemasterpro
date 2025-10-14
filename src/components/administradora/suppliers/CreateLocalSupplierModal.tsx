import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Check, MessageSquare, Info } from 'lucide-react';
import { SupplierFormFields } from './SupplierFormFields';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CreateLocalSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSupplier: (data: any, password: string) => Promise<any>;
}

export const CreateLocalSupplierModal: React.FC<CreateLocalSupplierModalProps> = ({
  open,
  onOpenChange,
  onCreateSupplier,
}) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: {},
    specialties: [],
    region: '',
    state: '',
    city: '',
    status: 'active',
    type: 'local', // ✅ Required by RLS policy
  });
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.cnpj?.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (formData.cnpj.replace(/\D/g, '').length !== 14) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password?.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 8) {
      newErrors.password = 'Senha deve ter no mínimo 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!formData.whatsapp?.trim()) {
      toast.error('WhatsApp é obrigatório para cadastro de fornecedor');
      return;
    }

    if (!validateForm()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onCreateSupplier(formData, password);
      
    if (result?.success) {
      // Sempre exibir credenciais, mesmo se a Edge Function falhar
      const displayCredentials = result.credentials || {
        email: formData.email,
        password: password,
        supplier_id: result.supplierId || ''
      };
      
      setCredentials(displayCredentials);
      
      // Se não tem credentials da Edge Function, avisar que foi criado mas sem acesso automático
      if (!result.credentials) {
        toast.warning(
          'Fornecedor criado! O acesso não foi configurado automaticamente. Use as credenciais abaixo para enviar manualmente.',
          { duration: 6000 }
        );
      }
    }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      address: {},
      specialties: [],
      region: '',
      state: '',
      city: '',
      status: 'active',
      type: 'local', // ✅ Required by RLS policy
    });
    setPassword('');
    setErrors({});
    setCredentials(null);
    setCopied(false);
    onOpenChange(false);
  };

  const copyCredentials = () => {
    const text = `Email: ${credentials.email}\nSenha: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credenciais copiadas!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {credentials ? 'Fornecedor Criado com Sucesso!' : 'Novo Fornecedor Local'}
          </DialogTitle>
          <DialogDescription>
            {credentials 
              ? 'Copie as credenciais de acesso abaixo para enviar ao fornecedor.'
              : 'Preencha os dados do fornecedor. Campos com * são obrigatórios.'
            }
          </DialogDescription>
        </DialogHeader>

        {credentials ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email de Acesso</Label>
                <p className="font-mono text-sm">{credentials.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Senha Temporária</Label>
                <p className="font-mono text-sm">{credentials.password}</p>
              </div>
            </div>

            <Button onClick={copyCredentials} className="w-full">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Credenciais
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Envie estas credenciais ao fornecedor por email ou WhatsApp.
              O fornecedor deverá alterar a senha no primeiro acesso.
            </p>
          </div>
        ) : (
          <>
            <SupplierFormFields
              formData={formData}
              onChange={(field, value) => setFormData({ ...formData, [field]: value })}
              errors={errors}
            />

            {formData.whatsapp && (
              <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  Uma mensagem de boas-vindas com instruções de acesso será enviada 
                  automaticamente para o WhatsApp: <strong>{formData.whatsapp}</strong>
                </AlertDescription>
              </Alert>
            )}

            {!formData.whatsapp && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  O WhatsApp é obrigatório para envio automático das credenciais de acesso ao fornecedor.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha de Acesso *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite ou gere uma senha"
                  className={errors.password ? 'border-red-500' : ''}
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Gerar
                </Button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Senha temporária para o primeiro acesso do fornecedor
              </p>
            </div>
          </>
        )}

        <DialogFooter>
          {credentials ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Fornecedor'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
