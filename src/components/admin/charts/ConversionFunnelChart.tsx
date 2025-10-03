import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Filter, ArrowRight } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
}

interface ConversionFunnelChartProps {
  data: FunnelStage[];
}

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data }) => {
  const maxCount = data[0]?.count || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Funil de Conversão
        </CardTitle>
        <CardDescription>Taxa de conversão das cotações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((stage, index) => {
          const width = (stage.count / maxCount) * 100;
          const prevCount = index > 0 ? data[index - 1].count : stage.count;
          const dropoffPercentage = index > 0 
            ? ((prevCount - stage.count) / prevCount * 100).toFixed(1)
            : '0';

          return (
            <div key={stage.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{stage.count}</span>
                  <span className="text-xs text-muted-foreground">({stage.percentage.toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500 flex items-center justify-end px-4"
                  style={{ width: `${width}%` }}
                >
                  <span className="text-white text-sm font-semibold">
                    {stage.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {index < data.length - 1 && Number(dropoffPercentage) > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>{dropoffPercentage}% de abandono</span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
