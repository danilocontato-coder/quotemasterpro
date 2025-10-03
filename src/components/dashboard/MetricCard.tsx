import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

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

  const getIconGradient = () => {
    switch (changeType) {
      case "positive":
        return "bg-gradient-to-br from-green-500 to-emerald-600";
      case "negative":
        return "bg-gradient-to-br from-red-500 to-rose-600";
      default:
        return "bg-gradient-to-br from-primary/80 to-primary";
    }
  };

  return (
    <div className="group relative bg-card border border-border rounded-xl p-6 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
      {/* Gradient Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-3">{title}</p>
          <p className="text-3xl md:text-4xl font-bold text-foreground mb-2 transition-all duration-300 group-hover:scale-105">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5">
              {changeType === "positive" && <TrendingUp className="h-3.5 w-3.5 text-success" />}
              {changeType === "negative" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
              <p className={`text-sm font-medium ${getChangeColor()}`}>
                {change}
              </p>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-3 opacity-70">{description}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconGradient()} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}