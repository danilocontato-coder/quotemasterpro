import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface VisualCardProps {
  title: string;
  description?: string;
  image?: string;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function VisualCard({ 
  title, 
  description, 
  image, 
  children, 
  className = "",
  onClick 
}: VisualCardProps) {
  return (
    <Card 
      className={`card-corporate hover:shadow-[var(--shadow-dropdown)] transition-all duration-200 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {image && (
        <div className="h-48 overflow-hidden rounded-t-lg">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
          />
        </div>
      )}
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        {description && (
          <p className="text-muted-foreground text-sm mb-4">{description}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}