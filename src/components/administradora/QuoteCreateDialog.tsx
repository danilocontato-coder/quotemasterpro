import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCondominiosVinculados } from '@/hooks/useCondominiosVinculados';

interface QuoteCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administradoraId: string;
  administradoraName: string;
  onSuccess?: () => void;
}

interface QuoteItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export function QuoteCreateDialog({
  open,
  onOpenChange,
  administradoraId,
  administradoraName,
  onSuccess
}: QuoteCreateDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetType: 'self' as 'self' | 'condominio',
    targetCondominioId: '',
  });
  const [items, setItems] = useState<QuoteItem[]>([
    { product_name: '', quantity: 1, unit_price: 0 }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { condominios } = useCondominiosVinculados(administradoraId);

  const handleAddItem = () => {
    setItems([...items, { product_name: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || items.some(i => !i.product_name || i.quantity <= 0)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (formData.targetType === 'condominio' && !formData.targetCondominioId) {
      toast({
        title: "Selecione um condomínio",
        description: "Você deve selecionar um condomínio para esta cotação",
        variant: "destructive"
      });
      return;
    }

    console.log('🏗️ QuoteCreateDialog: Criando cotação');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const total = calculateTotal();
      
      // Definir client_id e on_behalf_of_client_id
      const clientId = administradoraId;
      const onBehalfOfClientId = formData.targetType === 'condominio' ? formData.targetCondominioId : null;

      // Gerar ID temporário para a cotação
      const tempId = `RFQ${Date.now().toString().slice(-6)}`;
      
      // Criar cotação (inserir como array)
      const { data: quotes, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          id: tempId,
          client_id: clientId,
          client_name: administradoraName,
          title: formData.title,
          on_behalf_of_client_id: onBehalfOfClientId,
          created_by: user.id,
          status: 'draft',
          total: total,
          items_count: items.length,
          description: formData.description || null,
        }])
        .select();

      if (quoteError || !quotes || quotes.length === 0) {
        console.error('❌ QuoteCreateDialog: Erro ao criar cotação:', quoteError);
        throw quoteError || new Error('Falha ao criar cotação');
      }

      const quote = quotes[0];

      console.log('✅ QuoteCreateDialog: Cotação criada:', quote.id);

      // Criar itens
      const itemsToInsert = items.map(item => ({
        quote_id: quote.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        client_id: clientId
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('❌ QuoteCreateDialog: Erro ao criar itens:', itemsError);
        throw itemsError;
      }

      console.log('✅ QuoteCreateDialog: Itens criados com sucesso');

      toast({
        title: "Cotação criada!",
        description: `${formData.title} foi criada com sucesso.`
      });

      // Reset
      setFormData({
        title: '',
        description: '',
        targetType: 'self',
        targetCondominioId: '',
      });
      setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);

      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('❌ QuoteCreateDialog: Erro:', error);
      toast({
        title: "Erro ao criar cotação",
        description: error.message || "Não foi possível criar a cotação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Cotação</DialogTitle>
          <DialogDescription>
            Crie uma cotação para a administradora ou para um condomínio vinculado
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Cotação *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Compra de Material de Limpeza"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva os detalhes da cotação"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetType">Cotação para *</Label>
              <Select
                value={formData.targetType}
                onValueChange={(value: 'self' | 'condominio') => 
                  setFormData(prev => ({ ...prev, targetType: value, targetCondominioId: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Administradora</SelectItem>
                  <SelectItem value="condominio">Condomínio Vinculado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.targetType === 'condominio' && (
              <div className="space-y-2">
                <Label htmlFor="condominio">Selecione o Condomínio *</Label>
                <Select
                  value={formData.targetCondominioId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, targetCondominioId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {condominios.map(cond => (
                      <SelectItem key={cond.id} value={cond.id}>
                        {cond.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens da Cotação *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Input
                      placeholder="Nome do produto"
                      value={item.product_name}
                      onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qtd"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Preço unit."
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-primary">
                  R$ {calculateTotal().toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Cotação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
