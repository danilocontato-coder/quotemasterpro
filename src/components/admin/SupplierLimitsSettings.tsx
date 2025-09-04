import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, Users, Shield } from 'lucide-react';
import { useSupplierSuggestions } from '@/hooks/useSupplierSuggestions';

export const SupplierLimitsSettings = () => {
  const { 
    systemSettings, 
    loadSystemSettings, 
    updateSystemSettings 
  } = useSupplierSuggestions();
  
  const [localSettings, setLocalSettings] = useState(systemSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSystemSettings();
  }, [loadSystemSettings]);

  useEffect(() => {
    setLocalSettings(systemSettings);
  }, [systemSettings]);

  useEffect(() => {
    const changed = 
      localSettings.max_suppliers_per_quote !== systemSettings.max_suppliers_per_quote ||
      localSettings.max_certified_suppliers_priority !== systemSettings.max_certified_suppliers_priority;
    setHasChanges(changed);
  }, [localSettings, systemSettings]);

  const handleSave = async () => {
    await updateSystemSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(systemSettings);
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Configurações de Fornecedores</CardTitle>
        </div>
        <CardDescription>
          Configure os limites para envio de cotações e priorização de fornecedores certificados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold">Limites de Envio</h4>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxSuppliers">
                Máximo de fornecedores por cotação
              </Label>
              <Input
                id="maxSuppliers"
                type="number"
                min="1"
                max="50"
                value={localSettings.max_suppliers_per_quote}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  max_suppliers_per_quote: parseInt(e.target.value) || 1
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Limite máximo de fornecedores que podem receber uma cotação simultaneamente
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold">Fornecedores Certificados</h4>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxCertified">
                Prioridade de fornecedores certificados
              </Label>
              <Input
                id="maxCertified"
                type="number"
                min="1"
                max="20"
                value={localSettings.max_certified_suppliers_priority}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  max_certified_suppliers_priority: parseInt(e.target.value) || 1
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Quantidade de fornecedores certificados que aparecem primeiro nas sugestões
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Como funciona
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Fornecedores certificados aparecem primeiro nas sugestões</li>
            <li>• Fornecedores da mesma região têm prioridade</li>
            <li>• Sistema considera as especialidades/categorias compatíveis</li>
            <li>• Limite por cotação evita spam e melhora a qualidade das respostas</li>
          </ul>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-3 pt-4">
            <Button onClick={handleSave} size="sm">
              Salvar Alterações
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};