import { User, Settings, Key, LogOut, UserCircle, Shield, Activity, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function UserDropdown() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'collaborator':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'supplier':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gestor';
      case 'collaborator':
        return 'Colaborador';
      case 'supplier':
        return 'Fornecedor';
      default:
        return role;
    }
  };

  const handleEditProfile = () => {
    navigate("/profiles");
  };

  const handleChangePassword = () => {
    navigate("/settings");
    toast.info("Acesse a aba 'Segurança' para alterar sua senha");
  };

  const handleSecurity = () => {
    navigate("/settings");
    toast.info("Configurações de segurança");
  };

  const handleActivity = () => {
    // Navigate to activity log
    toast.info("Histórico de atividades - Em desenvolvimento");
  };

  const handleHelp = () => {
    // Open help or documentation
    window.open("https://docs.quotemaster.pro", "_blank");
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logout realizado com sucesso");
      navigate("/auth/login");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {user?.name || 'Usuário'}
              </p>
              <Badge 
                variant="outline" 
                className={`text-xs ${getRoleBadgeColor(user?.role || '')}`}
              >
                {getRoleDisplayName(user?.role || '')}
              </Badge>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || 'usuario@empresa.com'}
            </p>
            {user?.role === 'supplier' && (
              <p className="text-xs leading-none text-muted-foreground">
                Empresa Fornecedora
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleEditProfile} className="cursor-pointer">
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Editar Perfil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleChangePassword} className="cursor-pointer">
          <Key className="mr-2 h-4 w-4" />
          <span>Alterar Senha</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSecurity} className="cursor-pointer">
          <Shield className="mr-2 h-4 w-4" />
          <span>Segurança</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleActivity} className="cursor-pointer">
          <Activity className="mr-2 h-4 w-4" />
          <span>Atividade</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleHelp} className="cursor-pointer">
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Ajuda</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}