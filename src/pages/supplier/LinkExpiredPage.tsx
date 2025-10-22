/**
 * Link Expired Page
 * 
 * Friendly error page shown when a supplier tries to access an expired quote link.
 * Provides helpful information and next steps.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Mail, Home, HelpCircle } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

interface TokenError {
  isExpired: boolean;
  message: string;
  quoteId?: string;
  timestamp: string;
}

export function LinkExpiredPage() {
  const navigate = useNavigate();
  const { settings } = useBranding();
  const [errorInfo, setErrorInfo] = useState<TokenError | null>(null);

  useEffect(() => {
    // Recuperar informações do erro do localStorage
    try {
      const storedError = localStorage.getItem('token_validation_error');
      if (storedError) {
        setErrorInfo(JSON.parse(storedError));
      }
    } catch (error) {
      console.error('Error parsing token error:', error);
    }
  }, []);

  const handleGoHome = () => {
    // Limpar localStorage e ir para home
    localStorage.removeItem('token_validation_error');
    localStorage.removeItem('supplier_quote_context');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="container max-w-2xl">
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
              {errorInfo?.isExpired ? (
                <Clock className="w-8 h-8 text-orange-600 dark:text-orange-300" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-300" />
              )}
            </div>
            <CardTitle className="text-2xl text-orange-700 dark:text-orange-300">
              {errorInfo?.isExpired ? 'Link Expirado' : 'Link Inválido'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {errorInfo?.isExpired 
                ? 'O link de acesso a esta cotação já expirou por motivos de segurança.'
                : 'Este link não é válido ou já foi utilizado.'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Mensagem de Erro Detalhada */}
            <Alert className="border-orange-300 bg-white dark:bg-gray-900">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-muted-foreground">
                {errorInfo?.message || 'Não foi possível acessar a cotação com este link.'}
              </AlertDescription>
            </Alert>

            {/* Informações Adicionais */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                O que fazer agora?
              </h3>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-primary font-semibold">1.</span>
                  <span>
                    <strong>Entre em contato com o cliente</strong> que enviou a cotação e 
                    solicite um novo link de acesso.
                  </span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary font-semibold">2.</span>
                  <span>
                    Os links de cotação têm <strong>validade de 7 dias</strong> por motivos de segurança. 
                    Após esse período, é necessário solicitar um novo link.
                  </span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary font-semibold">3.</span>
                  <span>
                    Certifique-se de usar o <strong>link mais recente</strong> enviado pelo cliente. 
                    Links antigos são automaticamente invalidados quando um novo é gerado.
                  </span>
                </p>
              </div>
            </div>

            {/* Informações Técnicas (Opcional) */}
            {errorInfo?.quoteId && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs">
                <p className="text-muted-foreground">
                  <strong>ID da Cotação:</strong> <code className="font-mono">{errorInfo.quoteId}</code>
                </p>
                <p className="text-muted-foreground mt-1">
                  <strong>Tentativa de acesso:</strong> {new Date(errorInfo.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
              
              <Button
                onClick={() => window.location.href = `mailto:contato@${settings.companyName.toLowerCase().replace(/\s+/g, '')}.com`}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Entrar em Contato
              </Button>
            </div>

            {/* Informação Extra */}
            <p className="text-xs text-center text-muted-foreground pt-4 border-t">
              💡 <strong>Dica:</strong> Salve os links de cotação assim que recebê-los e 
              responda dentro do prazo para evitar este problema.
            </p>
          </CardContent>
        </Card>

        {/* Logo/Branding no rodapé */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Powered by {settings.companyName}</p>
        </div>
      </div>
    </div>
  );
}

export default LinkExpiredPage;
