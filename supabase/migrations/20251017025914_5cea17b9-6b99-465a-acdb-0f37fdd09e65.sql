-- Fase 1: Expansão do controle de estoque (correção)

-- 1. Adicionar novos campos à tabela products para controle avançado
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS batch_control boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expiry_tracking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location_tracking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS min_stock_level numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_point numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_quantity numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS suggested_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS market_price_avg numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS competitor_price_min numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS competitor_price_max numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_ai_analysis_at timestamp with time zone;

-- 2. Criar tabela para controle de lotes
CREATE TABLE IF NOT EXISTS public.product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  manufacturing_date date,
  expiry_date date,
  cost_per_unit numeric DEFAULT 0,
  location text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'recalled', 'sold_out')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_batches_quantity_check CHECK (quantity >= 0)
);

-- Índices para product_batches
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_supplier_id ON public.product_batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON public.product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_status ON public.product_batches(status);

-- 3. Criar tabela para múltiplas localizações de estoque
CREATE TABLE IF NOT EXISTS public.product_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  location_code text,
  quantity numeric DEFAULT 0 CHECK (quantity >= 0),
  min_stock numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_id, location_code)
);

-- Índices para product_locations
CREATE INDEX IF NOT EXISTS idx_product_locations_product_id ON public.product_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_locations_supplier_id ON public.product_locations(supplier_id);

-- 4. Criar tabela para alertas inteligentes de estoque
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'expired', 'reorder', 'overstock')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_at timestamp with time zone,
  acknowledged_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para stock_alerts
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON public.stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_supplier_id ON public.stock_alerts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON public.stock_alerts(status);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_alert_type ON public.stock_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_severity ON public.stock_alerts(severity);

-- Triggers para updated_at (com DROP IF EXISTS)
DROP TRIGGER IF EXISTS trg_product_batches_updated_at ON public.product_batches;
DROP FUNCTION IF EXISTS public.update_product_batches_updated_at();

CREATE OR REPLACE FUNCTION public.update_product_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_product_batches_updated_at
  BEFORE UPDATE ON public.product_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_batches_updated_at();

DROP TRIGGER IF EXISTS trg_product_locations_updated_at ON public.product_locations;
DROP FUNCTION IF EXISTS public.update_product_locations_updated_at();

CREATE OR REPLACE FUNCTION public.update_product_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_product_locations_updated_at
  BEFORE UPDATE ON public.product_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_locations_updated_at();

-- RLS Policies para product_batches
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_batches_supplier_select ON public.product_batches;
CREATE POLICY product_batches_supplier_select ON public.product_batches
  FOR SELECT USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS product_batches_supplier_insert ON public.product_batches;
CREATE POLICY product_batches_supplier_insert ON public.product_batches
  FOR INSERT WITH CHECK (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS product_batches_supplier_update ON public.product_batches;
CREATE POLICY product_batches_supplier_update ON public.product_batches
  FOR UPDATE USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS product_batches_supplier_delete ON public.product_batches;
CREATE POLICY product_batches_supplier_delete ON public.product_batches
  FOR DELETE USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

-- RLS Policies para product_locations
ALTER TABLE public.product_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_locations_supplier_select ON public.product_locations;
CREATE POLICY product_locations_supplier_select ON public.product_locations
  FOR SELECT USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS product_locations_supplier_insert ON public.product_locations;
CREATE POLICY product_locations_supplier_insert ON public.product_locations
  FOR INSERT WITH CHECK (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS product_locations_supplier_update ON public.product_locations;
CREATE POLICY product_locations_supplier_update ON public.product_locations
  FOR UPDATE USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS product_locations_supplier_delete ON public.product_locations;
CREATE POLICY product_locations_supplier_delete ON public.product_locations
  FOR DELETE USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

-- RLS Policies para stock_alerts
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_alerts_supplier_select ON public.stock_alerts;
CREATE POLICY stock_alerts_supplier_select ON public.stock_alerts
  FOR SELECT USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS stock_alerts_supplier_insert ON public.stock_alerts;
CREATE POLICY stock_alerts_supplier_insert ON public.stock_alerts
  FOR INSERT WITH CHECK (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS stock_alerts_supplier_update ON public.stock_alerts;
CREATE POLICY stock_alerts_supplier_update ON public.stock_alerts
  FOR UPDATE USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS stock_alerts_supplier_delete ON public.stock_alerts;
CREATE POLICY stock_alerts_supplier_delete ON public.stock_alerts
  FOR DELETE USING (supplier_id = get_current_user_supplier_id() OR get_user_role() = 'admin');