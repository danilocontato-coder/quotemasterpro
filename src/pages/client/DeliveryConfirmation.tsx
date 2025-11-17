import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryConfirmationModal } from '@/components/supplier/DeliveryConfirmationModal';
import { Button } from '@/components/ui/button';
import { Package, Key } from 'lucide-react';

export default function DeliveryConfirmation() {
  const [showModal, setShowModal] = useState(false);

  const handleConfirmed = () => {
    // Refresh or navigate to deliveries page
    console.log('Delivery confirmed successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Confirmação de Entrega
          </h1>
          <p className="text-muted-foreground">
            Confirme o recebimento das suas entregas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Confirmar Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Recebeu um código de confirmação do fornecedor? Use-o para confirmar o recebimento da sua entrega.
            </p>
            
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Package className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-2">Como funciona:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>O fornecedor compartilha um código de 6 dígitos com você</li>
                  <li>Você insere esse código para confirmar o recebimento</li>
                  <li>O pagamento é liberado automaticamente</li>
                  <li>A entrega é marcada como concluída</li>
                </ol>
              </div>
            </div>

            <Button onClick={() => setShowModal(true)} className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Confirmar Entrega com Código
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeliveryConfirmationModal
        open={showModal}
        onOpenChange={setShowModal}
        onConfirmed={handleConfirmed}
      />
    </div>
  );
}