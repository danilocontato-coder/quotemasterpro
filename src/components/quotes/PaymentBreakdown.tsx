import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Info } from "lucide-react";

interface PaymentBreakdownProps {
  productAmount: number;
  shippingCost?: number;
  billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  calculatedFee?: number;
  showSupplierInfo?: boolean;
}

const ASAAS_FEES = {
  PIX: 0,
  BOLETO: 3.49,
  CREDIT_CARD: (amount: number) => amount * 0.0199 + 0.49
};

export function PaymentBreakdown({ 
  productAmount, 
  shippingCost = 0,
  billingType,
  calculatedFee,
  showSupplierInfo = false 
}: PaymentBreakdownProps) {
  const baseAmount = productAmount + shippingCost;
  
  // Usar taxa calculada se disponível, senão calcular
  const asaasFee = calculatedFee ?? (
    billingType 
      ? (billingType === 'CREDIT_CARD' ? ASAAS_FEES.CREDIT_CARD(baseAmount) : ASAAS_FEES[billingType])
      : ASAAS_FEES.CREDIT_CARD(baseAmount)
  );
    
  const customerTotal = baseAmount + asaasFee;
  const platformCommission = baseAmount * 0.05;
  const supplierNet = baseAmount - platformCommission;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5" />
          Detalhamento do Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor dos produtos</span>
            <span className="font-medium">R$ {productAmount.toFixed(2)}</span>
          </div>
          
          {shippingCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span className="font-medium">+ R$ {shippingCost.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">R$ {baseAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-muted-foreground">
            <div className="flex flex-col">
              <span>Taxa de processamento</span>
              <span className="text-xs">
                {billingType === 'PIX' && '(PIX: Grátis)'}
                {billingType === 'BOLETO' && '(Boleto: R$ 3,49)'}
                {billingType === 'CREDIT_CARD' && '(Cartão: 1,99% + R$ 0,49)'}
                {!billingType && '(Cartão estimado: 1,99% + R$ 0,49)'}
              </span>
            </div>
            <span>+ R$ {asaasFee.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between font-bold text-lg">
            <span>Total a pagar</span>
            <span className="text-primary">R$ {customerTotal.toFixed(2)}</span>
          </div>
        </div>

        {!billingType && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              O valor final será ajustado conforme a forma de pagamento escolhida (PIX, Boleto ou Cartão).
            </AlertDescription>
          </Alert>
        )}

        {showSupplierInfo && (
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1">
              <p><strong>Repasse para o fornecedor:</strong></p>
              <p>Valor base: R$ {baseAmount.toFixed(2)}</p>
              <p>Taxa administrativa (5%): - R$ {platformCommission.toFixed(2)}</p>
              <p className="font-bold">Valor líquido: R$ {supplierNet.toFixed(2)}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
