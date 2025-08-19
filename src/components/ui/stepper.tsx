import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

interface StepperProps {
  steps: Array<{
    id: number;
    title: string;
    description?: string;
  }>;
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Passo {currentStep} de {steps.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round((currentStep / steps.length) * 100)}% concluído
          </span>
        </div>
        <div className="w-full bg-secondary h-2 rounded-full">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center relative">
              {/* Step Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all",
                  {
                    "bg-primary text-primary-foreground border-primary": isCompleted || isCurrent,
                    "bg-background text-muted-foreground border-border": isUpcoming,
                  },
                  onStepClick && (isCompleted || isCurrent) && "cursor-pointer hover:scale-105"
                )}
                onClick={() => onStepClick && (isCompleted || isCurrent) && onStepClick(step.id)}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-xs font-medium",
                    {
                      "text-primary": isCompleted || isCurrent,
                      "text-muted-foreground": isUpcoming,
                    }
                  )}
                >
                  {step.title}
                </p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-full w-full h-0.5 -translate-y-1/2",
                    {
                      "bg-primary": step.id < currentStep,
                      "bg-border": step.id >= currentStep,
                    }
                  )}
                  style={{
                    width: `calc(100vw / ${steps.length} - 2.5rem)`,
                    maxWidth: "120px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}