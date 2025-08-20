import { User, Settings, Key, LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { toast } from "sonner";

export function UserDropdown() {
  const navigate = useNavigate();
  const { currentClient } = useCurrentClient();

  const handleEditProfile = () => {
    navigate("/profiles");
  };

  const handleChangePassword = () => {
    // Navigate to settings with password change tab or modal
    navigate("/settings");
    toast.info("Acesse a aba 'Segurança' para alterar sua senha");
  };

  const handleLogout = () => {
    // Implement logout logic here
    toast.success("Logout realizado com sucesso");
    // In a real app, you would clear auth tokens, etc.
    console.log("User logged out");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {currentClient?.name || 'Usuário'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentClient?.email || 'usuario@empresa.com'}
            </p>
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
        
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
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