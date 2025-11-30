import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface HelpTourButtonProps {
  module: string;
  targetRoute?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function HelpTourButton({
  module,
  targetRoute,
  label = "Iniciar Tour Interativo",
  variant = "default",
  size = "default",
  className,
}: HelpTourButtonProps) {
  const navigate = useNavigate();

  const handleStartTour = () => {
    // Store tour request in sessionStorage
    sessionStorage.setItem("start_help_tour", module);
    
    // Navigate to target route if specified
    if (targetRoute) {
      navigate(targetRoute);
      toast.info("Navegando para iniciar o tour...", {
        description: `O tour do ${module} começará em instantes.`,
      });
    } else {
      // Dispatch event to start tour on current page
      window.dispatchEvent(new CustomEvent("start-module-tour", { detail: { module } }));
      toast.info("Iniciando tour...", {
        description: "Siga as instruções em destaque na tela.",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleStartTour}
    >
      <Play className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

interface RestartTourButtonProps {
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function RestartTourButton({
  label = "Reiniciar Tour Geral",
  variant = "outline",
  size = "sm",
  className,
}: RestartTourButtonProps) {
  const handleRestartTour = async () => {
    // Clear tour completed flag from localStorage
    localStorage.removeItem("tour_completed");
    
    // Dispatch event to restart the main tour
    window.dispatchEvent(new CustomEvent("restart-tour"));
    
    toast.success("Tour reiniciado!", {
      description: "O tour guiado começará do início.",
    });
    
    // Reload to trigger tour
    window.location.reload();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleRestartTour}
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
