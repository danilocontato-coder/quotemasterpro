import { cn } from "@/lib/utils";

interface DashboardScreenMockupProps {
  className?: string;
}

export function DashboardScreenMockup({ className }: DashboardScreenMockupProps) {
  return (
    <div className={cn("w-full h-full p-4 text-xs", className)}>
      {/* Header mockup */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-muted-foreground/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold">C</span>
          </div>
          <span className="font-semibold text-foreground/70">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
            🔔
          </div>
          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
            👤
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-background/60 rounded-lg p-2 border border-muted-foreground/10">
          <div className="text-muted-foreground text-[10px]">Cotações</div>
          <div className="text-lg font-bold text-foreground/80">15</div>
          <div className="text-[8px] text-green-600">+12%</div>
        </div>
        <div className="bg-background/60 rounded-lg p-2 border border-muted-foreground/10">
          <div className="text-muted-foreground text-[10px]">Pendentes</div>
          <div className="text-lg font-bold text-foreground/80">3</div>
          <div className="text-[8px] text-amber-600">Aguardando</div>
        </div>
        <div className="bg-background/60 rounded-lg p-2 border border-muted-foreground/10">
          <div className="text-muted-foreground text-[10px]">Investido</div>
          <div className="text-lg font-bold text-foreground/80">R$ 5k</div>
          <div className="text-[8px] text-blue-600">Este mês</div>
        </div>
        <div className="bg-background/60 rounded-lg p-2 border border-muted-foreground/10">
          <div className="text-muted-foreground text-[10px]">Fornecedores</div>
          <div className="text-lg font-bold text-foreground/80">8</div>
          <div className="text-[8px] text-green-600">Ativos</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-4">
        <div className="bg-primary/20 text-primary rounded-md px-2 py-1 text-[10px] font-medium">
          + Nova Cotação
        </div>
        <div className="bg-muted rounded-md px-2 py-1 text-[10px]">
          📋 Aprovações
        </div>
        <div className="bg-muted rounded-md px-2 py-1 text-[10px]">
          🏢 Fornecedores
        </div>
      </div>

      {/* Charts area */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-background/40 rounded-lg p-2 border border-muted-foreground/10">
          <div className="text-[10px] font-medium mb-2 text-foreground/70">Status das Cotações</div>
          <div className="flex items-center justify-center h-16">
            <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-pulse"></div>
          </div>
        </div>
        <div className="bg-background/40 rounded-lg p-2 border border-muted-foreground/10">
          <div className="text-[10px] font-medium mb-2 text-foreground/70">Tendência de Gastos</div>
          <div className="flex items-end justify-around h-16 gap-1">
            <div className="w-3 bg-primary/40 rounded-t" style={{ height: "30%" }}></div>
            <div className="w-3 bg-primary/50 rounded-t" style={{ height: "45%" }}></div>
            <div className="w-3 bg-primary/60 rounded-t" style={{ height: "60%" }}></div>
            <div className="w-3 bg-primary/70 rounded-t" style={{ height: "40%" }}></div>
            <div className="w-3 bg-primary rounded-t" style={{ height: "80%" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
