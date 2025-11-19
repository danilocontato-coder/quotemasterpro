import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditBankDataModalProps {
  open: boolean;
  onClose: () => void;
  supplier: {
    id: string;
    name: string;
    document_number: string;
    bank_data?: any;
  };
  onSuccess?: () => void;
}

const BRAZILIAN_BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
  { code: '260', name: 'Nu Pagamentos (Nubank)' },
  { code: '077', name: 'Banco Inter' },
  { code: '212', name: 'Banco Original' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '336', name: 'Banco C6' },
  { code: '290', name: 'PagSeguro' },
  { code: '323', name: 'Mercado Pago' },
];

export function EditBankDataModal({ open, onClose, supplier, onSuccess }: EditBankDataModalProps) {
  const existingBankData = supplier.bank_data || {};
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    bank_code: existingBankData.bank_code || '',
    bank_name: existingBankData.bank_name || '',
    agency: existingBankData.agency || '',
    agency_digit: existingBankData.agency_digit || '',
    account_number: existingBankData.account_number || '',
    account_digit: existingBankData.account_digit || '',
    account_type: existingBankData.account_type || 'corrente',
    account_holder_name: existingBankData.account_holder_name || supplier.name,
    account_holder_document: existingBankData.account_holder_document || supplier.document_number,
    pix_key: existingBankData.pix_key || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank_code) newErrors.bank_code = 'Selecione o banco';
    if (!formData.agency) newErrors.agency = 'Informe a agência';
    if (!formData.account_number) newErrors.account_number = 'Informe o número da conta';
    if (!formData.account_type) newErrors.account_type = 'Selecione o tipo de conta';
    if (!formData.account_holder_name) newErrors.account_holder_name = 'Informe o nome do titular';
    if (!formData.account_holder_document) newErrors.account_holder_document = 'Informe o CPF/CNPJ do titular';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      // Atualizar bank_data local primeiro
      const { error: updateError } = await supabase
        .from('suppliers')
        .update({ 
          bank_data: formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplier.id);

      if (updateError) throw updateError;

      // Se já tem asaas_wallet_id, atualizar no Asaas via edge function
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('asaas_wallet_id')
        .eq('id', supplier.id)
        .single();

      if (supplierData?.asaas_wallet_id) {
        const { data, error: edgeFunctionError } = await supabase.functions.invoke(
          'update-asaas-bank-account',
          {
            body: { 
              supplierId: supplier.id, 
              bank_data: formData 
            }
          }
        );

        if (edgeFunctionError) {
          console.error('Erro ao atualizar no Asaas:', edgeFunctionError);
          toast.warning('Dados salvos localmente, mas erro ao sincronizar com Asaas. Tente revalidar a wallet.');
        } else {
          toast.success('✅ Dados bancários configurados no Asaas!');
        }
      } else {
        // Criar wallet com dados bancários
        const { data, error: walletError } = await supabase.functions.invoke(
          'create-asaas-wallet',
          {
            body: { 
              supplierId: supplier.id,
              force: true
            }
          }
        );

        if (walletError) {
          toast.warning('Dados salvos, mas erro ao criar wallet. Configure manualmente depois.');
        } else {
          toast.success('✅ Wallet criada com dados bancários!');
        }
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar dados bancários:', error);
      toast.error(error.message || 'Erro ao salvar dados bancários');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Dados Bancários</DialogTitle>
          <DialogDescription>
            Configure os dados bancários de <strong>{supplier.name}</strong> para receber pagamentos via split
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              Estes dados serão sincronizados com o Asaas para configurar a conta de recebimento automático (split).
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            {/* Banco */}
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="bank_code">Banco *</Label>
              <Select
                value={formData.bank_code}
                onValueChange={(value) => {
                  const bank = BRAZILIAN_BANKS.find(b => b.code === value);
                  setFormData({ ...formData, bank_code: value, bank_name: bank?.name || '' });
                  setErrors({ ...errors, bank_code: '' });
                }}
              >
                <SelectTrigger className={errors.bank_code ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.code} - {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bank_code && <p className="text-xs text-destructive mt-1">{errors.bank_code}</p>}
            </div>

            {/* Tipo de Conta */}
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="account_type">Tipo de Conta *</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, account_type: value });
                  setErrors({ ...errors, account_type: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Conta Poupança</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agência */}
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="agency">Agência *</Label>
              <div className="flex gap-2">
                <Input
                  id="agency"
                  value={formData.agency}
                  onChange={(e) => {
                    setFormData({ ...formData, agency: e.target.value });
                    setErrors({ ...errors, agency: '' });
                  }}
                  placeholder="Ex: 1234"
                  maxLength={10}
                  className={errors.agency ? 'border-destructive' : ''}
                />
                <Input
                  value={formData.agency_digit}
                  onChange={(e) => setFormData({ ...formData, agency_digit: e.target.value })}
                  placeholder="Dígito"
                  maxLength={2}
                  className="w-20"
                />
              </div>
              {errors.agency && <p className="text-xs text-destructive mt-1">{errors.agency}</p>}
            </div>

            {/* Conta */}
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="account_number">Número da Conta *</Label>
              <div className="flex gap-2">
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => {
                    setFormData({ ...formData, account_number: e.target.value });
                    setErrors({ ...errors, account_number: '' });
                  }}
                  placeholder="Ex: 12345678"
                  maxLength={20}
                  className={errors.account_number ? 'border-destructive' : ''}
                />
                <Input
                  value={formData.account_digit}
                  onChange={(e) => setFormData({ ...formData, account_digit: e.target.value })}
                  placeholder="Dígito"
                  maxLength={2}
                  className="w-20"
                />
              </div>
              {errors.account_number && <p className="text-xs text-destructive mt-1">{errors.account_number}</p>}
            </div>

            {/* Nome do Titular */}
            <div className="col-span-2">
              <Label htmlFor="account_holder_name">Nome do Titular *</Label>
              <Input
                id="account_holder_name"
                value={formData.account_holder_name}
                onChange={(e) => {
                  setFormData({ ...formData, account_holder_name: e.target.value });
                  setErrors({ ...errors, account_holder_name: '' });
                }}
                placeholder="Nome completo"
                className={errors.account_holder_name ? 'border-destructive' : ''}
              />
              {errors.account_holder_name && <p className="text-xs text-destructive mt-1">{errors.account_holder_name}</p>}
            </div>

            {/* CPF/CNPJ do Titular */}
            <div className="col-span-2">
              <Label htmlFor="account_holder_document">CPF/CNPJ do Titular *</Label>
              <Input
                id="account_holder_document"
                value={formData.account_holder_document}
                onChange={(e) => {
                  setFormData({ ...formData, account_holder_document: e.target.value });
                  setErrors({ ...errors, account_holder_document: '' });
                }}
                placeholder="CPF ou CNPJ"
                className={errors.account_holder_document ? 'border-destructive' : ''}
              />
              {errors.account_holder_document && <p className="text-xs text-destructive mt-1">{errors.account_holder_document}</p>}
            </div>

            {/* Chave PIX */}
            <div className="col-span-2">
              <Label htmlFor="pix_key">Chave PIX (Opcional)</Label>
              <Input
                id="pix_key"
                value={formData.pix_key}
                onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                placeholder="Email, telefone, CPF/CNPJ ou chave aleatória"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Dados Bancários
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
