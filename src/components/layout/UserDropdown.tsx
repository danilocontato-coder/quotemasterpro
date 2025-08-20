import { User, Settings, Key, LogOut, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface UserDropdownProps {
  user?: {
    name: string;
    email: string;
    company: string;
    avatar?: string;
  };
}

export function UserDropdown({ user }: UserDropdownProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock user data
  const currentUser = user || {
    name: "João Silva",
    email: "joao.silva@condominioflores.com.br",
    company: "Condomínio Jardim das Flores",
    avatar: undefined
  };

  const handleViewProfile = () => {
    navigate('/profiles');
    toast({
      title: "Perfil",
      description: "Redirecionando para o perfil do usuário...",
    });
  };

  const handleChangePassword = () => {
    toast({
      title: "Alterar Senha",
      description: "Funcionalidade de alteração de senha em desenvolvimento.",
    });
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleLogout = () => {
    toast({
      title: "Saindo...",
      description: "Até logo!",
    });
    
    // Mock logout - in real app would clear auth state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Building className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {currentUser.company}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleViewProfile} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Ver Perfil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleChangePassword} className="cursor-pointer">
          <Key className="mr-2 h-4 w-4" />
          <span>Alterar Senha</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}