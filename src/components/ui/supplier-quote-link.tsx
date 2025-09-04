import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, Building2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SupplierQuoteLinkProps {
  quoteId: string;
  quoteTitle: string;
}

const SupplierQuoteLink: React.FC<SupplierQuoteLinkProps> = ({ quoteId, quoteTitle }) => {
  const { toast } = useToast();
  const token = crypto.randomUUID();
  const supplierLink = `${window.location.origin}/supplier/auth/${quoteId}/${token}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(supplierLink);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência",
      });
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link",
        variant: "destructive"
      });
    }
  };

  const openInNewTab = () => {
    window.open(supplierLink, '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Link para Fornecedores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="quoteTitle" className="text-sm font-medium">
            Cotação
          </Label>
          <Input
            id="quoteTitle"
            value={quoteTitle}
            readOnly
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="supplierLink" className="text-sm font-medium">
            Link de Acesso para Fornecedores
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="supplierLink"
              value={supplierLink}
              readOnly
              className="flex-1 font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              title="Copiar link"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={openInNewTab}
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Como funciona:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• O fornecedor clica no link</li>
            <li>• Faz login ou se cadastra na plataforma</li>
            <li>• Envia proposta via PDF ou formulário manual</li>
            <li>• Você recebe a proposta para análise</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierQuoteLink;