import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  location?: string;
  shortcut?: string;
  tip?: string;
  variant?: "default" | "highlight" | "subtle";
  className?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  location,
  shortcut,
  tip,
  variant = "default",
  className,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        variant === "highlight" && "border-primary/50 bg-primary/5",
        variant === "subtle" && "bg-muted/30",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "p-2 rounded-lg shrink-0",
              variant === "highlight"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>

            {location && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">📍</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {location}
                </code>
              </div>
            )}

            {shortcut && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">⌨️</span>
                <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded border">
                  {shortcut}
                </kbd>
              </div>
            )}

            {tip && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  💡 {tip}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FeatureCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function FeatureCardGrid({
  children,
  columns = 2,
  className,
}: FeatureCardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}
