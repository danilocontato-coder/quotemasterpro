import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

interface BankDataStepProps {
  data: any;
  errors: Record<string, string>;
  onChange: (field: string, value: any) => void;
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

export function BankDataStep({ data, errors, onChange }: BankDataStepProps) {
  // Auto-preencher titular com dados do fornecedor
  React.useEffect(() => {
    if (!data.account_holder_name && data.name) {
      onChange('account_holder_name', data.name);
    }
    if (!data.account_holder_document && data.document_number) {
      onChange('account_holder_document', data.document_number);
    }
  }, [data.name, data.document_number]);

  const hasBankData = data.bank_code || data.account_number || data.agency;

  return (
    <div className="space-y-6">
      <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
          <strong>Importante:</strong> Os dados bancários são necessários para receber pagamentos via split automático. 
          Você pode preencher agora ou configurar depois nas configurações.
        </AlertDescription>
      </Alert>

      <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
          Estes dados serão usados para configurar sua subconta no Asaas e receber os pagamentos automaticamente.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        {/* Banco */}
        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="bank_code">
            Banco {hasBankData && <span className="text-destructive">*</span>}
          </Label>
          <Select
            value={data.bank_code || ''}
            onValueChange={(value) => {
              const bank = BRAZILIAN_BANKS.find(b => b.code === value);
              onChange('bank_code', value);
              if (bank) {
                onChange('bank_name', bank.name);
              }
            }}
          >
            <SelectTrigger id="bank_code" className={errors.bank_code ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {BRAZILIAN_BANKS.map((bank) => (
                <SelectItem key={bank.code} value={bank.code}>
                  {bank.code} - {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bank_code && (
            <p className="text-xs text-destructive mt-1">{errors.bank_code}</p>
          )}
        </div>

        {/* Tipo de Conta */}
        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="account_type">
            Tipo de Conta {hasBankData && <span className="text-destructive">*</span>}
          </Label>
          <Select
            value={data.account_type || ''}
            onValueChange={(value) => onChange('account_type', value)}
          >
            <SelectTrigger id="account_type" className={errors.account_type ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corrente">Conta Corrente</SelectItem>
              <SelectItem value="poupanca">Conta Poupança</SelectItem>
            </SelectContent>
          </Select>
          {errors.account_type && (
            <p className="text-xs text-destructive mt-1">{errors.account_type}</p>
          )}
        </div>

        {/* Agência */}
        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="agency">
            Agência {hasBankData && <span className="text-destructive">*</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              id="agency"
              value={data.agency || ''}
              onChange={(e) => onChange('agency', e.target.value)}
              placeholder="Ex: 1234"
              maxLength={10}
              className={errors.agency ? 'border-destructive' : ''}
            />
            <Input
              id="agency_digit"
              value={data.agency_digit || ''}
              onChange={(e) => onChange('agency_digit', e.target.value)}
              placeholder="Dígito"
              maxLength={2}
              className="w-20"
            />
          </div>
          {errors.agency && (
            <p className="text-xs text-destructive mt-1">{errors.agency}</p>
          )}
        </div>

        {/* Conta */}
        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="account_number">
            Número da Conta {hasBankData && <span className="text-destructive">*</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              id="account_number"
              value={data.account_number || ''}
              onChange={(e) => onChange('account_number', e.target.value)}
              placeholder="Ex: 12345678"
              maxLength={20}
              className={errors.account_number ? 'border-destructive' : ''}
            />
            <Input
              id="account_digit"
              value={data.account_digit || ''}
              onChange={(e) => onChange('account_digit', e.target.value)}
              placeholder="Dígito"
              maxLength={2}
              className="w-20"
            />
          </div>
          {errors.account_number && (
            <p className="text-xs text-destructive mt-1">{errors.account_number}</p>
          )}
        </div>

        {/* Nome do Titular */}
        <div className="col-span-2">
          <Label htmlFor="account_holder_name">
            Nome do Titular {hasBankData && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="account_holder_name"
            value={data.account_holder_name || ''}
            onChange={(e) => onChange('account_holder_name', e.target.value)}
            placeholder="Nome completo do titular da conta"
            maxLength={150}
            className={errors.account_holder_name ? 'border-destructive' : ''}
          />
          {errors.account_holder_name && (
            <p className="text-xs text-destructive mt-1">{errors.account_holder_name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Geralmente é o mesmo nome da empresa/pessoa
          </p>
        </div>

        {/* CPF/CNPJ do Titular */}
        <div className="col-span-2">
          <Label htmlFor="account_holder_document">
            CPF/CNPJ do Titular {hasBankData && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="account_holder_document"
            value={data.account_holder_document || ''}
            onChange={(e) => onChange('account_holder_document', e.target.value)}
            placeholder="CPF ou CNPJ do titular da conta"
            className={errors.account_holder_document ? 'border-destructive' : ''}
          />
          {errors.account_holder_document && (
            <p className="text-xs text-destructive mt-1">{errors.account_holder_document}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Geralmente é o mesmo documento cadastrado acima
          </p>
        </div>

        {/* Chave PIX (opcional) */}
        <div className="col-span-2">
          <Label htmlFor="pix_key">Chave PIX (Opcional)</Label>
          <Input
            id="pix_key"
            value={data.pix_key || ''}
            onChange={(e) => onChange('pix_key', e.target.value)}
            placeholder="Email, telefone, CPF/CNPJ ou chave aleatória"
            maxLength={100}
            className={errors.pix_key ? 'border-destructive' : ''}
          />
          {errors.pix_key && (
            <p className="text-xs text-destructive mt-1">{errors.pix_key}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Opcional: pode facilitar recebimentos futuros
          </p>
        </div>
      </div>

      {hasBankData && (
        <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm text-green-900 dark:text-green-100">
            Com os dados bancários completos, você poderá receber automaticamente os pagamentos via split no Asaas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
