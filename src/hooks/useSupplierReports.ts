import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SupplierReportFilter {
  dateRange: {
    start: string;
    end: string;
  };
  status: string[];
  clients: string[];
  minAmount?: number;
  maxAmount?: number;
  categories: string[];
}

export interface SupplierQuoteData {
  id: string;
  title: string;
  total: number;
  status: string;
  created_at: string;
  client_name: string;
  quote_items: SupplierQuoteItem[];
  quote_responses: SupplierQuoteResponse[];
}

export interface SupplierQuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface SupplierQuoteResponse {
  id: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface SupplierReportMetrics {
  totalQuotes: number;
  totalResponses: number;
  totalProposed: number;
  totalWon: number;
  winRate: number;
  avgResponseTime: number;
  avgQuoteValue: number;
  totalRevenue: number;
  topClient: string;
  topProduct: string;
  bestMargin: { product: string; margin: number; quote: string };
  competitorAnalysis: { competitor: string; quotes: number; winRate: number; avgPrice: number }[];
  clientRanking: { name: string; quotes: number; value: number; winRate: number }[];
  productRanking: { name: string; quantity: number; totalValue: number; avgPrice: number; quotes: number }[];
  monthlyPerformance: { month: string; quotes: number; responses: number; won: number; revenue: number }[];
  priceComparison: { product: string; myPrice: number; avgMarketPrice: number; competitive: boolean }[];
}

export const useSupplierReports = () => {
  const [reportData, setReportData] = useState<SupplierReportMetrics | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuoteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  console.log('📊 [SUPPLIER-REPORTS] Hook iniciado para usuário:', user?.email);

  const generateReport = useCallback(async (filters: SupplierReportFilter) => {
    if (!user || user.role !== 'supplier') {
      console.log('📊 [SUPPLIER-REPORTS] Usuário não é fornecedor, saindo...');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 [SUPPLIER-REPORTS] Gerando relatório com filtros:', filters);

      // Primeiro, buscar o supplier_id do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ [SUPPLIER-REPORTS] Erro ao buscar perfil:', profileError);
        throw profileError;
      }

      const currentSupplierId = profileData?.supplier_id;
      console.log('📊 [SUPPLIER-REPORTS] Supplier ID:', currentSupplierId);

      if (!currentSupplierId) {
        console.log('⚠️ [SUPPLIER-REPORTS] Usuário não tem supplier_id definido');
        setReportData(null);
        setIsLoading(false);
        return;
      }

      // Buscar cotações onde o fornecedor foi convidado ou respondeu
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
          quote_responses!inner (
            id,
            supplier_id,
            supplier_name,
            total_amount,
            status,
            created_at
          )
        `)
        .eq('quote_responses.supplier_id', currentSupplierId);

      // Aplicar filtros
      if (filters.dateRange) {
        quotesQuery = quotesQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end + 'T23:59:59');
      }

      if (filters.status && filters.status.length > 0) {
        quotesQuery = quotesQuery.in('status', filters.status);
      }

      if (filters.clients && filters.clients.length > 0) {
        quotesQuery = quotesQuery.in('client_name', filters.clients);
      }

      if (filters.minAmount !== undefined) {
        quotesQuery = quotesQuery.gte('total', filters.minAmount);
      }

      if (filters.maxAmount !== undefined) {
        quotesQuery = quotesQuery.lte('total', filters.maxAmount);
      }

      const { data: quotesData, error: quotesError } = await quotesQuery;
      
      if (quotesError) {
        console.error('❌ [SUPPLIER-REPORTS] Erro ao buscar cotações:', quotesError);
        throw quotesError;
      }

      console.log('📊 [SUPPLIER-REPORTS] Cotações encontradas:', quotesData?.length || 0);
      
      if (!quotesData || quotesData.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma cotação encontrada para os filtros selecionados.",
          variant: "default"
        });
        setReportData(null);
        setQuotes([]);
        setIsLoading(false);
        return;
      }

      setQuotes(quotesData);
      
      // Processar dados para métricas
      const processedMetrics = processSupplierReportData(quotesData, currentSupplierId);
      setReportData(processedMetrics);

      toast({
        title: "Sucesso!",
        description: `Relatório gerado com ${quotesData.length} cotações encontradas.`
      });

    } catch (err: any) {
      console.error('❌ [SUPPLIER-REPORTS] Erro ao gerar relatório:', err);
      const errorMessage = err.message || "Erro ao gerar relatório.";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const processSupplierReportData = (quotesData: SupplierQuoteData[], supplierId: string): SupplierReportMetrics => {
    const totalQuotes = quotesData.length;
    
    // Analisar respostas do fornecedor
    const myResponses = quotesData.flatMap(quote => 
      quote.quote_responses?.filter(response => response.supplier_id === supplierId) || []
    );
    
    const totalResponses = myResponses.length;
    const totalProposed = myResponses.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    
    // Calcular cotações ganhas (status approved + minha resposta foi aceita)
    const wonQuotes = quotesData.filter(quote => {
      if (quote.status !== 'approved') return false;
      const myResponse = quote.quote_responses?.find(r => r.supplier_id === supplierId);
      if (!myResponse) return false;
      
      // Assumir que ganhou se foi a menor proposta ou única
      const allResponses = quote.quote_responses || [];
      if (allResponses.length === 1) return true;
      
      const myAmount = myResponse.total_amount || 0;
      const isLowest = allResponses.every(r => 
        r.supplier_id === supplierId || (r.total_amount || Infinity) >= myAmount
      );
      
      return isLowest;
    });
    
    const totalWon = wonQuotes.reduce((sum, q) => {
      const myResponse = q.quote_responses?.find(r => r.supplier_id === supplierId);
      return sum + (myResponse?.total_amount || 0);
    }, 0);
    
    const winRate = totalResponses > 0 ? (wonQuotes.length / totalResponses) * 100 : 0;
    
    // Calcular tempo médio de resposta (assumindo 1-3 dias para simplificar)
    const avgResponseTime = 2; // dias
    
    const avgQuoteValue = totalResponses > 0 ? totalProposed / totalResponses : 0;
    const totalRevenue = totalWon; // Receita = cotações ganhas
    
    // Análise de clientes
    const clientMap = new Map();
    quotesData.forEach(quote => {
      const clientName = quote.client_name;
      const myResponse = quote.quote_responses?.find(r => r.supplier_id === supplierId);
      const isWon = wonQuotes.some(wq => wq.id === quote.id);
      
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, {
          name: clientName,
          quotes: 0,
          value: 0,
          won: 0
        });
      }
      
      const client = clientMap.get(clientName);
      client.quotes += 1;
      client.value += myResponse?.total_amount || 0;
      if (isWon) client.won += 1;
    });
    
    const clientRanking = Array.from(clientMap.values())
      .map(c => ({
        ...c,
        winRate: c.quotes > 0 ? (c.won / c.quotes) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
    
    // Análise de produtos
    const productMap = new Map();
    quotesData.forEach(quote => {
      const myResponse = quote.quote_responses?.find(r => r.supplier_id === supplierId);
      if (!myResponse) return;
      
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
    
    // Análise de competidores
    const competitorMap = new Map();
    quotesData.forEach(quote => {
      quote.quote_responses?.forEach(response => {
        if (response.supplier_id === supplierId) return; // Pular a própria resposta
        
        const competitorName = response.supplier_name;
        if (!competitorMap.has(competitorName)) {
          competitorMap.set(competitorName, {
            competitor: competitorName,
            quotes: 0,
            won: 0,
            totalValue: 0
          });
        }
        
        const competitor = competitorMap.get(competitorName);
        competitor.quotes += 1;
        competitor.totalValue += response.total_amount || 0;
        
        // Verificar se competidor ganhou (menor preço)
        const allResponses = quote.quote_responses || [];
        const competitorAmount = response.total_amount || 0;
        const isWinner = allResponses.every(r => 
          r.supplier_id === response.supplier_id || (r.total_amount || Infinity) >= competitorAmount
        );
        
        if (isWinner && quote.status === 'approved') {
          competitor.won += 1;
        }
      });
    });
    
    const competitorAnalysis = Array.from(competitorMap.values())
      .map(c => ({
        ...c,
        winRate: c.quotes > 0 ? (c.won / c.quotes) * 100 : 0,
        avgPrice: c.quotes > 0 ? c.totalValue / c.quotes : 0
      }))
      .sort((a, b) => b.quotes - a.quotes);
    
    // Performance mensal
    const monthlyMap = new Map();
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      monthlyMap.set(monthKey, {
        month: monthName,
        quotes: 0,
        responses: 0,
        won: 0,
        revenue: 0
      });
    }
    
    quotesData.forEach(quote => {
      const monthKey = quote.created_at.substring(0, 7);
      if (monthlyMap.has(monthKey)) {
        const month = monthlyMap.get(monthKey);
        month.quotes += 1;
        
        const myResponse = quote.quote_responses?.find(r => r.supplier_id === supplierId);
        if (myResponse) {
          month.responses += 1;
          
          const isWon = wonQuotes.some(wq => wq.id === quote.id);
          if (isWon) {
            month.won += 1;
            month.revenue += myResponse.total_amount || 0;
          }
        }
      }
    });
    
    const monthlyPerformance = Array.from(monthlyMap.values());
    
    return {
      totalQuotes,
      totalResponses,
      totalProposed,
      totalWon,
      winRate,
      avgResponseTime,
      avgQuoteValue,
      totalRevenue,
      topClient: clientRanking[0]?.name || 'N/A',
      topProduct: productRanking[0]?.name || 'N/A',
      bestMargin: { product: 'Em desenvolvimento', margin: 0, quote: 'N/A' },
      competitorAnalysis: competitorAnalysis.slice(0, 10),
      clientRanking: clientRanking.slice(0, 10),
      productRanking: productRanking.slice(0, 15),
      monthlyPerformance,
      priceComparison: [], // Implementar se necessário
    };
  };

  return {
    reportData,
    quotes,
    isLoading,
    error,
    generateReport,
  };
};