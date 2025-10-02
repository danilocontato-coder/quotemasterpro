import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function QuickResponseSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Proposta Enviada!</h1>
            <p className="text-muted-foreground mb-6">
              Sua proposta foi recebida com sucesso. O cliente entrará em contato em breve.
            </p>
            
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p className="font-medium mb-1">Próximos Passos:</p>
              <ul className="text-left space-y-1 text-muted-foreground">
                <li>• O cliente analisará sua proposta</li>
                <li>• Você receberá um e-mail com o retorno</li>
                <li>• Mantenha seus dados de contato atualizados</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
