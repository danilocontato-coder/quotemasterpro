import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Clock, TrendingDown } from "lucide-react";
import { mockQuotes, getStatusColor, getStatusText } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export function RecentQuotes() {
  const navigate = useNavigate();
  
  // Get 5 most recent quotes
  const recentQuotes = mockQuotes
    .filter(quote => quote.status !== 'trash')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleViewQuote = (quoteId: string) => {
    navigate('/quotes');
  };

  const calculateSavings = (total: number, responseTotal: number) => {
    if (responseTotal === 0) return 0;
    return ((total - responseTotal) / total) * 100;
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Há poucos minutos';
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${Math.floor(diffHours / 24)}d atrás`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cotações Recentes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/quotes')}>
            Ver todas
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentQuotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma cotação encontrada</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => navigate('/quotes')}
            >
              Criar primeira cotação
            </Button>
          </div>
        ) : (
          recentQuotes.map((quote) => (
            <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{quote.title}</h4>
                  <Badge className={getStatusColor(quote.status)}>
                    {getStatusText(quote.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{quote.id}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getTimeAgo(quote.updatedAt)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm">
                    <span className="font-medium">
                      R$ {quote.total.toLocaleString('pt-BR')}
                    </span>
                    {quote.responseTotal > 0 && (
                      <span className="text-muted-foreground ml-2">
                        → R$ {quote.responseTotal.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  
                  {quote.responseTotal > 0 && quote.responseTotal < quote.total && (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <TrendingDown className="h-3 w-3" />
                      -{calculateSavings(quote.total, quote.responseTotal).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleViewQuote(quote.id)}
                className="ml-2"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}