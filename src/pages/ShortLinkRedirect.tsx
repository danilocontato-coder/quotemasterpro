import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function ShortLinkRedirect() {
  const { shortCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const resolveShortLink = async () => {
      if (!shortCode) {
        setError('Código inválido');
        setLoading(false);
        return;
      }

      try {
        // Call the resolve function with short code in body
        const { data, error } = await supabase.functions.invoke('resolve-short-link', {
          body: { short_code: shortCode }
        });

        if (error) {
          console.error('Error resolving short link:', error);
          setError('Link inválido ou expirado');
          return;
        }

        if (data?.success && data?.redirect_url) {
          // Extract the path from the full URL for client-side navigation
          const url = new URL(data.redirect_url);
          setRedirectUrl(url.pathname);
        } else {
          setError(data?.error || 'Link inválido');
        }
      } catch (err) {
        console.error('Failed to resolve short link:', err);
        setError('Erro ao processar o link');
      } finally {
        setLoading(false);
      }
    };

    resolveShortLink();
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-muted-foreground">Redirecionando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Link Inválido</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (redirectUrl) {
    return <Navigate to={redirectUrl} replace />;
  }

  return null;
}