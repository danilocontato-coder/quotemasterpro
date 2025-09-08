import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShortLinkDisplayProps {
  quoteId: string;
  quoteTitle: string;
  shortLink?: string;
  fullLink?: string;
}

export function ShortLinkDisplay({ quoteId, quoteTitle, shortLink, fullLink }: ShortLinkDisplayProps) {
  const displayLink = shortLink || fullLink || '#';
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copiado para a área de transferência!');
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Link para Fornecedor - {quoteTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {shortLink ? 'Link Curto (Recomendado)' : 'Link Completo'}
          </label>
          <div className="flex gap-2 mt-1">
            <Input
              value={displayLink}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(displayLink)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openInNewTab(displayLink)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Como funciona:</strong> O fornecedor acessa este link, faz login ou se cadastra, 
            e é direcionado automaticamente para responder esta cotação específica.
          </p>
          {shortLink && (
            <p className="text-xs text-success-foreground mt-2">
              ✅ Link curto gerado - mais fácil de compartilhar via WhatsApp
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}