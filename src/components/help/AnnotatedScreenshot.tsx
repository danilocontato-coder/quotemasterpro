import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Hotspot {
  id: string;
  x: number; // percentual 0-100
  y: number; // percentual 0-100
  label: string;
  description: string;
  icon?: string;
}

interface AnnotatedScreenshotProps {
  title: string;
  description?: string;
  hotspots: Hotspot[];
  aspectRatio?: "16/9" | "4/3" | "1/1";
  className?: string;
  children: React.ReactNode; // SVG ou representação visual
}

export function AnnotatedScreenshot({
  title,
  description,
  hotspots,
  aspectRatio = "16/9",
  className,
  children,
}: AnnotatedScreenshotProps) {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  const activeHotspotData = hotspots.find((h) => h.id === activeHotspot);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-lg">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* Screenshot area with hotspots */}
        <div className="relative" style={{ aspectRatio }}>
          {/* Visual representation */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/40">
            {children}
          </div>

          {/* Hotspots */}
          {hotspots.map((hotspot, index) => (
            <button
              key={hotspot.id}
              className={cn(
                "absolute z-10 flex items-center justify-center",
                "w-8 h-8 rounded-full border-2 transition-all duration-300",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50",
                activeHotspot === hotspot.id
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110"
                  : "bg-background/90 text-foreground border-primary/50 hover:border-primary"
              )}
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() =>
                setActiveHotspot(
                  activeHotspot === hotspot.id ? null : hotspot.id
                )
              }
              aria-label={hotspot.label}
            >
              <span className="text-sm font-bold">{index + 1}</span>
            </button>
          ))}
        </div>

        {/* Hotspot info panel */}
        <div className="p-4 bg-muted/20 border-t min-h-[100px]">
          {activeHotspotData ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {hotspots.findIndex((h) => h.id === activeHotspot) + 1}
                </Badge>
                <h4 className="font-semibold">{activeHotspotData.label}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {activeHotspotData.description}
              </p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                👆 Clique nos números para ver detalhes de cada área
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-background">
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            Áreas interativas:
          </p>
          <div className="flex flex-wrap gap-2">
            {hotspots.map((hotspot, index) => (
              <button
                key={hotspot.id}
                onClick={() =>
                  setActiveHotspot(
                    activeHotspot === hotspot.id ? null : hotspot.id
                  )
                }
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  activeHotspot === hotspot.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {index + 1}. {hotspot.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
