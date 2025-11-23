import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Info } from "lucide-react";

interface PaymentBreakdownProps {
  baseAmount: number;
  billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  showSupplierInfo?: boolean;
}

const ASAAS_FEES = {
  PIX: 0,
  BOLETO: 3.49,
  CREDIT_CARD: (amount: number) => amount * 0.0199 + 0.49
};

export function PaymentBreakdown({ 
  baseAmount, 
  billingType,
  showSupplierInfo = false 
}: PaymentBreakdownProps) {
  const asaasFee = billingType 
    ? (billingType === 'CREDIT_CARD' ? ASAAS_FEES.CREDIT_CARD(baseAmount) : ASAAS_FEES[billingType])
    : ASAAS_FEES.CREDIT_CARD(baseAmount); // Pior cenário
    
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
            <span className="text-muted-foreground">Valor da cotação</span>
            <span className="font-medium">R$ {baseAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-muted-foreground">
            <span>Taxa de processamento {billingType ? `(${billingType})` : '(estimada)'}</span>
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
