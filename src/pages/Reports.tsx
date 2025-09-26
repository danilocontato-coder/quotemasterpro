import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Save, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  Star,
  FileText,
  PieChart,
  LineChart,
  Activity,
  Eye,
  Trash2,
  Plus,
  Package,
  Target,
  Calculator,
  Building2,
  ShoppingCart,
  TrendingDown,
  Award
} from 'lucide-react';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/page-loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

// Interfaces para dados reais
interface QuoteData {
  id: string;
  title: string;
  total: number;
  status: string;
  created_at: string;
  client_name: string;
  supplier_name?: string;
  quote_items: QuoteItem[];
  quote_responses: QuoteResponse[];
}

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteResponse {
  id: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  status: string;
}

interface SupplierData {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  rating: number;
  status: string;
}

interface ReportFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  suppliers?: string[];
  clients?: string[];
  minAmount?: number;
  maxAmount?: number;
  categories?: string[];
  ratings?: number;
}

interface ReportMetrics {
  totalQuotes: number;
  totalAmount: number;
  totalPaid: number;
  totalSavings: number;
  avgQuoteValue: number;
  topSupplier: string;
  topProduct: string;
  bestPrice: { product: string; price: number; supplier: string };
  worstPrice: { product: string; price: number; supplier: string };
  priceEvolution: { product: string; oldPrice: number; newPrice: number; change: number }[];
  supplierRanking: { name: string; volume: number; quotes: number; avgRating: number }[];
  productRanking: { name: string; quantity: number; totalValue: number; avgPrice: number }[];
  categoryAnalysis: { category: string; amount: number; percentage: number; products: number }[];
}

