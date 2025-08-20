import { Plus, Users, Package, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Nova Cotação",
      description: "Criar uma nova solicitação de cotação",
      icon: Plus,
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
      action: () => navigate('/quotes')
    },
    {
      title: "Cadastrar Fornecedor",
      description: "Adicionar novo fornecedor ao sistema",
      icon: Users,
      color: "bg-green-50 text-green-600 hover:bg-green-100",
      action: () => navigate('/suppliers')
    },
    {
      title: "Adicionar Produto",
      description: "Incluir produto no catálogo",
      icon: Package,
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
      action: () => navigate('/products')
    },
    {
      title: "Relatório",
      description: "Gerar relatório de cotações",
      icon: BarChart3,
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
      action: () => navigate('/reports')
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Card key={action.title} className="hover:shadow-md transition-shadow cursor-pointer" onClick={action.action}>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${action.color}`}>
              <action.icon className="h-6 w-6" />
            </div>
            <h3 className="font-medium text-sm mb-1">{action.title}</h3>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}