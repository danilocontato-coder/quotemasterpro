-- Create quote tokens table for short link management
CREATE TABLE IF NOT EXISTS public.quote_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  full_token UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.quote_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for quote_tokens
CREATE POLICY "quote_tokens_admin" ON public.quote_tokens
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "quote_tokens_select_by_quote" ON public.quote_tokens
  FOR SELECT USING (
    get_user_role() = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_tokens.quote_id 
      AND q.client_id IN (
        SELECT profiles.client_id FROM public.profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "quote_tokens_insert_by_client" ON public.quote_tokens
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_tokens.quote_id 
      AND q.client_id IN (
        SELECT profiles.client_id FROM public.profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

-- Create index for fast short_code lookups
CREATE INDEX IF NOT EXISTS idx_quote_tokens_short_code ON public.quote_tokens(short_code);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_quote_id ON public.quote_tokens(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_expires_at ON public.quote_tokens(expires_at);