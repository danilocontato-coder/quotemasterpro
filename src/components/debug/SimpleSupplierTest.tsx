import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { useToast } from '@/hooks/use-toast';

export function SimpleSupplierTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { createSupplier } = useSupabaseSuppliers();
  const { toast } = useToast();

  const testCreateSupplier = async () => {
    setIsLoading(true);
    setResult(null);

    const testData = {
      name: `Teste Fornecedor ${Date.now()}`,
      cnpj: `${Math.floor(Math.random() * 100000000)}0001${Math.floor(Math.random() * 100)}`,
      email: `teste${Date.now()}@fornecedor.com`,
      phone: '(11) 99999-9999',
      whatsapp: '(11) 99999-9999',
      website: 'https://teste.com',
      state: 'SP',
      city: 'São Paulo',
      address: 'Rua Teste, 123',
      specialties: ['Limpeza', 'Manutenção'],
      type: 'local' as const,
      status: 'active' as const
    };

    console.log('🧪 [SIMPLE-TEST] Criando fornecedor de teste:', testData);

    try {
      const result = await createSupplier(testData);
      
      if (result) {
        setResult(`✅ Fornecedor criado com sucesso! ID: ${result.id}`);
        toast({
          title: "Teste bem-sucedido!",
          description: `Fornecedor ${result.name} criado com sucesso.`,
        });
      } else {
        setResult(`❌ Falha na criação do fornecedor`);
      }
    } catch (error) {
      console.error('🧪 [SIMPLE-TEST] Erro:', error);
      setResult(`❌ Erro: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Teste Rápido - Criar Fornecedor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={testCreateSupplier}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {isLoading ? 'Testando...' : 'Criar Fornecedor Teste'}
          </Button>
        </div>

        {result && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 ${
            result.includes('✅') 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {result.includes('✅') ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{result}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Este teste cria um fornecedor com dados aleatórios para verificar se o cadastro está funcionando.
          Abra o console (F12) para ver os logs detalhados.
        </div>
      </CardContent>
    </Card>
  );
}