import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface DisputeModalProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

const disputeReasons = [
  {
    value: "not_received",
    label: "Produtos/serviços não foram entregues",
    description: "Não recebi os produtos ou serviços contratados"
  },
  {
    value: "not_as_described",
    label: "Produtos não conferem com o pedido",
    description: "Os produtos recebidos são diferentes do que foi acordado"
  },
  {
    value: "poor_quality",
    label: "Qualidade abaixo do esperado",
    description: "Os produtos ou serviços não atendem aos padrões esperados"
  },
  {
    value: "incomplete_delivery",
    label: "Entrega incompleta",
    description: "Recebi apenas parte dos produtos/serviços"
  },
  {
    value: "damaged_products",
    label: "Produtos danificados",
    description: "Os produtos chegaram com defeitos ou danos"
  },
  {
    value: "other",
    label: "Outro motivo",
    description: "Descreva o motivo específico da disputa"
  }
];

export function DisputeModal({ payment, open, onOpenChange, onConfirm }: DisputeModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason) return;
    
    setIsLoading(true);
    try {
      const reason = selectedReason === "other" 
        ? customReason.trim()
        : disputeReasons.find(r => r.value === selectedReason)?.label || selectedReason;
      
      onConfirm(reason);
      setSelectedReason("");
      setCustomReason("");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const isValid = selectedReason && (selectedReason !== "other" || customReason.trim());

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Abrir Disputa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900 mb-1">
                  Disputa de Pagamento
                </p>
                <p className="text-sm text-red-800">
                  O valor de <strong>{formatCurrency(payment.amount)}</strong> permanecerá 
                  retido até a resolução da disputa. Nossa equipe analisará o caso.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Motivo da disputa:</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {disputeReasons.map((reason) => (
                <div key={reason.value} className="flex items-start space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} className="mt-1" />
                  <div className="flex-1">
                    <Label 
                      htmlFor={reason.value} 
                      className="font-medium text-sm cursor-pointer"
                    >
                      {reason.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">
                Descreva o motivo da disputa:
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Explique detalhadamente o problema encontrado..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                className="resize-none"
                required
              />
            </div>
          )}

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Detalhes do pagamento:</p>
            <p>• Cotação: {payment.quoteName}</p>
            <p>• Fornecedor: {payment.supplierName}</p>
            <p>• Valor: {formatCurrency(payment.amount)}</p>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-1">Como funciona</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Nossa equipe entrará em contato em até 24h</li>
                  <li>• O fornecedor será notificado da disputa</li>
                  <li>• Os valores permanecerão retidos durante a análise</li>
                  <li>• Você receberá atualizações por email</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? "Abrindo disputa..." : "Abrir Disputa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}