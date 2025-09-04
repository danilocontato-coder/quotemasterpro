import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  DollarSign,
  Users,
  Building2,
  Truck,
  Database,
  Settings,
  Star,
  Plus,
  Trash2,
  Palette,
  Globe,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Clock,
  Infinity
} from 'lucide-react';

interface CreatePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePlan: (plan: any) => void;
}

// Component with minimal functionality - just a placeholder since user wants Supabase-only data
export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  open,
  onOpenChange,
  onCreatePlan
}) => {
  const { toast } = useToast();
  
  const handleSubmit = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Use o modal do Supabase para criar planos.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Plano</DialogTitle>
          <DialogDescription>
            Esta funcionalidade foi movida para o sistema Supabase.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSubmit}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};