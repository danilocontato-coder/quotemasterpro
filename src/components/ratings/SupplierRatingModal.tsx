import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, User, Package, Truck, DollarSign, Headphones } from "lucide-react";

interface SupplierRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
  quoteId?: string;
  paymentId?: string;
  onSubmit: (rating: {
    supplierId: string;
    supplierName: string;
    quoteId?: string;
    paymentId?: string;
    clientId: string;
    clientName: string;
    rating: number;
    qualityRating: number;
    deliveryRating: number;
    serviceRating: number;
    priceRating: number;
    comment?: string;
  }) => void;
}

export function SupplierRatingModal({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  quoteId,
  paymentId,
  onSubmit,
}: SupplierRatingModalProps) {
  const [qualityRating, setQualityRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [priceRating, setPriceRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qualityRating || !deliveryRating || !serviceRating || !priceRating) {
      return;
    }

    setIsLoading(true);
    try {
      const overallRating = (qualityRating + deliveryRating + serviceRating + priceRating) / 4;
      
      await onSubmit({
        supplierId,
        supplierName,
        quoteId,
        paymentId,
        clientId: '1', // Mock client ID
        clientName: 'Condomínio Jardim das Flores', // Mock client name
        rating: overallRating,
        qualityRating,
        deliveryRating,
        serviceRating,
        priceRating,
        comment: comment.trim() || undefined,
      });

      // Reset form
      setQualityRating(0);
      setDeliveryRating(0);
      setServiceRating(0);
      setPriceRating(0);
      setComment("");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStarRating = (
    rating: number,
    setRating: (rating: number) => void,
    label: string,
    icon: React.ReactNode
  ) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300 hover:text-yellow-200"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Avaliar Fornecedor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{supplierName}</CardTitle>
              {quoteId && (
                <p className="text-sm text-muted-foreground">Cotação: {quoteId}</p>
              )}
              {paymentId && (
                <p className="text-sm text-muted-foreground">Pagamento: {paymentId}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderStarRating(
                  qualityRating,
                  setQualityRating,
                  "Qualidade dos Produtos",
                  <Package className="h-4 w-4" />
                )}

                {renderStarRating(
                  deliveryRating,
                  setDeliveryRating,
                  "Prazo de Entrega",
                  <Truck className="h-4 w-4" />
                )}

                {renderStarRating(
                  serviceRating,
                  setServiceRating,
                  "Atendimento",
                  <Headphones className="h-4 w-4" />
                )}

                {renderStarRating(
                  priceRating,
                  setPriceRating,
                  "Preço Competitivo",
                  <DollarSign className="h-4 w-4" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comentários (opcional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Compartilhe sua experiência com este fornecedor..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Overall Rating Display */}
              {qualityRating && deliveryRating && serviceRating && priceRating && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Avaliação Geral:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= (qualityRating + deliveryRating + serviceRating + priceRating) / 4
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold">
                        {((qualityRating + deliveryRating + serviceRating + priceRating) / 4).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !qualityRating || !deliveryRating || !serviceRating || !priceRating}
              className="flex-1"
            >
              {isLoading ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}