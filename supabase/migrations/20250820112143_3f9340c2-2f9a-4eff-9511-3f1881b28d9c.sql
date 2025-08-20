-- Fix security issues and add missing policies

-- 1) Fix function search paths
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Add missing policies for quote_responses and payments

-- Quote responses - missing policies
DROP POLICY IF EXISTS "quote_responses_insert" ON quote_responses;
CREATE POLICY "quote_responses_insert" ON quote_responses FOR INSERT TO authenticated WITH CHECK (
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "quote_responses_update" ON quote_responses;
CREATE POLICY "quote_responses_update" ON quote_responses FOR UPDATE TO authenticated USING (
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "quote_responses_admin" ON quote_responses;
CREATE POLICY "quote_responses_admin" ON quote_responses FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Payments - missing policies
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated WITH CHECK (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid())
);

-- Products - add missing policies
DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated WITH CHECK (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated USING (
  get_user_role() = 'admin' OR
  client_id IN (SELECT client_id FROM profiles WHERE id = auth.uid()) OR
  supplier_id IN (SELECT supplier_id FROM profiles WHERE id = auth.uid())
);

-- Audit logs - add insert policy
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Notifications - add insert policy
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true); -- System can create notifications