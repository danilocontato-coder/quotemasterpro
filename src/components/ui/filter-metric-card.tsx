interface FilterMetricCardProps {
  title: string;
  value: number;
  isActive: boolean;
  onClick: () => void;
  colorClass?: string;
}

export function FilterMetricCard({ 
  title, 
  value, 
  isActive, 
  onClick,
  colorClass = "text-primary"
}: FilterMetricCardProps) {
  return (
    <div 
      className={`bg-card border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive ? 'border-primary shadow-sm' : 'border-border'
      }`}
      onClick={onClick}
    >
      <div className="text-center">
        <p className={`text-2xl font-bold ${isActive ? 'text-primary' : colorClass}`}>
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}