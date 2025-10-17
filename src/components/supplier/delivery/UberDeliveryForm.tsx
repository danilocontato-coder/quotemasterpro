import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, MapPin } from 'lucide-react';
import { useUberDelivery } from '@/hooks/useUberDelivery';

interface UberDeliveryFormProps {
  deliveryId: string;
  defaultPickup?: {
    address: string;
    name: string;
    phone: string;
  };
  defaultDropoff?: {
    address: string;
    name: string;
    phone: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export const UberDeliveryForm = ({
  deliveryId,
  defaultPickup,
  defaultDropoff,
  onSuccess,
  onCancel,
}: UberDeliveryFormProps) => {
  const { getQuote, createDelivery, isLoadingQuote, isCreatingDelivery } = useUberDelivery();
  
  const [step, setStep] = useState<'form' | 'quote' | 'confirm'>('form');
  const [quote, setQuote] = useState<any>(null);
  
  const [pickup, setPickup] = useState({
    address: defaultPickup?.address || '',
    name: defaultPickup?.name || '',
    phone: defaultPickup?.phone || '',
    notes: '',
  });
  
  const [dropoff, setDropoff] = useState({
    address: defaultDropoff?.address || '',
    name: defaultDropoff?.name || '',
    phone: defaultDropoff?.phone || '',
    notes: '',
  });
  
  const [packageSize, setPackageSize] = useState<'small' | 'medium' | 'large'>('small');

  const handleGetQuote = async () => {
    const quoteData = await getQuote({
      pickup: {
        address: pickup.address,
        name: pickup.name,
        phone: pickup.phone,
      },
      dropoff: {
        address: dropoff.address,
        name: dropoff.name,
        phone: dropoff.phone,
      },
      packageSize,
    });

    if (quoteData) {
      setQuote(quoteData);
      setStep('quote');
    }
  };

  const handleConfirm = async () => {
    if (!quote) return;

    const success = await createDelivery({
      deliveryId,
      quoteId: quote.id,
      pickup,
      dropoff,
    });

    if (success) {
      onSuccess();
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Entrega via Uber Direct
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'form' && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <MapPin className="h-4 w-4" />
                Origem (Coleta)
              </div>
              <div className="grid gap-4 pl-6">
                <div>
                  <Label>Endereço Completo</Label>
                  <Input
                    value={pickup.address}
                    onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade, UF, CEP"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Responsável</Label>
                    <Input
                      value={pickup.name}
                      onChange={(e) => setPickup({ ...pickup, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={pickup.phone}
                      onChange={(e) => setPickup({ ...pickup, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Instruções para Coleta (Opcional)</Label>
                  <Textarea
                    value={pickup.notes}
                    onChange={(e) => setPickup({ ...pickup, notes: e.target.value })}
                    placeholder="Ex: Portão azul, tocar interfone"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                Destino (Entrega)
              </div>
              <div className="grid gap-4 pl-6">
                <div>
                  <Label>Endereço Completo</Label>
                  <Input
                    value={dropoff.address}
                    onChange={(e) => setDropoff({ ...dropoff, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade, UF, CEP"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Destinatário</Label>
                    <Input
                      value={dropoff.name}
                      onChange={(e) => setDropoff({ ...dropoff, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={dropoff.phone}
                      onChange={(e) => setDropoff({ ...dropoff, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Instruções para Entrega (Opcional)</Label>
                  <Textarea
                    value={dropoff.notes}
                    onChange={(e) => setDropoff({ ...dropoff, notes: e.target.value })}
                    placeholder="Ex: Deixar na portaria, chamar antes"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Tamanho do Pacote</Label>
              <Select value={packageSize} onValueChange={(v: any) => setPackageSize(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeno (até 3kg)</SelectItem>
                  <SelectItem value="medium">Médio (3-8kg)</SelectItem>
                  <SelectItem value="large">Grande (8-15kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGetQuote}
                disabled={isLoadingQuote || !pickup.address || !dropoff.address}
                className="flex-1"
              >
                {isLoadingQuote ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  'Obter Cotação'
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'quote' && quote && (
          <>
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor da Entrega</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(quote.fee)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Coleta estimada</span>
                <span className="font-medium">{formatDateTime(quote.pickup_eta)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Entrega estimada</span>
                <span className="font-medium">{formatDateTime(quote.dropoff_eta)}</span>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Cotação válida até: {formatDateTime(quote.expires_at)}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('form')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isCreatingDelivery}
                className="flex-1"
              >
                {isCreatingDelivery ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  'Confirmar Entrega'
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
