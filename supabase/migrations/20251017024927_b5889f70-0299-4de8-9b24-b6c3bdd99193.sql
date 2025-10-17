-- Drop existing function if exists
DROP FUNCTION IF EXISTS approve_offline_payment(text, boolean, text);

-- Create function to approve/reject offline payments
CREATE OR REPLACE FUNCTION approve_offline_payment(
  p_payment_id TEXT,
  p_approved BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_quote_id TEXT;
  v_result JSONB;
BEGIN
  -- Get payment info
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  
  -- Check if user is the supplier
  IF v_payment.supplier_id != get_current_user_supplier_id() THEN
    RAISE EXCEPTION 'Not authorized to confirm this payment';
  END IF;
  
  -- Check if payment is in correct status
  IF v_payment.status != 'manual_confirmation' THEN
    RAISE EXCEPTION 'Payment is not awaiting confirmation';
  END IF;
  
  v_quote_id := v_payment.quote_id;
  
  IF p_approved THEN
    -- Approve payment: change status to in_escrow
    UPDATE payments
    SET 
      status = 'in_escrow',
      review_notes = p_notes,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- Create audit log
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      auth.uid(),
      'OFFLINE_PAYMENT_APPROVED',
      'payments',
      p_payment_id,
      'supplier',
      jsonb_build_object(
        'payment_id', p_payment_id,
        'quote_id', v_quote_id,
        'notes', p_notes
      )
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'status', 'in_escrow',
      'message', 'Payment approved successfully'
    );
  ELSE
    -- Reject payment: change status back to pending
    UPDATE payments
    SET 
      status = 'pending',
      review_notes = p_notes,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      payment_method = NULL,
      transaction_id = NULL,
      offline_notes = NULL,
      offline_attachments = NULL,
      updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- Create audit log
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      panel_type,
      details
    ) VALUES (
      auth.uid(),
      'OFFLINE_PAYMENT_REJECTED',
      'payments',
      p_payment_id,
      'supplier',
      jsonb_build_object(
        'payment_id', p_payment_id,
        'quote_id', v_quote_id,
        'notes', p_notes
      )
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'status', 'pending',
      'message', 'Payment rejected'
    );
  END IF;
  
  RETURN v_result;
END;
$$;