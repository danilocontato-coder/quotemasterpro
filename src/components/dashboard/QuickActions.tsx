import { Plus, FileText, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function QuickActions() {
  const navigate = useNavigate();
  
  const actions = [
    {
      title: "Nova Cotação",
      description: "Criar uma nova solicitação de cotação",
      icon: Plus,
      action: () => navigate("/quotes"),
    },
    {
      title: "Cadastrar Fornecedor",
      description: "Adicionar novo fornecedor ao sistema",
      icon: Users,
      action: () => navigate("/suppliers"),
    },
    {
      title: "Adicionar Produto",
      description: "Incluir produto no catálogo",
      icon: Package,
      action: () => navigate("/products"),
    },
    {
      title: "Relatório",
      description: "Gerar relatório de cotações",
      icon: FileText,
      action: () => navigate("/reports"),
    },
  ];

  return (
    <Card className="card-corporate">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-primary/5 hover:border-primary/20 transition-colors"
              onClick={action.action}
            >
              <action.icon className="h-6 w-6 text-primary" />
              <div className="text-center">
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}