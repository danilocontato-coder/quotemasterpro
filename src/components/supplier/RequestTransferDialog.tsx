import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowDownCircle, AlertCircle } from 'lucide-react';
import { useSupplierBalance } from '@/hooks/useSupplierBalance';
import { useSupplierData } from '@/hooks/useSupplierData';
import { toast } from 'sonner';

interface RequestTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onSuccess: () => void;
}

export const RequestTransferDialog = ({ open, onOpenChange, availableBalance, onSuccess }: RequestTransferDialogProps) => {
  const [amount, setAmount] = useState('');
  const [transferMethod, setTransferMethod] = useState<'PIX' | 'TED'>('PIX');
  const [notes, setNotes] = useState('');
  
  const { supplierData, isLoading: isLoadingSupplier } = useSupplierData();
  const { requestTransfer, isLoading } = useSupplierBalance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (numAmount > availableBalance) {
      toast.error('Saldo insuficiente para transferência');
      return;
    }

    if (!supplierData?.bank_data) {
      toast.error('Configure seus dados bancários antes de solicitar transferências');
      return;
    }

    try {
      await requestTransfer(numAmount, transferMethod, supplierData.bank_data, notes);
      onSuccess();
      onOpenChange(false);
      setAmount('');
      setNotes('');
    } catch (error) {
      // Error handling já feito no hook
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isBankDataComplete = supplierData?.bank_data && 
    supplierData.bank_data.bank_code &&
    supplierData.bank_data.agency &&
    supplierData.bank_data.account_number &&
    supplierData.bank_data.account_digit &&
    supplierData.bank_data.account_holder_name &&
    supplierData.bank_data.account_holder_document;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5" />
            Solicitar Transferência
          </DialogTitle>
          <DialogDescription>
            Transfira seu saldo para sua conta bancária
          </DialogDescription>
        </DialogHeader>

        {!isBankDataComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Dados bancários incompletos</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Configure seus dados bancários em Configurações → Pagamentos antes de solicitar transferências.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Saldo Disponível</Label>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(availableBalance)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor da Transferência</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              disabled={!isBankDataComplete}
            />
            {amount && parseFloat(amount) > 0 && (
              <p className="text-sm text-muted-foreground">
                Valor: {formatCurrency(parseFloat(amount) || 0)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Método de Transferência</Label>
            <Select 
              value={transferMethod} 
              onValueChange={(value) => setTransferMethod(value as 'PIX' | 'TED')}
              disabled={!isBankDataComplete}
            >
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="TED">TED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isBankDataComplete && supplierData?.bank_data && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-1">
              <p className="text-sm font-medium">Conta de destino:</p>
              <p className="text-sm text-muted-foreground">
                {supplierData.bank_data.bank_name || `Banco ${supplierData.bank_data.bank_code}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Ag: {supplierData.bank_data.agency} / Conta: {supplierData.bank_data.account}-{supplierData.bank_data.account_digit}
              </p>
              <p className="text-sm text-muted-foreground">
                {supplierData.bank_data.account_holder_name}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre esta transferência"
              rows={3}
              disabled={!isBankDataComplete}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isBankDataComplete || !amount || parseFloat(amount) <= 0}
            >
              {isLoading ? 'Processando...' : 'Solicitar Transferência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
