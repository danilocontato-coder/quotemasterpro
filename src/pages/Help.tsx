import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, FileText, Users, Package, CreditCard, BarChart3, Settings, MessageSquare, Building2, CheckSquare, Home, HelpCircle } from "lucide-react";
import { HowItWorksHelp } from "@/components/help/HowItWorksHelp";
import { DashboardHelp } from "@/components/help/DashboardHelp";
import { QuotesHelp } from "@/components/help/QuotesHelp";
import { ApprovalsHelp } from "@/components/help/ApprovalsHelp";
import { SuppliersHelp } from "@/components/help/SuppliersHelp";
import { ProductsHelp } from "@/components/help/ProductsHelp";
import { PaymentsHelp } from "@/components/help/PaymentsHelp";
import { ReportsHelp } from "@/components/help/ReportsHelp";
import { UsersHelp } from "@/components/help/UsersHelp";
import { SettingsHelp } from "@/components/help/SettingsHelp";
import { CommunicationHelp } from "@/components/help/CommunicationHelp";
import { CostCentersHelp } from "@/components/help/CostCentersHelp";
import { useBranding } from "@/contexts/BrandingContext";

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("how-it-works");
  const { settings } = useBranding();

  const modules = [
    { id: "how-it-works", label: "Como Funciona", icon: HelpCircle, component: HowItWorksHelp },
    { id: "dashboard", label: "Dashboard", icon: Home, component: DashboardHelp },
    { id: "quotes", label: "Cotações", icon: FileText, component: QuotesHelp },
    { id: "approvals", label: "Aprovações", icon: CheckSquare, component: ApprovalsHelp },
    { id: "suppliers", label: "Fornecedores", icon: Users, component: SuppliersHelp },
    { id: "products", label: "Produtos", icon: Package, component: ProductsHelp },
    { id: "payments", label: "Pagamentos", icon: CreditCard, component: PaymentsHelp },
    { id: "reports", label: "Relatórios", icon: BarChart3, component: ReportsHelp },
    { id: "communication", label: "Comunicação", icon: MessageSquare, component: CommunicationHelp },
    { id: "cost-centers", label: "Centro de Custos", icon: Building2, component: CostCentersHelp },
    { id: "users", label: "Usuários", icon: Users, component: UsersHelp },
    { id: "settings", label: "Configurações", icon: Settings, component: SettingsHelp },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Central de Ajuda</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Guia completo do sistema {settings.companyName} com instruções passo a passo para todas as funcionalidades
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar na documentação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2 h-auto p-2">
          {modules.map((module) => (
            <TabsTrigger
              key={module.id}
              value={module.id}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <module.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{module.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {modules.map((module) => (
          <TabsContent key={module.id} value={module.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <module.icon className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">{module.label}</CardTitle>
                    <CardDescription>
                      Guia completo de uso do módulo {module.label}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <module.component searchQuery={searchQuery} />
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
