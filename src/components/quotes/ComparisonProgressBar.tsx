import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ComparisonProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
}

export function ComparisonProgressBar({ 
  value, 
  label, 
  showValue = true 
}: ComparisonProgressBarProps) {
  const getColorClass = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {showValue && <span className="font-medium">{value.toFixed(1)}</span>}
        </div>
      )}
      <div className="relative">
        <Progress value={value} className="h-2" />
        <div 
          className={cn(
            "absolute top-0 left-0 h-2 rounded-full transition-all",
            getColorClass(value)
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
