import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const LinkTester = () => {
  const [shortCode, setShortCode] = useState('Oxd2mQiG'); // Código do token mais recente
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLink = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('Testando link curto:', shortCode);
      
      const { data, error } = await supabase.functions.invoke('resolve-short-link', {
        body: { short_code: shortCode }
      });

      console.log('Resposta da função:', { data, error });

      if (error) {
        setResult({ 
          success: false, 
          error: error.message || 'Erro na edge function',
          details: error
        });
      } else {
        setResult({
          success: true,
          data: data
        });
      }
    } catch (err: any) {
      console.error('Erro no teste:', err);
      setResult({
        success: false,
        error: err.message || 'Erro desconhecido',
        details: err
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Teste de Link Curto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="shortCode">Código Curto</Label>
          <div className="flex gap-2">
            <Input
              id="shortCode"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              placeholder="Ex: Oxd2mQiG"
            />
            <Button onClick={testLink} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Testar'}
            </Button>
          </div>
        </div>

        {result && (
          <div className={`border rounded p-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">
                {result.success ? 'Sucesso' : 'Erro'}
              </span>
            </div>
            
            <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>URL completa que seria testada:</p>
          <code className="bg-muted px-2 py-1 rounded text-xs">
            {window.location.origin}/s/{shortCode}
          </code>
        </div>
      </CardContent>
    </Card>
  );
};

export default LinkTester;