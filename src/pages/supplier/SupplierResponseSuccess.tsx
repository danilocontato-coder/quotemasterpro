import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SupplierResponseSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="text-center">
          <CardHeader className="pb-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Proposta Enviada com Sucesso!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-muted-foreground">
              <p className="mb-4">
                Sua proposta foi enviada e está sendo analisada pelo cliente. 
                Você receberá uma notificação por email assim que houver uma resposta.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-2">Próximos passos:</h3>
                <ul className="text-sm space-y-1 text-left">
                  <li>• O cliente analisará sua proposta</li>
                  <li>• Você receberá feedback em até 5 dias úteis</li>
                  <li>• Mantenha seus dados de contato atualizados</li>
                  <li>• Aguarde o retorno para negociações</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open('mailto:contato@quotemaster.com', '_blank')}
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Entrar em Contato
              </Button>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>
                Dúvidas? Entre em contato conosco através do email: 
                <a href="mailto:contato@quotemaster.com" className="text-primary hover:underline ml-1">
                  contato@quotemaster.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierResponseSuccess;