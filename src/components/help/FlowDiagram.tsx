import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FlowStep {
  id: string;
  icon: string;
  label: string;
  description?: string;
  status?: "default" | "active" | "completed" | "warning";
}

interface FlowDiagramProps {
  title: string;
  description?: string;
  steps: FlowStep[];
  direction?: "horizontal" | "vertical";
  className?: string;
}

export function FlowDiagram({
  title,
  description,
  steps,
  direction = "horizontal",
  className,
}: FlowDiagramProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "flex gap-2",
            direction === "horizontal"
              ? "flex-row flex-wrap items-center justify-center"
              : "flex-col"
          )}
        >
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2",
                direction === "horizontal" ? "flex-row" : "flex-col"
              )}
            >
              {/* Step */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  step.status === "active" &&
                    "bg-primary/10 border-primary text-primary",
                  step.status === "completed" &&
                    "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400",
                  step.status === "warning" &&
                    "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400",
                  (!step.status || step.status === "default") &&
                    "bg-muted/50 border-muted-foreground/20"
                )}
              >
                <span className="text-lg">{step.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-medium">{step.label}</p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Arrow */}
              {index < steps.length - 1 && (
                <span
                  className={cn(
                    "text-muted-foreground text-lg shrink-0",
                    direction === "horizontal" ? "mx-1" : "my-1 rotate-90"
                  )}
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DecisionFlowProps {
  title: string;
  description?: string;
  className?: string;
}

export function QuoteFlowDiagram({ title, description, className }: DecisionFlowProps) {
  const steps: FlowStep[] = [
    { id: "1", icon: "📝", label: "Criar Cotação", description: "Nova solicitação" },
    { id: "2", icon: "📤", label: "Enviar", description: "Para fornecedores" },
    { id: "3", icon: "📥", label: "Receber Propostas", description: "Aguardar respostas" },
    { id: "4", icon: "✅", label: "Aprovar", description: "Melhor proposta" },
    { id: "5", icon: "💳", label: "Pagamento", description: "Processar" },
    { id: "6", icon: "🚚", label: "Entrega", description: "Receber pedido" },
  ];

  return (
    <FlowDiagram
      title={title}
      description={description}
      steps={steps}
      className={className}
    />
  );
}

export function ApprovalFlowDiagram({ title, description, className }: DecisionFlowProps) {
  const steps: FlowStep[] = [
    { id: "1", icon: "📋", label: "Cotação Criada", description: "Aguardando" },
    { id: "2", icon: "👀", label: "Em Análise", description: "Revisar valores" },
    { id: "3", icon: "🔄", label: "Decisão", description: "Aprovar/Rejeitar" },
    { id: "4", icon: "✅", label: "Aprovada", description: "Seguir para pagamento" },
  ];

  return (
    <FlowDiagram
      title={title}
      description={description}
      steps={steps}
      className={className}
    />
  );
}
