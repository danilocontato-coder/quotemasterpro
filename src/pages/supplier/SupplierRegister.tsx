import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBranding } from '@/contexts/BrandingContext';

export default function SupplierRegister() {
  const navigate = useNavigate();
  const { settings: brandingSettings } = useBranding();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' && (
                <div className="bg-white rounded-lg p-2 shadow-md">
                  <img 
                    src={brandingSettings.logo} 
                    alt={brandingSettings.companyName}
                    className="h-12 w-auto object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold mb-1">{brandingSettings.companyName}</h1>
                <p className="text-primary-foreground/80 text-sm">Cadastro de Fornecedor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Cadastro de Fornecedores
            </CardTitle>
            <CardDescription>
              Seja bem-vindo ao {brandingSettings.companyName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>O cadastro de fornecedores é feito mediante convite.</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <p className="text-muted-foreground">
                Para garantir a qualidade e segurança da nossa plataforma, o cadastro de novos fornecedores 
                é realizado através de convite enviado pelos nossos clientes ou pela administração.
              </p>

              <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Como funciona?
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Um cliente cadastrado envia uma cotação para seu email</li>
                  <li>Você recebe um link exclusivo para acessar e responder</li>
                  <li>No primeiro acesso, você completa seu cadastro</li>
                  <li>Pronto! Já pode responder cotações e gerenciar propostas</li>
                </ol>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={() => navigate('/contact')}
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Solicitar Convite
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Voltar para Página Inicial
                </Button>
              </div>

              <div className="text-center pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground">
                  Já recebeu um link de cotação?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate('/supplier/auth')}
                  >
                    Acesse por aqui
                  </Button>
                </p>
                <p className="text-sm text-muted-foreground">
                  Quer se cadastrar como fornecedor certificado?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto font-semibold"
                    onClick={() => navigate('/supplier/signup')}
                  >
                    Auto-cadastro
                  </Button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
