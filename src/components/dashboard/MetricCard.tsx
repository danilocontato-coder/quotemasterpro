import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  description 
}: MetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-success";
      case "negative":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change && (
            <p className={`text-sm ${getChangeColor()} mt-1`}>
              {change}
            </p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}