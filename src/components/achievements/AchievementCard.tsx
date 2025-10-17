import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AchievementCardProps {
  icon: string;
  name: string;
  description: string | null;
  progress: number;
  progressMax: number | null;
  earned: boolean;
  earnedAt?: string | null;
}

export function AchievementCard({ 
  icon, 
  name, 
  description, 
  progress, 
  progressMax, 
  earned, 
  earnedAt 
}: AchievementCardProps) {
  const progressPercentage = progressMax ? (progress / progressMax) * 100 : 0;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-lg",
      earned 
        ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50" 
        : "opacity-70 grayscale hover:opacity-80"
    )}>
      {earned && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Desbloqueado
          </Badge>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            "text-4xl transition-transform",
            earned ? "animate-pulse" : ""
          )}>
            {icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 text-foreground">
              {name}
            </h3>
            
            {description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {description}
              </p>
            )}
            
            {!earned && progressMax && (
              <div className="space-y-2">
                <Progress 
                  value={progressPercentage} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground font-medium">
                  {progress}/{progressMax} - {Math.round(progressPercentage)}% completo
                </p>
              </div>
            )}
            
            {earned && earnedAt && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  ✨ Desbloqueado em {format(new Date(earnedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
