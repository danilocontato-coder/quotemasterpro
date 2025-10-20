import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp } from 'lucide-react';

interface PredictionCardProps {
  category: string;
  predictedDemand: string;
  suggestedAction: string;
  timeframe: string;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  category,
  predictedDemand,
  suggestedAction,
  timeframe
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{category}</CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {timeframe} dias
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Demanda Prevista</p>
          </div>
          <p className="text-sm">{predictedDemand}</p>
        </div>

        <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Ação Sugerida</p>
          <p className="text-sm font-medium text-primary">{suggestedAction}</p>
        </div>
      </CardContent>
    </Card>
  );
};
