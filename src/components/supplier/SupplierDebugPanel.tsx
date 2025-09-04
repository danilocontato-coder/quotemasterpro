import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bug, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Link,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useSupplierDebug } from '@/hooks/useSupplierDebug';
import { toast } from '@/hooks/use-toast';

export function SupplierDebugPanel() {
  const { debugInfo, isLoading, refetch, linkSupplierToProfile, createSupplierRecord } = useSupplierDebug();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    cnpj: '',
    phone: ''
  });

  const handleLinkSupplier = async () => {
    const success = await linkSupplierToProfile();
    if (success) {
      toast({
        title: 'Sucesso',
        description: 'Fornecedor vinculado ao perfil com sucesso!'
      });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível vincular o fornecedor ao perfil.',
        variant: 'destructive'
      });
    }
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome do fornecedor é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingSupplier(true);
    const success = await createSupplierRecord(supplierForm);
    
    if (success) {
      toast({
        title: 'Sucesso',
        description: 'Fornecedor criado e vinculado com sucesso!'
      });
      setSupplierForm({ name: '', cnpj: '', phone: '' });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o fornecedor.',
        variant: 'destructive'
      });
    }
    setIsCreatingSupplier(false);
  };

  if (isLoading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-orange-600" />
            <span className="text-orange-800">Carregando informações de debug...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!debugInfo) return null;

  const getStatusIcon = () => {
    if (debugInfo.error) return <XCircle className="h-5 w-5 text-red-600" />;
    if (debugInfo.hasSupplierData && debugInfo.userSupplierId) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <AlertTriangle className="h-5 w-5 text-orange-600" />;
  };

  const getStatusMessage = () => {
    if (debugInfo.error) return 'Erro detectado no sistema';
    if (debugInfo.hasSupplierData && debugInfo.userSupplierId) return 'Sistema funcionando corretamente';
    if (debugInfo.hasSupplierData && !debugInfo.userSupplierId) return 'Fornecedor não vinculado ao perfil';
    return 'Registro de fornecedor não encontrado';
  };

  return (
    <Card className="border-orange-200 bg-orange-50 mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-orange-100/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-orange-800">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug do Módulo Fornecedor
                {getStatusIcon()}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Status Geral */}
            <Alert className="border-orange-300 bg-orange-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-orange-800">
                <strong>Status:</strong> {getStatusMessage()}
              </AlertDescription>
            </Alert>

            {/* Informações do Usuário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-800">Informações do Usuário</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>ID:</strong> <code className="text-xs">{debugInfo.userId}</code></div>
                  <div><strong>Email:</strong> {debugInfo.userEmail}</div>
                  <div><strong>Role:</strong> <Badge variant="outline">{debugInfo.userRole}</Badge></div>
                  <div><strong>Supplier ID:</strong> {debugInfo.userSupplierId ? 
                    <code className="text-xs text-green-700">{debugInfo.userSupplierId}</code> : 
                    <Badge variant="destructive">Não definido</Badge>
                  }</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-orange-800">Dados do Sistema</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Registro Fornecedor:</strong> {debugInfo.hasSupplierData ? 
                    <Badge variant="default" className="bg-green-100 text-green-800">Encontrado</Badge> : 
                    <Badge variant="destructive">Não encontrado</Badge>
                  }</div>
                  <div><strong>Total Cotações:</strong> {debugInfo.totalQuotes}</div>
                  <div><strong>Total Produtos:</strong> {debugInfo.totalProducts}</div>
                  {debugInfo.error && (
                    <div><strong>Erro:</strong> <span className="text-red-600">{debugInfo.error}</span></div>
                  )}
                </div>
              </div>
            </div>

            {/* Ações de Correção */}
            <div className="space-y-3 pt-4 border-t border-orange-200">
              <h4 className="font-semibold text-orange-800">Ações de Correção</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button 
                  onClick={refetch} 
                  variant="outline" 
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>

                {debugInfo.hasSupplierData && !debugInfo.userSupplierId && (
                  <Button 
                    onClick={handleLinkSupplier}
                    size="sm"
                    className="bg-orange-600 text-white hover:bg-orange-700"
                  >
                    <Link className="mr-2 h-4 w-4" />
                    Vincular Fornecedor
                  </Button>
                )}

                {!debugInfo.hasSupplierData && (
                  <Button 
                    onClick={() => setIsCreatingSupplier(!isCreatingSupplier)}
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Fornecedor
                  </Button>
                )}
              </div>

              {/* Formulário de Criação de Fornecedor */}
              {isCreatingSupplier && (
                <div className="space-y-3 p-4 bg-white rounded-lg border border-orange-200">
                  <h5 className="font-medium text-orange-800">Criar Novo Fornecedor</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="supplierName">Nome *</Label>
                      <Input
                        id="supplierName"
                        value={supplierForm.name}
                        onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                        placeholder="Nome da empresa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplierCnpj">CNPJ</Label>
                      <Input
                        id="supplierCnpj"
                        value={supplierForm.cnpj}
                        onChange={(e) => setSupplierForm({...supplierForm, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplierPhone">Telefone</Label>
                      <Input
                        id="supplierPhone"
                        value={supplierForm.phone}
                        onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateSupplier}
                      disabled={isCreatingSupplier}
                      size="sm"
                    >
                      {isCreatingSupplier ? 'Criando...' : 'Criar Fornecedor'}
                    </Button>
                    <Button 
                      onClick={() => setIsCreatingSupplier(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Informações Técnicas */}
            {debugInfo.supplierRecord && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-orange-800 mb-2">
                  Dados Técnicos (Clique para expandir)
                </summary>
                <pre className="bg-white p-2 rounded border overflow-auto text-xs">
                  {JSON.stringify({
                    profile: debugInfo.profileRecord,
                    supplier: debugInfo.supplierRecord
                  }, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}