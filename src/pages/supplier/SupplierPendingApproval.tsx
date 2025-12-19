import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, CheckCircle2, Mail, Phone, FileText, 
  ArrowRight, Building2, Shield
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

const NEXT_STEPS = [
  {
    icon: FileText,
    title: 'Análise de Documentos',
    description: 'Nossa equipe está verificando seus dados e documentos',
    status: 'in_progress'
  },
  {
    icon: Shield,
    title: 'Validação de Segurança',
    description: 'Confirmação dos dados junto à Receita Federal',
    status: 'pending'
  },
  {
    icon: CheckCircle2,
    title: 'Aprovação Final',
    description: 'Liberação do acesso à plataforma',
    status: 'pending'
  }
];

export default function SupplierPendingApproval() {
  const navigate = useNavigate();
  const { settings: brandingSettings } = useBranding();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-4">
            {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' && (
              <div className="bg-white rounded-lg p-2 shadow-md">
                <img 
                  src={brandingSettings.logo} 
                  alt={brandingSettings.companyName}
                  className="h-10 w-auto object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{brandingSettings.companyName}</h1>
              <p className="text-primary-foreground/80 text-sm">Cadastro de Fornecedor</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl py-12">
        {/* Success Message */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 mb-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                Cadastro Recebido com Sucesso!
              </h2>
              <p className="text-green-600 dark:text-green-500">
                Seu cadastro foi enviado e está em análise
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Aguardando Aprovação
                </CardTitle>
                <CardDescription>
                  Prazo estimado: até 48 horas úteis
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
                Em Análise
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {NEXT_STEPS.map((step, index) => (
                <div 
                  key={index}
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border
                    ${step.status === 'in_progress' 
                      ? 'border-primary/30 bg-primary/5' 
                      : 'border-muted bg-muted/30'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${step.status === 'in_progress' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{step.title}</h4>
                      {step.status === 'in_progress' && (
                        <Badge variant="secondary" className="text-xs">
                          Em andamento
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">O que acontece agora?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Notificação por E-mail</h4>
                <p className="text-sm text-muted-foreground">
                  Você receberá um e-mail assim que seu cadastro for aprovado
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Acesso Liberado</h4>
                <p className="text-sm text-muted-foreground">
                  Após aprovação, você poderá fazer login e acessar seu painel
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Comece a Receber Cotações</h4>
                <p className="text-sm text-muted-foreground">
                  Clientes poderão encontrar e enviar cotações para você
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="font-medium mb-2">Precisa de ajuda?</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Entre em contato com nossa equipe de suporte
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  suporte@cotiz.com.br
                </Button>
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  (71) 99999-0000
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
          >
            Voltar para página inicial
          </Button>
        </div>
      </div>
    </div>
  );
}
