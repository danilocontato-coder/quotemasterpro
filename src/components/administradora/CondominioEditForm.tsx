import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const condominioSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido (formato: 00.000.000/0000-00)'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type CondominioFormData = z.infer<typeof condominioSchema>;

interface CondominioEditFormProps {
  condominioId: string;
  initialData: CondominioFormData;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CondominioEditForm({
  condominioId,
  initialData,
  onSuccess,
  onCancel,
}: CondominioEditFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CondominioFormData>({
    resolver: zodResolver(condominioSchema),
    defaultValues: initialData,
  });

  const status = watch('status');

  const onSubmit = async (data: CondominioFormData) => {
    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('clients')
        .update({
          name: data.name,
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone || null,
          address: data.address || null,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', condominioId);

      if (error) throw error;

      toast({
        title: 'Condomínio atualizado',
        description: 'As informações foram salvas com sucesso.',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating condominio:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Condomínio</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Ex: Edifício Residencial Central"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          {...register('cnpj')}
          placeholder="00.000.000/0000-00"
        />
        {errors.cnpj && (
          <p className="text-sm text-destructive">{errors.cnpj.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="contato@condominio.com.br"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="(11) 1234-5678"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Endereço Completo</Label>
        <Textarea
          id="address"
          {...register('address')}
          placeholder="Rua, Número, Bairro, Cidade - Estado, CEP"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="status">Status do Condomínio</Label>
          <p className="text-sm text-muted-foreground">
            {status === 'active' ? 'Ativo e operacional' : 'Inativo (não receberá cotações)'}
          </p>
        </div>
        <Switch
          id="status"
          checked={status === 'active'}
          onCheckedChange={(checked) =>
            setValue('status', checked ? 'active' : 'inactive')
          }
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}
