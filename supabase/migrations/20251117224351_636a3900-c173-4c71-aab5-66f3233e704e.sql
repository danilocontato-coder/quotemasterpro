-- Tornar delivery_address nullable para permitir placeholders sem endereço
ALTER TABLE public.deliveries 
ALTER COLUMN delivery_address DROP NOT NULL;

-- Atualizar placeholders existentes que têm string vazia para NULL
UPDATE public.deliveries 
SET delivery_address = NULL 
WHERE delivery_address = '' AND status = 'pending';