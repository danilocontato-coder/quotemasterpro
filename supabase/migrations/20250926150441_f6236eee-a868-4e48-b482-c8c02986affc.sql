-- Allow supplier_id to be null in products table for client-created products
ALTER TABLE public.products ALTER COLUMN supplier_id DROP NOT NULL;