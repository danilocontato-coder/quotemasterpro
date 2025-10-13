import { TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export const TourTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
  isLastStep,
}: TooltipRenderProps) => {
  return (
    <div
      {...tooltipProps}
      className="bg-background border-2 border-primary rounded-xl shadow-2xl p-6 max-w-md"
    >
      {/* Header com botão fechar */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-1">
            Passo {index + 1} de {size}
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mb-2">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((index + 1) / size) * 100}%` }}
            />
          </div>
        </div>
        <button
          {...closeProps}
          className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="mb-6">
        {step.title && (
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {step.title}
          </h3>
        )}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {step.content}
        </div>
      </div>

      {/* Footer com botões */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex gap-2">
          {index > 0 && (
            <Button
              {...backProps}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <ChevronLeft className="h-3 w-3" />
              Anterior
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {!isLastStep && (
            <Button
              {...skipProps}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              Pular Tour
            </Button>
          )}
          
          <Button
            {...primaryProps}
            size="sm"
            className="gap-1"
          >
            {isLastStep ? 'Concluir' : 'Próximo'}
            {!isLastStep && <ChevronRight className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
