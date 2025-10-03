import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { resolveShortLink } from '@/lib/quoteTokens';

export default function ShortLinkRedirect() {
  const { shortCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    const handleResolve = async () => {
      if (!shortCode) {
        setError('Código inválido');
        setLoading(false);
        return;
      }

      console.log('🔗 [SHORT-LINK] Resolving short code:', shortCode);

      const result = await resolveShortLink(shortCode);

      if (!result.success) {
        console.error('❌ [SHORT-LINK] Resolution failed:', result.error);
        setError(result.error || 'Link inválido ou expirado');
        setLoading(false);
        return;
      }

      if (result.redirectPath) {
        console.log('✅ [SHORT-LINK] Using redirect path:', result.redirectPath);
        setRedirectPath(result.redirectPath);
      } else if (result.redirectUrl) {
        // Extract path from full URL for client-side navigation
        try {
          const url = new URL(result.redirectUrl);
          const path = url.pathname;
          console.log('✅ [SHORT-LINK] Redirecting to:', path);
          setRedirectPath(path);
        } catch (err) {
          console.error('❌ [SHORT-LINK] Invalid redirect URL:', result.redirectUrl);
          setError('URL de redirecionamento inválida');
        }
      } else {
        console.error('❌ [SHORT-LINK] No redirect URL in response');
        setError('Resposta inválida do servidor');
      }

      setLoading(false);
    };

    handleResolve();
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

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return null;
}