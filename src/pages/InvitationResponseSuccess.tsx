import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InvitationResponseSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Resposta Enviada!</h1>
            <p className="text-muted-foreground">
              Sua resposta foi enviada com sucesso. O cliente receberá uma notificação e poderá entrar em contato caso necessário.
            </p>
          </div>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Obrigado por participar do processo de cotação.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => window.close()}
            className="w-full"
          >
            Fechar Página
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
