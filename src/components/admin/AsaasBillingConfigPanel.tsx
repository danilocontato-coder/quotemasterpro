import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Calendar, AlertCircle } from 'lucide-react';
import { useAsaasBillingConfig } from '@/hooks/useAsaasBillingConfig';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AsaasBillingConfigPanel() {
  const { config, updateConfig, isLoading } = useAsaasBillingConfig();
  const [localConfig, setLocalConfig] = useState(config || {
    auto_issue_nfse: false,
    issue_nfse_with_invoice: true,
    nfse_municipal_service_code: '',
    nfse_municipal_service_id: '01.01',
    nfse_service_description: 'Serviços de gestão de cotações e fornecedores',
    nfse_default_observations: '',
    asaas_billing_type: 'BOLETO',
    billing_day: 10,
    auto_billing_enabled: true,
    auto_suspend_enabled: true,
    days_before_suspension: 7
  });

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig(localConfig);
      toast.success('Configurações de faturamento salvas com sucesso');
    } catch (error) {
      console.error('Error saving billing config:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <div>
            <CardTitle>Configurações de Faturamento e NFS-e</CardTitle>
            <CardDescription>
              Configure a emissão automática de NFS-e e parâmetros de cobrança
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configurações de Cobrança */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Parâmetros de Cobrança
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing-type">Tipo de Cobrança Padrão</Label>
              <Select 
                value={localConfig.asaas_billing_type} 
                onValueChange={(val) => setLocalConfig({...localConfig, asaas_billing_type: val})}
              >
                <SelectTrigger id="billing-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  <SelectItem value="UNDEFINED">Cliente Escolhe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Forma de pagamento padrão nas assinaturas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing-day">Dia de Vencimento Padrão</Label>
              <Input
                id="billing-day"
                type="number"
                min="1"
                max="28"
                value={localConfig.billing_day}
                onChange={(e) => setLocalConfig({...localConfig, billing_day: parseInt(e.target.value) || 10})}
              />
              <p className="text-sm text-muted-foreground">
                Dia do mês para vencimento das cobranças (1-28)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto-billing" className="text-base">Cobrança Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Gerar cobranças automaticamente todo mês
                </p>
              </div>
              <Switch
                id="auto-billing"
                checked={localConfig.auto_billing_enabled}
                onCheckedChange={(checked) => setLocalConfig({...localConfig, auto_billing_enabled: checked})}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto-suspend" className="text-base">Suspensão Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Suspender assinatura após inadimplência
                </p>
              </div>
              <Switch
                id="auto-suspend"
                checked={localConfig.auto_suspend_enabled}
                onCheckedChange={(checked) => setLocalConfig({...localConfig, auto_suspend_enabled: checked})}
              />
            </div>

            {localConfig.auto_suspend_enabled && (
              <div className="space-y-2 ml-4">
                <Label htmlFor="days-suspension">Dias Antes da Suspensão</Label>
                <Input
                  id="days-suspension"
                  type="number"
                  min="1"
                  max="30"
                  value={localConfig.days_before_suspension}
                  onChange={(e) => setLocalConfig({...localConfig, days_before_suspension: parseInt(e.target.value) || 7})}
                />
                <p className="text-sm text-muted-foreground">
                  Quantos dias após o vencimento suspender a assinatura
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Configurações de NFS-e */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Configurações de NFS-e
          </h3>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A emissão de NFS-e requer configuração municipal no Asaas. Certifique-se de que sua conta está habilitada.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto-nfse" className="text-base">Emissão Automática de NFS-e</Label>
              <p className="text-sm text-muted-foreground">
                Emitir NFS-e automaticamente após confirmação de pagamento
              </p>
            </div>
            <Switch
              id="auto-nfse"
              checked={localConfig.auto_issue_nfse}
              onCheckedChange={(checked) => setLocalConfig({...localConfig, auto_issue_nfse: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="nfse-with-invoice" className="text-base">Emitir NFS-e com Boleto</Label>
              <p className="text-sm text-muted-foreground">
                Gerar NFS-e junto com a emissão do boleto (útil para condomínios)
              </p>
            </div>
            <Switch
              id="nfse-with-invoice"
              checked={localConfig.issue_nfse_with_invoice}
              onCheckedChange={(checked) => setLocalConfig({...localConfig, issue_nfse_with_invoice: checked})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-code">Código de Serviço Municipal</Label>
              <Input
                id="service-code"
                placeholder="Ex: 17.05"
                value={localConfig.nfse_municipal_service_code}
                onChange={(e) => setLocalConfig({...localConfig, nfse_municipal_service_code: e.target.value})}
              />
              <p className="text-sm text-muted-foreground">
                Código conforme tabela do município
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-id">ID do Serviço (LC 116/2003)</Label>
              <Input
                id="service-id"
                placeholder="Ex: 01.01"
                value={localConfig.nfse_municipal_service_id}
                onChange={(e) => setLocalConfig({...localConfig, nfse_municipal_service_id: e.target.value})}
              />
              <p className="text-sm text-muted-foreground">
                Conforme Lei Complementar 116/2003
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Descrição do Serviço</Label>
            <Textarea
              id="service-description"
              rows={3}
              placeholder="Descrição detalhada dos serviços prestados"
              value={localConfig.nfse_service_description}
              onChange={(e) => setLocalConfig({...localConfig, nfse_service_description: e.target.value})}
            />
            <p className="text-sm text-muted-foreground">
              Descrição que aparecerá na NFS-e
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-observations">Observações Padrão</Label>
            <Textarea
              id="default-observations"
              rows={3}
              placeholder="Observações adicionais que aparecerão em todas as NFS-e"
              value={localConfig.nfse_default_observations}
              onChange={(e) => setLocalConfig({...localConfig, nfse_default_observations: e.target.value})}
            />
            <p className="text-sm text-muted-foreground">
              Texto adicional para todas as notas fiscais
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading ? 'Salvando...' : 'Salvar Configurações de Faturamento'}
        </Button>
      </CardContent>
    </Card>
  );
}