export default function Reports() {
  const { suppliers } = useSupabaseSuppliers();
  const { toast } = useToast();

  const [reportData, setReportData] = useState<ReportMetrics | null>(null);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [brandSettings, setBrandSettings] = useState({
    companyName: 'Sistema de Cotações',
    logo: '/placeholder.svg'
  });

  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    status: [],
    suppliers: [],
    clients: [],
    minAmount: undefined,
    maxAmount: undefined,
    categories: [],
    ratings: undefined
  });

  // Carregar configurações da marca
  useEffect(() => {
    loadBrandSettings();
  }, []);

  const loadBrandSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['company_name', 'company_logo']);
      
      if (data) {
        const settings: any = {};
        data.forEach(item => {
          if (item.setting_key === 'company_name') {
            settings.companyName = (item.setting_value as any)?.value || 'Sistema de Cotações';
          }
          if (item.setting_key === 'company_logo') {
            settings.logo = (item.setting_value as any)?.url || '/placeholder.svg';
          }
        });
        setBrandSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da marca:', error);
    }
  };

  const generateReport = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Gerando relatório com filtros:', filters);

      // Buscar cotações com todos os dados relacionados
      let quotesQuery = supabase
        .from('quotes')
        .select(`
          *,
          quote_items (
            id,
            product_name,
            quantity,
            unit_price,
            total
          ),
          quote_responses (
            id,
            supplier_id,
            supplier_name,
            total_amount,
            status
          )
        `);

      // Aplicar filtros
      if (filters.dateRange) {
        quotesQuery = quotesQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end + 'T23:59:59');
      }

      if (filters.status && filters.status.length > 0) {
        quotesQuery = quotesQuery.in('status', filters.status);
      }

      if (filters.suppliers && filters.suppliers.length > 0) {
        quotesQuery = quotesQuery.in('supplier_id', filters.suppliers);
      }

      if (filters.minAmount !== undefined) {
        quotesQuery = quotesQuery.gte('total', filters.minAmount);
      }

      if (filters.maxAmount !== undefined) {
        quotesQuery = quotesQuery.lte('total', filters.maxAmount);
      }

      const { data: quotesData, error } = await quotesQuery;
      
      if (error) throw error;

      console.log('📊 Cotações encontradas:', quotesData?.length || 0);
      
      if (!quotesData || quotesData.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma cotação encontrada para os filtros selecionados.",
          variant: "destructive"
        });
        setReportData(null);
        setIsLoading(false);
        return;
      }

      setQuotes(quotesData);
      
      // Processar dados para métricas
      const processedMetrics = processReportData(quotesData);
      setReportData(processedMetrics);

      toast({
        title: "Sucesso!",
        description: `Relatório gerado com ${quotesData.length} cotações encontradas.`
      });

    } catch (error: any) {
      console.error('❌ Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar relatório.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processReportData = (quotesData: QuoteData[]): ReportMetrics => {
    const totalQuotes = quotesData.length;
    const totalAmount = quotesData.reduce((sum, q) => sum + (q.total || 0), 0);
    
    // Calcular pagamentos (cotações aprovadas)
    const paidQuotes = quotesData.filter(q => q.status === 'approved');
    const totalPaid = paidQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

    // Análise de produtos
    const productMap = new Map();
    quotesData.forEach(quote => {
      quote.quote_items?.forEach(item => {
        const key = item.product_name;
        if (!productMap.has(key)) {
          productMap.set(key, {
            name: item.product_name,
            quantity: 0,
            totalValue: 0,
            prices: [],
            quotes: 0
          });
        }
        const product = productMap.get(key);
        product.quantity += item.quantity;
        product.totalValue += item.total || 0;
        product.prices.push(item.unit_price || 0);
        product.quotes += 1;
      });
    });

    const productRanking = Array.from(productMap.values())
      .map(p => ({
        name: p.name,
        quantity: p.quantity,
        totalValue: p.totalValue,
        avgPrice: p.totalValue / p.quantity,
        quotes: p.quotes
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // Análise de fornecedores
    const supplierMap = new Map();
    quotesData.forEach(quote => {
      quote.quote_responses?.forEach(response => {
        const key = response.supplier_name;
        if (!supplierMap.has(key)) {
          supplierMap.set(key, {
            name: response.supplier_name,
            volume: 0,
            quotes: 0,
            responses: 0
          });
        }
        const supplier = supplierMap.get(key);
        supplier.volume += response.total_amount || 0;
        supplier.quotes += 1;
        supplier.responses += 1;
      });
    });

    const supplierRanking = Array.from(supplierMap.values())
      .sort((a, b) => b.volume - a.volume);

    // Calcular economia (diferença entre maior e menor proposta por cotação)
    let totalSavings = 0;
    quotesData.forEach(quote => {
      const responses = quote.quote_responses || [];
      if (responses.length > 1) {
        const amounts = responses.map(r => r.total_amount || 0).sort((a, b) => a - b);
        totalSavings += amounts[amounts.length - 1] - amounts[0];
      }
    });

    // Análise de categorias (baseado em especialidades dos fornecedores)
    const categoryMap = new Map();
    suppliers?.forEach(supplier => {
      supplier.specialties?.forEach(specialty => {
        if (!categoryMap.has(specialty)) {
          categoryMap.set(specialty, { category: specialty, amount: 0, products: 0 });
        }
        const category = categoryMap.get(specialty);
        const supplierVolume = supplierMap.get(supplier.name)?.volume || 0;
        category.amount += supplierVolume;
        category.products += 1;
      });
    });

    const categoryAnalysis = Array.from(categoryMap.values())
      .map(c => ({
        ...c,
        percentage: totalAmount > 0 ? (c.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Encontrar melhores e piores preços
    const allPrices = productRanking.map(p => ({ 
      product: p.name, 
      price: p.avgPrice, 
      supplier: 'Média Geral' 
    }));
    
    const bestPrice = allPrices.length > 0 ? 
      allPrices.reduce((min, p) => p.price < min.price ? p : min) : 
      { product: 'N/A', price: 0, supplier: 'N/A' };
      
    const worstPrice = allPrices.length > 0 ? 
      allPrices.reduce((max, p) => p.price > max.price ? p : max) : 
      { product: 'N/A', price: 0, supplier: 'N/A' };

    return {
      totalQuotes,
      totalAmount,
      totalPaid,
      totalSavings,
      avgQuoteValue: totalQuotes > 0 ? totalAmount / totalQuotes : 0,
      topSupplier: supplierRanking[0]?.name || 'N/A',
      topProduct: productRanking[0]?.name || 'N/A',
      bestPrice,
      worstPrice,
      priceEvolution: [], // Implementar se necessário
      supplierRanking: supplierRanking.slice(0, 10),
      productRanking: productRanking.slice(0, 15),
      categoryAnalysis: categoryAnalysis.slice(0, 8)
    };
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    try {
      // Importação dinâmica do jsPDF
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Configurações
      const primaryColor: [number, number, number] = [0, 51, 102]; // #003366
      const textColor: [number, number, number] = [15, 23, 42]; // #0F172A
      const lightGray: [number, number, number] = [245, 245, 245]; // #F5F5F5

      // Header com logo e nome da empresa
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(brandSettings.companyName, 20, 20);

      // Título do relatório
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO EXECUTIVO DE COMPRAS', 20, 45);

      // Período
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${filters.dateRange?.start} a ${filters.dateRange?.end}`, 20, 55);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 62);

      let yPosition = 75;

      // KPIs Principais
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('INDICADORES PRINCIPAIS', 20, yPosition);
      yPosition += 15;

      const kpis = [
        ['Total de Cotações', reportData.totalQuotes.toString()],
        ['Valor Total Cotado', `R$ ${reportData.totalAmount.toLocaleString('pt-BR')}`],
        ['Valor Pago', `R$ ${reportData.totalPaid.toLocaleString('pt-BR')}`],
        ['Economia Obtida', `R$ ${reportData.totalSavings.toLocaleString('pt-BR')}`],
        ['Valor Médio por Cotação', `R$ ${reportData.avgQuoteValue.toLocaleString('pt-BR')}`],
        ['Top Fornecedor', reportData.topSupplier],
        ['Produto Mais Comprado', reportData.topProduct]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Indicador', 'Valor']],
        body: kpis,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Nova página se necessário
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }

      // Ranking de Fornecedores
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('RANKING DE FORNECEDORES', 20, yPosition);
      yPosition += 10;

      const supplierData = reportData.supplierRanking.slice(0, 10).map((supplier, index) => [
        (index + 1).toString(),
        supplier.name,
        `R$ ${supplier.volume.toLocaleString('pt-BR')}`,
        supplier.quotes.toString()
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Fornecedor', 'Volume (R$)', 'Cotações']],
        body: supplierData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 15 }, 
          1: { cellWidth: 80 }, 
          2: { cellWidth: 40 }, 
          3: { cellWidth: 25 } 
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Nova página se necessário
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 20;
      }

      // Ranking de Produtos
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('PRODUTOS MAIS COMPRADOS', 20, yPosition);
      yPosition += 10;

      const productData = reportData.productRanking.slice(0, 10).map((product, index) => [
        (index + 1).toString(),
        product.name,
        product.quantity.toLocaleString('pt-BR'),
        `R$ ${product.totalValue.toLocaleString('pt-BR')}`,
        `R$ ${product.avgPrice.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Produto', 'Qtd', 'Valor Total', 'Preço Médio']],
        body: productData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 15 }, 
          1: { cellWidth: 60 }, 
          2: { cellWidth: 25 }, 
          3: { cellWidth: 35 },
          4: { cellWidth: 25 }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Nova página se necessário
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }

      // Análise de Categorias
      if (reportData.categoryAnalysis.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('ANÁLISE POR CATEGORIA', 20, yPosition);
        yPosition += 10;

        const categoryData = reportData.categoryAnalysis.map((category, index) => [
          (index + 1).toString(),
          category.category,
          `R$ ${category.amount.toLocaleString('pt-BR')}`,
          `${category.percentage.toFixed(1)}%`,
          category.products.toString()
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Categoria', 'Valor', '%', 'Produtos']],
          body: categoryData,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: 255 },
          styles: { fontSize: 8 },
          columnStyles: { 
            0: { cellWidth: 15 }, 
            1: { cellWidth: 60 }, 
            2: { cellWidth: 35 }, 
            3: { cellWidth: 20 },
            4: { cellWidth: 20 }
          }
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(8);
        doc.text(
          `${brandSettings.companyName} - Relatório de Compras | Página ${i} de ${totalPages}`,
          20,
          pageHeight - 10
        );
      }

      // Salvar PDF
      const fileName = `relatorio-compras-${filters.dateRange?.start}-${filters.dateRange?.end}.pdf`;
      doc.save(fileName);

      toast({
        title: "Sucesso!",
        description: "Relatório exportado em PDF com sucesso!"
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar PDF.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      receiving: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Rascunho',
      sent: 'Enviada',
      receiving: 'Recebendo',
      received: 'Recebida',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
      cancelled: 'Cancelada'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (isLoading) {
    return (
      <PageLoader
        hasHeader={true}
        hasMetrics={true}
        hasSearch={true}
        hasTable={true}
        metricsCount={6}
        tableRows={10}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground">
            Análises completas de compras, fornecedores, produtos e economia para tomada de decisão
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>
          {reportData && (
            <Button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Filtros Avançados */}
      {showFilters && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Período */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">📅 Período</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Data inicial</Label>
                    <Input
                      type="date"
                      value={filters.dateRange?.start || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange!, start: e.target.value }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Data final</Label>
                    <Input
                      type="date"
                      value={filters.dateRange?.end || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange!, end: e.target.value }
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">📊 Status</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {['draft', 'sent', 'receiving', 'received', 'approved', 'rejected'].map(status => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={filters.status?.includes(status)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({
                              ...prev,
                              status: [...(prev.status || []), status]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              status: prev.status?.filter(s => s !== status)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={status} className="text-sm cursor-pointer">
                        {getStatusText(status)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fornecedores */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">🏢 Fornecedores</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {suppliers && suppliers.length > 0 ? (
                    suppliers.map(supplier => (
                      <div key={supplier.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={supplier.id}
                          checked={filters.suppliers?.includes(supplier.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({
                                ...prev,
                                suppliers: [...(prev.suppliers || []), supplier.id]
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                suppliers: prev.suppliers?.filter(s => s !== supplier.id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={supplier.id} className="text-sm cursor-pointer">
                          {supplier.name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando fornecedores...</p>
                  )}
                </div>
              </div>

              {/* Valores */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">💰 Faixa de Valores</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Mínimo</Label>
                    <Input
                      type="number"
                      placeholder="R$ 0"
                      value={filters.minAmount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        minAmount: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Máximo</Label>
                    <Input
                      type="number"
                      placeholder="R$ 999.999"
                      value={filters.maxAmount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        maxAmount: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={generateReport} 
                disabled={isLoading}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {isLoading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({
                    dateRange: {
                      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      end: new Date().toISOString().split('T')[0]
                    },
                    status: [],
                    suppliers: [],
                    clients: [],
                    minAmount: undefined,
                    maxAmount: undefined,
                    categories: [],
                    ratings: undefined
                  });
                }}
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados do Relatório */}
      {reportData && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="economy">Economia</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">{reportData.totalQuotes}</p>
                      <p className="text-sm text-muted-foreground">Cotações</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">R$ {reportData.totalAmount.toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Valor Cotado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Calculator className="h-8 w-8 text-emerald-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">R$ {reportData.totalSavings.toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Economia</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <ShoppingCart className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">R$ {reportData.totalPaid.toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Total Pago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Top Fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{reportData.topSupplier}</p>
                    <p className="text-sm text-muted-foreground">Maior volume de negócios</p>
                    <Badge variant="secondary" className="mt-2">
                      {reportData.supplierRanking[0]?.quotes || 0} cotações
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produto Top
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{reportData.topProduct}</p>
                    <p className="text-sm text-muted-foreground">Mais comprado</p>
                    <Badge variant="secondary" className="mt-2">
                      {reportData.productRanking[0]?.quantity || 0} unidades
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Economia Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {reportData.totalAmount > 0 ? ((reportData.totalSavings / reportData.totalAmount) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Taxa de economia</p>
                    <Badge variant="default" className="mt-2">
                      Meta: 15%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fornecedores */}
          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Fornecedores por Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Volume (R$)</TableHead>
                      <TableHead>Cotações</TableHead>
                      <TableHead>Participação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.supplierRanking.map((supplier, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>R$ {supplier.volume.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{supplier.quotes}</TableCell>
                        <TableCell>
                          {reportData.totalAmount > 0 ? ((supplier.volume / reportData.totalAmount) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Produtos */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Comprados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posição</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Preço Médio</TableHead>
                      <TableHead>Participação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.productRanking.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.quantity.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>R$ {product.totalValue.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>R$ {product.avgPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          {reportData.totalAmount > 0 ? ((product.totalValue / reportData.totalAmount) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financial">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo Financeiro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Valor Total Cotado:</span>
                      <span className="font-bold">R$ {reportData.totalAmount.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Efetivamente Pago:</span>
                      <span className="font-bold text-green-600">R$ {reportData.totalPaid.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pendente de Pagamento:</span>
                      <span className="font-bold text-orange-600">R$ {(reportData.totalAmount - reportData.totalPaid).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Economia Obtida:</span>
                      <span className="font-bold text-emerald-600">R$ {reportData.totalSavings.toLocaleString('pt-BR')}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Análise de Preços</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Melhor Preço:</span>
                        <Badge variant="default">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {reportData.bestPrice.product}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        R$ {reportData.bestPrice.price.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Preço Mais Alto:</span>
                        <Badge variant="destructive">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {reportData.worstPrice.product}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-red-600">
                        R$ {reportData.worstPrice.price.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Valor Médio por Cotação:</span>
                      <p className="text-lg font-bold">
                        R$ {reportData.avgQuoteValue.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Economia */}
          <TabsContent value="economy">
            <div className="space-y-6">
              {reportData.categoryAnalysis.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Economia por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Participação</TableHead>
                          <TableHead>Produtos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.categoryAnalysis.map((category, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{category.category}</TableCell>
                            <TableCell>R$ {category.amount.toLocaleString('pt-BR')}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {category.percentage.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>{category.products}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Oportunidades de Melhoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800">💡 Concentração de Fornecedores</h4>
                      <p className="text-sm text-blue-700">
                        {reportData.supplierRanking.length > 0 && reportData.totalAmount > 0 && 
                         ((reportData.supplierRanking[0]?.volume / reportData.totalAmount) * 100).toFixed(1)}% 
                        do volume está concentrado no fornecedor principal. 
                        Considere diversificar para reduzir riscos.
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800">📈 Meta de Economia</h4>
                      <p className="text-sm text-green-700">
                        Taxa atual: {reportData.totalAmount > 0 ? ((reportData.totalSavings / reportData.totalAmount) * 100).toFixed(1) : 0}% | 
                        Meta sugerida: 15% | 
                        Potencial adicional: R$ {((reportData.totalAmount * 0.15) - reportData.totalSavings).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-yellow-800">⚠️ Análise de Variação</h4>
                      <p className="text-sm text-yellow-700">
                        Monitore a variação de preços entre fornecedores. 
                        Diferença atual entre maior e menor: R$ {(reportData.worstPrice.price - reportData.bestPrice.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!reportData && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Gerar Relatório</h3>
            <p className="text-muted-foreground mb-4">
              Configure os filtros acima e clique em "Gerar Relatório" para visualizar as análises.
            </p>
            <Button onClick={generateReport} className="bg-primary hover:bg-primary/90">
              <BarChart3 className="h-4 w-4 mr-2" />
              Gerar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}