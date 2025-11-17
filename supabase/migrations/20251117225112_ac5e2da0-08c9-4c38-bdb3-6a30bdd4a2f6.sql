-- Modificar a função do trigger para não falhar quando variáveis não estão configuradas
CREATE OR REPLACE FUNCTION public.create_delivery_confirmation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_qr_svg TEXT;
BEGIN
  -- Gerar código de confirmação de 6 dígitos
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Tentar obter as variáveis de configuração de forma segura
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_role_key := current_setting('app.service_role_key', true);
  EXCEPTION
    WHEN undefined_object THEN
      RAISE WARNING 'Variáveis app.supabase_url ou app.service_role_key não configuradas. QR code não será gerado.';
      v_supabase_url := NULL;
      v_service_role_key := NULL;
  END;
  
  -- Se as variáveis estiverem configuradas, tentar gerar o QR code
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    BEGIN
      -- Gerar QR code SVG via função remota
      SELECT content::json->>'svg' INTO v_qr_svg
      FROM http((
        'POST',
        v_supabase_url || '/functions/v1/generate-qr',
        ARRAY[
          http_header('Authorization', 'Bearer ' || v_service_role_key),
          http_header('Content-Type', 'application/json')
        ],
        'application/json',
        json_build_object(
          'data', json_build_object(
            'deliveryId', NEW.id,
            'code', v_code
          )
        )::text
      ));
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao gerar QR code para delivery %: %', NEW.id, SQLERRM;
        v_qr_svg := NULL;
    END;
  END IF;
  
  -- Inserir registro de confirmação (com ou sem QR code)
  INSERT INTO public.delivery_confirmations (
    delivery_id,
    confirmation_code,
    generated_at,
    expires_at
  ) VALUES (
    NEW.id,
    v_code,
    NOW(),
    NOW() + INTERVAL '7 days'
  );
  
  RETURN NEW;
END;
$$;