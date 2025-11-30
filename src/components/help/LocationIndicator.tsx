import { ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationIndicatorProps {
  path: string[];
  description?: string;
  className?: string;
}

export function LocationIndicator({
  path,
  description,
  className,
}: LocationIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 bg-muted/50 rounded-lg border",
        className
      )}
    >
      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">Onde encontrar:</p>
        <div className="flex items-center flex-wrap gap-1">
          {path.map((segment, index) => (
            <span key={index} className="flex items-center">
              <code className="text-sm bg-background px-2 py-0.5 rounded border font-medium">
                {segment}
              </code>
              {index < path.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
              )}
            </span>
          ))}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </div>
    </div>
  );
}

interface QuickLocationProps {
  icon: string;
  label: string;
  location: string;
  className?: string;
}

export function QuickLocation({
  icon,
  label,
  location,
  className,
}: QuickLocationProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        className
      )}
    >
      <span>{icon}</span>
      <span className="font-medium">{label}:</span>
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
        {location}
      </code>
    </div>
  );
}
