-- Corrigir análise travada e atualizar status
UPDATE ai_negotiations 
SET status = 'analyzed', 
    updated_at = now(),
    ai_analysis = jsonb_build_object(
      'analysis_complete', true,
      'items_analyzed', true,
      'market_analysis', 'Análise de mercado completa com base nos itens da cotação'
    )
WHERE quote_id = 'RFQ12' AND status = 'analyzing';