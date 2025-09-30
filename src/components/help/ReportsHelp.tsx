import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface HelpProps {
  searchQuery?: string;
}

export function ReportsHelp({ searchQuery }: HelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          O módulo de Relatórios oferece análises detalhadas e visualizações sobre cotações, gastos, fornecedores e eficiência operacional.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Documentação em desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A documentação completa para este módulo está em desenvolvimento e será disponibilizada em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
