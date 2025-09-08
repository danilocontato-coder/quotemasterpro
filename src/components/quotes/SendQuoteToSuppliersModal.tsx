import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Mail, MessageSquare, Users, X } from "lucide-react";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { selectBestSupplier, createSupplierResponseLink, generateQuoteToken } from "@/lib/supplierDeduplication";
import { ShortLinkDisplay } from "@/components/ui/short-link-display";

interface SendQuoteToSuppliersModalProps {
  quote: any;
  trigger?: React.ReactNode;
}

export function SendQuoteToSuppliersModal({ quote, trigger }: SendQuoteToSuppliersModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [resolvedWebhookUrl, setResolvedWebhookUrl] = useState<string | null>(null);
  const [evolutionConfigured, setEvolutionConfigured] = useState(false);
  const [generatedShortLinks, setGeneratedShortLinks] = useState<any[]>([]);
  
  const { suppliers, isLoading: loadingSuppliers } = useSupabaseSuppliers();
  const { updateQuoteStatus } = useSupabaseQuotes();
  
  // Filter suppliers based on quote's supplier_scope preference
  const activeSuppliers = suppliers.filter(s => s.status === 'active').filter(supplier => {
    // Se quote tem supplier_scope definido, usar essa configuração
    if (quote?.supplier_scope === 'local') {
      return supplier.client_id !== null; // Apenas fornecedores locais
    } else if (quote?.supplier_scope === 'all') {
      return true; // Todos os fornecedores (locais + certificados)
    } else {
      // Fallback para compatibilidade: se não tem supplier_scope, mostrar todos
      return true;
    }
  });
  
  // Group suppliers by CNPJ to handle potential duplicates
  const supplierGroups = activeSuppliers.reduce((groups, supplier) => {
    const key = supplier.cnpj || supplier.email; // Use CNPJ or email as grouping key
    if (!groups[key]) groups[key] = [];
    groups[key].push(supplier);
    return groups;
  }, {} as Record<string, typeof activeSuppliers>);
  
  // Select best supplier from each group (prioritize certified)
  const deduplicatedSuppliers = Object.values(supplierGroups)
    .map(group => selectBestSupplier(group))
    .filter(Boolean)
    .sort((a, b) => {
      // Certified suppliers first, then by name
      if (a.type === 'certified' && b.type !== 'certified') return -1;
      if (a.type !== 'certified' && b.type === 'certified') return 1;
      return a.name.localeCompare(b.name);
    });

  // Default message
  useEffect(() => {
    if (quote) {
      setCustomMessage(`Nova cotação disponível: ${quote.title}\n\nDescrição: ${quote.description || 'Sem descrição'}\n\nPrazo: ${quote.deadline ? new Date(quote.deadline).toLocaleDateString('pt-BR') : 'A definir'}\n\nAcesse a plataforma para mais detalhes.`);
    }
  }, [quote]);

  // Select suppliers that were chosen during quote creation
  useEffect(() => {
    if (deduplicatedSuppliers.length > 0 && selectedSuppliers.length === 0) {
      // If quote has pre-selected suppliers (from creation), use only those
      if (quote?.selected_supplier_ids && quote.selected_supplier_ids.length > 0) {
        const validSupplierIds = quote.selected_supplier_ids.filter(id => 
          deduplicatedSuppliers.some(s => s.id === id)
        );
        setSelectedSuppliers(validSupplierIds);
      } else {
        // Fallback: select all available suppliers
        setSelectedSuppliers(deduplicatedSuppliers.map(s => s.id));
      }
    }
  }, [deduplicatedSuppliers.length, quote?.selected_supplier_ids?.join(',')]); // Optimized dependencies

  // Resolve configured webhook URL and Evolution API
  useEffect(() => {
    if (!open || !quote?.id) return;

    let isMounted = true;
    
    const resolveIntegrations = async () => {
      try {
        // Prevent state updates if component unmounted
        if (!isMounted) return;
        
        setResolvedWebhookUrl(null);
        setEvolutionConfigured(false);

        // Check N8N webhook (client-specific first)
        const { data: clientInt } = await supabase
          .from('integrations')
          .select('configuration')
          .eq('integration_type', 'n8n_webhook')
          .eq('active', true)
          .eq('client_id', quote.client_id || null)
          .maybeSingle();

        if (!isMounted) return;

        let webhookUrl = (clientInt?.configuration as any)?.webhook_url || null;

        if (!webhookUrl) {
          const { data: globalInt } = await supabase
            .from('integrations')
            .select('configuration')
            .eq('integration_type', 'n8n_webhook')
            .eq('active', true)
            .is('client_id', null)
            .maybeSingle();
          webhookUrl = (globalInt?.configuration as any)?.webhook_url || null;
        }

        if (!isMounted) return;
        setResolvedWebhookUrl(webhookUrl);

        // Check Evolution API configuration
        const { data: evoClientInt } = await supabase
          .from('integrations')
          .select('configuration')
          .eq('integration_type', 'whatsapp_evolution')
          .eq('active', true)
          .eq('client_id', quote.client_id || null)
          .maybeSingle();

        if (!isMounted) return;

        let evoCfg = evoClientInt?.configuration;
        if (!evoCfg) {
          const { data: evoGlobalInt } = await supabase
            .from('integrations')
            .select('configuration')
            .eq('integration_type', 'whatsapp_evolution')
            .eq('active', true)
            .is('client_id', null)
            .maybeSingle();
          evoCfg = evoGlobalInt?.configuration;
        }

        // Check if Evolution is properly configured
        if (isMounted && evoCfg && typeof evoCfg === 'object') {
          const cfg = evoCfg as any;
          const hasInstance = cfg.instance || cfg.evolution_instance;
          const hasApiUrl = cfg.api_url || cfg.evolution_api_url;
          const hasToken = cfg.token || cfg.evolution_token;
          setEvolutionConfigured(!!(hasInstance && hasApiUrl && hasToken));
        }

      } catch (e) {
        console.warn('Falha ao resolver integrações');
        if (isMounted) {
          setResolvedWebhookUrl(null);
          setEvolutionConfigured(false);
        }
      }
    };

    resolveIntegrations();

    return () => {
      isMounted = false;
    };
  }, [open, quote?.id]); // Removido quote?.client_id para evitar loops

  const handleToggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.length === deduplicatedSuppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(deduplicatedSuppliers.map(s => s.id));
    }
  };

  const handleSend = async () => {
    if (selectedSuppliers.length === 0) {
      toast.error("Selecione pelo menos um fornecedor");
      return;
    }

    if (!sendWhatsApp && !sendEmail) {
      toast.error("Selecione pelo menos um canal de envio (WhatsApp ou E-mail)");
      return;
    }

    setIsLoading(true);

    try {
      // Determina automaticamente o método de envio: forçar Evolution (envio direto)
      const sendVia = 'direct';
      
      // Generate unique response links for each selected supplier
      const supplierLinks = selectedSuppliers.map((supplierId) => {
        const token = generateQuoteToken();
        return {
          supplier_id: supplierId,
          link: createSupplierResponseLink(quote?.id, token),
          token
        };
      });

      // Generate short links for each supplier
      const shortLinks = await Promise.all(
        selectedSuppliers.map(async (supplierId) => {
          try {
            const { data } = await supabase.functions.invoke('generate-quote-token', {
              body: { quote_id: quote.id }
            });
            
            if (data?.success) {
              return {
                supplier_id: supplierId,
                short_link: data.short_url,
                full_link: data.full_url,
                short_code: data.short_code,
                full_token: data.full_token
              };
            }
            return null;
          } catch (error) {
            console.error('Error generating short link for supplier:', supplierId, error);
            return null;
          }
        })
      );

      const validShortLinks = shortLinks.filter(Boolean);

      const { data, error } = await supabase.functions.invoke('send-quote-to-suppliers', {
        body: {
          quote_id: quote.id,
          supplier_ids: selectedSuppliers,
          send_whatsapp: sendWhatsApp,
          send_email: sendEmail,
          custom_message: customMessage.trim(),
          send_via: sendVia,
          supplier_links: supplierLinks,
          short_links: validShortLinks,
          frontend_base_url: window.location.origin
        }
      });

      if (error) {
        console.error('Error sending quote:', error);
        toast.error(error.message || "Erro ao enviar cotação");
        return;
      }

      if (data?.success) {
        console.log('Webhook usado:', data.webhook_url_used);
        const method = data?.send_method ? `\nMétodo: ${data.send_method}` : '';
        toast.success((data.message || 'Cotação enviada com sucesso!') + (data.webhook_url_used ? `\nWebhook: ${data.webhook_url_used}` : '') + method);
        
        // Atualizar status da cotação para 'sent'
        await updateQuoteStatus(quote.id, 'sent');
        
        // Store generated short links for display
        setGeneratedShortLinks(validShortLinks);
        
        // Log dos links dos fornecedores selecionados
        console.log('Fornecedores selecionados e links enviados:');
        validShortLinks.forEach((linkData, index) => {
          const supplierLink = supplierLinks[index];
          if (linkData && supplierLink) {
            const supplier = deduplicatedSuppliers.find(s => s.id === linkData.supplier_id);
            const badge = supplier?.type === 'certified' ? '🏆 CERTIFICADO' : '📍 LOCAL';
            console.log(`${badge} ${supplier?.name || 'Fornecedor'}:`);
            console.log(`  Link curto: ${linkData.short_link}`);
            console.log(`  Link completo: ${linkData.full_link}`);
          }
        });
        
        // Don't close modal immediately - show generated links
        // setOpen(false);
      } else {
        const evo = data?.resolved_evolution;
        const evoInfo = evo ? `\nInstância: ${evo.instance || '—'}\nAPI URL: ${evo.api_url_defined ? 'OK' : 'faltando'} (${evo.source?.api_url || '-'})\nToken: ${evo.token_defined ? 'OK' : 'faltando'} (${evo.source?.token || '-'})` : '';
        const details = data?.details ? `\nDetalhes: ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details).slice(0,200)}` : '';
        toast.error((data?.error || 'Erro ao enviar cotação') + evoInfo + details);
      }

    } catch (error: any) {
      console.error('Error sending quote:', error);
      toast.error("Erro ao enviar cotação para fornecedores");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Enviar para Fornecedores
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Cotação para Fornecedores
          </DialogTitle>
          <DialogDescription>
            Selecione fornecedores e canais para envio da cotação.
            {quote?.supplier_scope === 'local' && (
              <span className="block mt-1 text-sm text-amber-600">
                ⚠️ Mostrando apenas fornecedores locais conforme configuração da cotação.
              </span>
            )}
            {evolutionConfigured ? 
              ' Envio via Evolution API configurada.' : 
              ' Envio via webhook N8N configurado.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo da Cotação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Título:</span>
                <span className="text-sm font-medium">{quote?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-sm font-medium">
                  {quote?.total ? `R$ ${quote.total.toFixed(2)}` : 'A calcular'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Itens:</span>
                <span className="text-sm font-medium">{quote?.items_count || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Channel Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Canais de Envio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whatsapp"
                  checked={sendWhatsApp}
                  onCheckedChange={(checked) => setSendWhatsApp(checked === true)}
                />
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  WhatsApp
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  E-mail
                </Label>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  {evolutionConfigured ? (
                    'Método configurado: Evolution API (envio direto)'
                  ) : (
                    <>
                      Método configurado: N8N Webhook
                      {resolvedWebhookUrl && (
                        <> - <a href={resolvedWebhookUrl} target="_blank" rel="noreferrer" className="underline">
                          {resolvedWebhookUrl}
                        </a></>
                      )}
                      {!resolvedWebhookUrl && ' (não configurado)'}
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Fornecedores ({selectedSuppliers.length}/{deduplicatedSuppliers.length})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedSuppliers.length === deduplicatedSuppliers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSuppliers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Carregando fornecedores...</p>
                </div>
              ) : deduplicatedSuppliers.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {deduplicatedSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleToggleSupplier(supplier.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedSuppliers.includes(supplier.id)}
                          onCheckedChange={() => handleToggleSupplier(supplier.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{supplier.name}</p>
                            {supplier.type === 'certified' && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                🏆 Certificado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {supplier.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {supplier.email}
                              </span>
                            )}
                            {supplier.whatsapp && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {supplier.whatsapp}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {supplier.specialties?.join(', ') || 'Geral'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {quote?.supplier_scope === 'local' 
                      ? 'Nenhum fornecedor local encontrado para esta cotação'
                      : 'Nenhum fornecedor ativo encontrado'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Short Links Display */}
          {generatedShortLinks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-600">✅ Links Gerados com Sucesso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {generatedShortLinks.map((linkData) => {
                  const supplier = deduplicatedSuppliers.find(s => s.id === linkData.supplier_id);
                  return (
                    <ShortLinkDisplay
                      key={linkData.supplier_id}
                      quoteId={quote?.id}
                      quoteTitle={`${supplier?.name || 'Fornecedor'} - ${quote?.title}`}
                      shortLink={linkData.short_link}
                      fullLink={linkData.full_link}
                    />
                  );
                })}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => {
                      setGeneratedShortLinks([]);
                      setOpen(false);
                    }}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const allLinks = generatedShortLinks.map(link => link.short_link).join('\n');
                      navigator.clipboard.writeText(allLinks);
                      toast.success('Todos os links copiados!');
                    }}
                  >
                    Copiar Todos
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mensagem Personalizada</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Digite uma mensagem personalizada..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Esta mensagem será enviada junto com os detalhes da cotação
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading || selectedSuppliers.length === 0}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar para {selectedSuppliers.length} Fornecedor{selectedSuppliers.length !== 1 ? 'es' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}