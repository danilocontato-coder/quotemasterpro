import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, XCircle, AlertCircle, FileText, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SupplierEligibilitySummaryProps {
  total: number;
  eligible: number;
  pending: number;
  ineligible: number;
  notChecked: number;
  isLoading?: boolean;
  onExportReport?: () => void;
  onFilterEligible?: () => void;
}

export function SupplierEligibilitySummary({
  total,
  eligible,
  pending,
  ineligible,
  notChecked,
  isLoading,
  onExportReport,
  onFilterEligible
}: SupplierEligibilitySummaryProps) {
  if (total === 0) return null;

  const allEligible = eligible === total && total > 0;
  const hasIssues = ineligible > 0 || pending > 0;

  return (
    <Card className="p-4 bg-muted/30 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Status dos Fornecedores Selecionados</h3>
          </div>
          {allEligible && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Todos Elegíveis
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border hover:border-primary/50 transition-colors cursor-help">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Elegíveis</span>
                    <span className="text-lg font-bold text-green-500">{eligible}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fornecedores com todos os documentos obrigatórios validados</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border hover:border-primary/50 transition-colors cursor-help">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Pendentes</span>
                    <span className="text-lg font-bold text-yellow-500">{pending}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fornecedores com documentos aguardando validação</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border hover:border-primary/50 transition-colors cursor-help">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Não Elegíveis</span>
                    <span className="text-lg font-bold text-red-500">{ineligible}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fornecedores com documentos ausentes, expirados ou rejeitados</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border hover:border-primary/50 transition-colors cursor-help">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Não Verificados</span>
                    <span className="text-lg font-bold text-muted-foreground">{notChecked}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fornecedores sem verificação de documentos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {hasIssues && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              ⚠️ {ineligible > 0 && `${ineligible} fornecedor(es) não elegível(is)`}
              {ineligible > 0 && pending > 0 && ' • '}
              {pending > 0 && `${pending} pendente(s)`}
            </p>
            <div className="flex gap-2">
              {onFilterEligible && eligible > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFilterEligible}
                  disabled={isLoading}
                >
                  Enviar Apenas Elegíveis
                </Button>
              )}
              {onExportReport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportReport}
                  disabled={isLoading}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exportar Relatório
                </Button>
              )}
            </div>
          </div>
        )}

        {allEligible && onExportReport && (
          <div className="flex justify-end pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportReport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar Relatório
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
