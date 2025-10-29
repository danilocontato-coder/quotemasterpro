import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Mail, MessageSquare, Users, Sparkles, Target } from "lucide-react";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { useSupplierSuggestions } from "@/hooks/useSupplierSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShortLinkDisplay } from "@/components/ui/short-link-display";
import { selectBestSupplier } from "@/lib/supplierDeduplication";
import { generateQuoteShortLink } from "@/lib/quoteTokens";
import { getCachedBaseUrl } from "@/utils/systemConfig";

interface SendQuoteToSuppliersModalProps {
  quote: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendQuoteToSuppliersModal({ 
  quote, 
  trigger, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
  onSuccess 
}: SendQuoteToSuppliersModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [resolvedWebhookUrl, setResolvedWebhookUrl] = useState<string | null>(null);
  const [evolutionConfigured, setEvolutionConfigured] = useState(false);
  const [generatedShortLinks, setGeneratedShortLinks] = useState<any[]>([]);
  
  const { suppliers, isLoading: loadingSuppliers } = useSupabaseSuppliers();
  const { updateQuoteStatus, refetch } = useSupabaseQuotes();
  const { suggestSuppliers, isLoading: loadingSuggestions } = useSupplierSuggestions();
  const [supplierScores, setSupplierScores] = useState<Record<string, number>>({});
  
  // Filter suppliers based on quote's supplier_scope preference
  const activeSuppliers = suppliers.filter(s => s.status === 'active').filter(supplier => {
    // PRIORIDADE 1: Se a cotação tem fornecedores pré-selecionados (selected_supplier_ids), usar APENAS esses
    if (quote?.selected_supplier_ids && quote.selected_supplier_ids.length > 0) {
      const isSelected = quote.selected_supplier_ids.includes(supplier.id);
      return isSelected;
    }
    
    // PRIORIDADE 2: Caso contrário, aplicar filtro de escopo (supplier_scope)
    if (quote?.supplier_scope === 'local') {
      // Local = fornecedores não certificados da mesma região
      return !supplier.is_certified;
    } else if (quote?.supplier_scope === 'all') {
      return true; // Todos os fornecedores (locais + certificados)
    } else {
      // Fallback: se não tem supplier_scope, mostrar todos
      return true;
    }
  });
  
  // Logging detalhado para debug
  console.log('🔍 [SUPPLIERS-FILTER] Quote supplier_scope:', quote?.supplier_scope);
  console.log('🔍 [SUPPLIERS-FILTER] Quote selected_supplier_ids:', quote?.selected_supplier_ids);
  console.log('🔍 [SUPPLIERS-FILTER] Total suppliers (before filter):', suppliers.filter(s => s.status === 'active').length);
  console.log('🔍 [SUPPLIERS-FILTER] Active suppliers (after filter):', activeSuppliers.length);
  console.log('🔍 [SUPPLIERS-FILTER] Suppliers:', activeSuppliers.map(s => ({ id: s.id, name: s.name, type: s.type, is_certified: s.is_certified })));
  
  // Debug desabilitado para melhorar performance
  // console.log('🔍 DEBUG: selectBestSupplier function:', selectBestSupplier);
  
  // Group suppliers by document to handle potential duplicates
  const supplierGroups = activeSuppliers.reduce((groups, supplier) => {
    const key = supplier.document_number || supplier.email; // Use document number or email as grouping key
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
  
  // Calculate AI compatibility scores for suppliers
  useEffect(() => {
    if (!open || !quote?.client_id || deduplicatedSuppliers.length === 0) return;
    
    const calculateScores = async () => {
      try {
        // Get client info for location-based matching
        const { data: clientData } = await supabase
          .from('clients')
          .select('address')
          .eq('id', quote.client_id)
          .maybeSingle();
        
        const clientAddress = clientData?.address as any;
        const region = clientAddress?.region || '';
        const state = clientAddress?.state || '';
        const city = clientAddress?.city || '';
        
        // Get quote items categories
        const { data: itemsData } = await supabase
          .from('quote_items')
          .select('product_id, product_name')
          .eq('quote_id', quote.id);
        
        // Extract categories from linked products
        const categories = new Set<string>();
        
        if (itemsData && itemsData.length > 0) {
          // Get product categories for items with product_id
          const productIds = itemsData
            .filter(item => item.product_id)
            .map(item => item.product_id);
          
          if (productIds.length > 0) {
            const { data: productsData } = await supabase
              .from('products')
              .select('id, category')
              .in('id', productIds);
            
            productsData?.forEach(product => {
              if (product.category) {
                categories.add(product.category);
              }
            });
          }
          
          // For items without product_id, try to categorize by name
          const { categorizeProduct } = await import('@/lib/productMatcher');
          itemsData
            .filter(item => !item.product_id && item.product_name)
            .forEach(item => {
              const category = categorizeProduct(item.product_name);
              if (category && category !== 'Geral') {
                categories.add(category);
              }
            });
        }
        
        const categoriesArray = Array.from(categories);
        
        console.log('📦 Categorias extraídas para sugestão:', {
          items_count: itemsData?.length || 0,
          categories: categoriesArray
        });
        
        // Get AI suggestions with scores
        const suggestions = await suggestSuppliers(region, state, city, categoriesArray);
        
        // Build score map
        const scores: Record<string, number> = {};
        suggestions.forEach(s => {
          scores[s.supplier_id] = s.match_score;
        });
        
        setSupplierScores(scores);
      } catch (error) {
        console.error('Error calculating supplier scores:', error);
      }
    };
    
    calculateScores();
  }, [open, quote?.id, deduplicatedSuppliers.length]);

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
      // Buscar URL base do sistema
      const systemBaseUrl = await getCachedBaseUrl();
      console.log('🌐 [SEND-QUOTE] Using system base URL:', systemBaseUrl);
      
      // Generate personalized links for each supplier
      console.log('🔗 [SEND-QUOTE] Generating personalized links for suppliers:', selectedSuppliers);
      
      const shortLinks = await Promise.all(
        selectedSuppliers.map(async (supplierId) => {
          console.log(`🔗 [SEND-QUOTE] Generating link for supplier: ${supplierId}`);
          
          // CRITICAL: Always use quote.id (UUID) for security and multi-tenant support
          const linkResult = await generateQuoteShortLink(quote.id, supplierId);
          
          if (!linkResult.success) {
            console.error(`❌ [SEND-QUOTE] Failed to generate link for supplier ${supplierId}:`, linkResult.error);
            return null;
          }
          
          console.log(`✅ [SEND-QUOTE] ${linkResult.reused ? '♻️ Reused' : '🆕 New'} link for supplier ${supplierId}`);
          
          return {
            supplier_id: supplierId,
            short_link: linkResult.shortUrl,
            full_link: linkResult.fullUrl,
            short_code: linkResult.shortCode,
            full_token: linkResult.fullToken
          };
        })
      );

      const validShortLinks = shortLinks.filter((link): link is NonNullable<typeof link> => link !== null);

      if (validShortLinks.length === 0) {
        toast.error('Falha ao gerar links para fornecedores');
        setIsLoading(false);
        return;
      }

      console.log('📨 [SEND-QUOTE] Sending quote to suppliers via edge function');
      
      // Determina automaticamente o método de envio: forçar Evolution (envio direto)
      const sendVia = 'direct';

      const { data, error } = await supabase.functions.invoke('send-quote-to-suppliers', {
        body: {
          quote_id: quote.id,
          supplier_ids: selectedSuppliers,
          send_whatsapp: sendWhatsApp,
          send_email: sendEmail,
          send_via: sendVia,
          short_links: validShortLinks,
          frontend_base_url: systemBaseUrl
        }
      });

      if (error) {
        console.error('Error sending quote:', error);
        toast.error(error.message || "Erro ao enviar cotação");
        return;
      }

      if (data?.success) {
        console.log('Webhook usado:', data.webhook_url_used);
        
        // Preparar lista de fornecedores para toast
        const supplierNames = validShortLinks
          .map(link => {
            const supplier = deduplicatedSuppliers.find(s => s.id === link.supplier_id);
            return supplier?.name;
          })
          .filter(Boolean)
          .join(', ');
        
        const count = selectedSuppliers.length;
        const method = data?.send_method ? `\nMétodo: ${data.send_method}` : '';
        
        toast.success(
          `✅ Cotação enviada para ${count} fornecedor${count > 1 ? 'es' : ''}: ${supplierNames}`,
          {
            description: `Os fornecedores receberão a solicitação ${sendWhatsApp ? 'via WhatsApp' : ''}${sendWhatsApp && sendEmail ? ' e ' : ''}${sendEmail ? 'via E-mail' : ''}`,
            duration: 5000
          }
        );
        
        // Status update is handled by backend - invalidate cache to show fresh data
        await refetch();
        
        // Store generated short links for display
        setGeneratedShortLinks(validShortLinks);
        
        // Log dos links dos fornecedores selecionados
        console.log('Fornecedores selecionados e links enviados:');
        validShortLinks.forEach((linkData) => {
          if (linkData) {
            const supplier = deduplicatedSuppliers.find(s => s.id === linkData.supplier_id);
            const badge = supplier?.type === 'certified' ? '🏆 CERTIFICADO' : '📍 LOCAL';
            console.log(`${badge} ${supplier?.name || 'Fornecedor'}:`);
            console.log(`  Link curto: ${linkData.short_link}`);
            console.log(`  Link completo: ${linkData.full_link}`);
          }
        });
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
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
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Recomendados pela IA (score > 100) */}
                  {deduplicatedSuppliers.filter(s => (supplierScores[s.id] || 0) > 100).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Recomendados pela IA
                        </h4>
                      </div>
                      {deduplicatedSuppliers
                        .filter(s => (supplierScores[s.id] || 0) > 100)
                        .sort((a, b) => (supplierScores[b.id] || 0) - (supplierScores[a.id] || 0))
                        .map((supplier) => {
                          const score = supplierScores[supplier.id] || 0;
                          const compatPercent = Math.min(Math.round((score / 155) * 100), 100);
                          
                          return (
                            <div
                              key={supplier.id}
                              className="flex items-center justify-between p-3 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-900/50 cursor-pointer transition-colors"
                              onClick={() => handleToggleSupplier(supplier.id)}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <Checkbox
                                  checked={selectedSuppliers.includes(supplier.id)}
                                  onCheckedChange={() => handleToggleSupplier(supplier.id)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{supplier.name}</p>
                                    <Badge className="bg-blue-600 text-white border-0 text-xs">
                                      <Target className="h-3 w-3 mr-1" />
                                      {compatPercent}% compatível
                                    </Badge>
                                    {supplier.type === 'certified' && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400">
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
                              <Badge variant="secondary" className="ml-2">
                                {supplier.specialties?.slice(0, 2).join(', ') || 'Geral'}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  
                  {/* Outros fornecedores disponíveis */}
                  {deduplicatedSuppliers.filter(s => (supplierScores[s.id] || 0) <= 100).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-muted-foreground">
                          Outros Disponíveis
                        </h4>
                      </div>
                      {deduplicatedSuppliers
                        .filter(s => (supplierScores[s.id] || 0) <= 100)
                        .sort((a, b) => {
                          // Prioritize certified, then by score, then by name
                          if (a.type === 'certified' && b.type !== 'certified') return -1;
                          if (a.type !== 'certified' && b.type === 'certified') return 1;
                          const scoreA = supplierScores[a.id] || 0;
                          const scoreB = supplierScores[b.id] || 0;
                          if (scoreB !== scoreA) return scoreB - scoreA;
                          return a.name.localeCompare(b.name);
                        })
                        .map((supplier) => {
                          const score = supplierScores[supplier.id];
                          
                          return (
                            <div
                              key={supplier.id}
                              className="flex items-center justify-between p-3 border rounded hover:bg-muted/20 cursor-pointer transition-colors"
                              onClick={() => handleToggleSupplier(supplier.id)}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <Checkbox
                                  checked={selectedSuppliers.includes(supplier.id)}
                                  onCheckedChange={() => handleToggleSupplier(supplier.id)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{supplier.name}</p>
                                    {score && score > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {Math.round((score / 155) * 100)}% compatível
                                      </Badge>
                                    )}
                                    {supplier.type === 'certified' && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400">
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
                              <Badge variant="secondary" className="ml-2">
                                {supplier.specialties?.slice(0, 2).join(', ') || 'Geral'}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  )}
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