import React from 'react';
import { CheckCircle, XCircle, Loader2, Mail, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SendingResult {
  supplierId: string;
  supplierName: string;
  email?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
  whatsapp?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
}

interface QuoteSendingProgressProps {
  isLoading: boolean;
  results: SendingResult[];
  totalSuppliers: number;
  completedSuppliers: number;
  methods: {
    email: boolean;
    whatsapp: boolean;
  };
}

export function QuoteSendingProgress({ 
  isLoading, 
  results, 
  totalSuppliers, 
  completedSuppliers,
  methods
}: QuoteSendingProgressProps) {
  const progress = totalSuppliers > 0 ? (completedSuppliers / totalSuppliers) * 100 : 0;
  
  const getSuccessCount = () => {
    return results.reduce((count, result) => {
      let successes = 0;
      if (result.email?.success) successes++;
      if (result.whatsapp?.success) successes++;
      return count + successes;
    }, 0);
  };

  const getTotalSentCount = () => {
    return results.reduce((count, result) => {
      let total = 0;
      if (result.email) total++;
      if (result.whatsapp) total++;
      return count + total;
    }, 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Enviando Cotação...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{completedSuppliers} de {totalSuppliers} fornecedores</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          
          <div className="text-sm text-muted-foreground">
            Enviando via {methods.email && methods.whatsapp ? 'E-mail e WhatsApp' : 
                         methods.email ? 'E-mail' : 'WhatsApp'}...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Envio Concluído
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{getSuccessCount()}</div>
            <div className="text-xs text-muted-foreground">Enviados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{getTotalSentCount() - getSuccessCount()}</div>
            <div className="text-xs text-muted-foreground">Falhas</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
            <div className="text-xs text-muted-foreground">Fornecedores</div>
          </div>
        </div>

        {/* Detalhes por fornecedor */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Detalhes do Envio</h4>
          {results.map((result) => (
            <div key={result.supplierId} className="p-3 bg-secondary/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{result.supplierName}</span>
                <div className="flex gap-1">
                  {result.email && (
                    <Badge 
                      variant={result.email.success ? "default" : "destructive"}
                      className="text-xs"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      {result.email.success ? 'Email OK' : 'Email falhou'}
                    </Badge>
                  )}
                  {result.whatsapp && (
                    <Badge 
                      variant={result.whatsapp.success ? "default" : "destructive"}
                      className="text-xs"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      {result.whatsapp.success ? 'WhatsApp OK' : 'WhatsApp falhou'}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Erros, se houver */}
              {(result.email?.error || result.whatsapp?.error) && (
                <div className="text-xs text-red-600 mt-1">
                  {result.email?.error && <div>Email: {result.email.error}</div>}
                  {result.whatsapp?.error && <div>WhatsApp: {result.whatsapp.error}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}