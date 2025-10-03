import { Plus, FileText, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useSupabaseSubscriptionGuard } from "@/hooks/useSupabaseSubscriptionGuard";
import { toast } from "sonner";

export function QuickActions() {
  const navigate = useNavigate();
  const { checkLimit, enforceLimit } = useSupabaseSubscriptionGuard();
  
  const handleCreateQuote = () => {
    const canCreate = enforceLimit('CREATE_QUOTE');
    if (canCreate) {
      navigate("/quotes");
    }
  };
  
  const actions = [
    {
      title: "Nova Cotação",
      description: "Criar uma nova solicitação de cotação",
      icon: Plus,
      action: handleCreateQuote,
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
    <Card className="card-corporate overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="group relative h-auto p-5 flex flex-col items-center gap-3 bg-gradient-to-br from-card to-card/50 border border-border rounded-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Icon with gradient background */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <action.icon className="h-7 w-7 text-primary" />
              </div>
              
              <div className="text-center">
                <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {action.description}
                </p>
              </div>
              
              {/* Hover Effect Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}