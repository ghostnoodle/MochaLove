-- Additional schema for Stripe payment integration
-- Run this after the main supabase-schema.sql

-- Cash out requests table (for women earning money)
CREATE TABLE IF NOT EXISTS public.cash_out_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL, -- Amount in cents
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer')),
  account_details TEXT, -- Bank account info, PayPal email, etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_transfer_id TEXT, -- Stripe transfer ID if using Stripe Connect
  error_message TEXT, -- Error details if failed
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cash_out_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cash out requests" ON public.cash_out_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create cash out requests" ON public.cash_out_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cash_out_requests_user_id ON public.cash_out_requests(user_id);
CREATE INDEX idx_cash_out_requests_status ON public.cash_out_requests(status);
CREATE INDEX idx_cash_out_requests_created_at ON public.cash_out_requests(created_at DESC);

-- Function to process coin purchase (called after successful Stripe payment)
CREATE OR REPLACE FUNCTION process_coin_purchase(
  p_user_id UUID,
  p_coins INTEGER,
  p_amount_cents INTEGER,
  p_payment_intent_id TEXT,
  p_package_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update user's coin balance
  UPDATE public.users
  SET coins = coins + p_coins
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, description, metadata)
  VALUES (
    p_user_id,
    'coin_purchase',
    p_coins,
    'Purchased ' || p_coins || ' coins',
    jsonb_build_object(
      'package_id', p_package_id,
      'amount_cents', p_amount_cents,
      'payment_intent_id', p_payment_intent_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process cash out (deducts from earnings, creates request)
CREATE OR REPLACE FUNCTION process_cash_out_request(
  p_user_id UUID,
  p_amount_cents INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_current_earnings INTEGER;
  v_request_id UUID;
BEGIN
  -- Get current earnings
  SELECT earnings INTO v_current_earnings
  FROM public.users
  WHERE id = p_user_id;

  -- Check if user has sufficient balance
  IF v_current_earnings < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from user's earnings
  UPDATE public.users
  SET earnings = earnings - p_amount_cents
  WHERE id = p_user_id;

  -- Get the request ID that was just created
  SELECT id INTO v_request_id
  FROM public.cash_out_requests
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, description, metadata)
  VALUES (
    p_user_id,
    'cash_out',
    -p_amount_cents,
    'Cash out request: $' || (p_amount_cents::float / 100)::text,
    jsonb_build_object(
      'request_id', v_request_id,
      'amount_cents', p_amount_cents
    )
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for cash_out_requests updated_at
CREATE TRIGGER update_cash_out_requests_updated_at
  BEFORE UPDATE ON public.cash_out_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- USAGE GUIDE
-- ============================================================
--
-- 1. PROCESS COIN PURCHASE (called from Supabase Edge Function):
--    SELECT process_coin_purchase(
--      'user-uuid',      -- user_id
--      100,              -- coins purchased
--      999,              -- amount paid in cents ($9.99)
--      'pi_xxx',         -- Stripe payment intent ID
--      'standard'        -- package ID
--    );
--
-- 2. CREATE CASH OUT REQUEST:
--    First insert the request:
--    INSERT INTO cash_out_requests (user_id, amount_cents, payment_method, account_details)
--    VALUES ('user-uuid', 5000, 'stripe', 'account-details');
--
--    Then process it:
--    SELECT process_cash_out_request('user-uuid', 5000);
--
-- 3. UPDATE CASH OUT STATUS (done by admin/Edge Function):
--    UPDATE cash_out_requests
--    SET status = 'completed',
--        processed_at = NOW(),
--        stripe_transfer_id = 'tr_xxx'
--    WHERE id = 'request-uuid';
--
-- ============================================================
