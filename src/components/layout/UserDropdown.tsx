import { User, Settings, Key, LogOut, UserCircle, Shield, Activity, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { useSupabaseCurrentClient } from "@/hooks/useSupabaseCurrentClient";
import { useSupabaseSubscriptionGuard } from "@/hooks/useSupabaseSubscriptionGuard";
import { toast } from "sonner";

export function UserDropdown() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSupabaseSettings();
  const { clientName, subscriptionPlan, clientType } = useSupabaseCurrentClient();
  const { userPlan } = useSupabaseSubscriptionGuard();
  
  // Get plan display name from Supabase data
  const planDisplayName = userPlan?.display_name || userPlan?.name || null;

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

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Determinar rota de configurações baseado no tipo de cliente
  const getSettingsRoute = () => {
    if (user?.role === 'admin') return '/admin/system';
    if (user?.role === 'supplier') return '/supplier/settings';
    if (clientType === 'administradora') return '/administradora/configuracoes';
    return '/settings';
  };

  // Get display name from settings or user
  const displayName = settings?.display_name || user?.name || 'Usuário';
  const displayCompany = settings?.company_name || user?.companyName || clientName || '';
  const displayAvatar = settings?.avatar_url || user?.avatar;

  const handleEditProfile = () => {
    navigate("/profiles");
  };

  const handleChangePassword = () => {
    navigate(getSettingsRoute());
    toast.info("Acesse a aba 'Segurança' para alterar sua senha");
  };

  const handleSecurity = () => {
    navigate(getSettingsRoute());
    toast.info("Configurações de segurança");
  };

  const handleActivity = () => {
    // Navigate to activity log
    toast.info("Histórico de atividades - Em desenvolvimento");
  };

  const handleHelp = () => {
    // Open help or documentation
    window.open("https://docs.sistemacotacoes.com", "_blank");
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
      <DropdownMenuTrigger asChild data-tour="user-menu">
        <Button variant="ghost" className="flex items-center gap-3 h-10 px-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={displayAvatar} />
            <AvatarFallback className="text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium truncate max-w-[140px]">
              {displayName}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {getRoleDisplayName(user?.role || '')}
              </span>
              {planDisplayName && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {planDisplayName}
                  </span>
                </>
              )}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback>
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                  {user?.email || 'usuario@empresa.com'}
                </p>
                {displayCompany && (
                  <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                    {displayCompany}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge 
                variant="outline" 
                className={`text-xs ${getRoleBadgeColor(user?.role || '')}`}
              >
                {getRoleDisplayName(user?.role || '')}
              </Badge>
              {planDisplayName && (
                <Badge variant="secondary" className="text-xs">
                  {planDisplayName}
                </Badge>
              )}
            </div>
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
        
        <DropdownMenuItem onClick={() => navigate(getSettingsRoute())} className="cursor-pointer">
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