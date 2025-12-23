-- Gift Reply System Migration
-- Adds support for reply-to-claim gifts with 24-hour expiration

-- Add new columns to gift_transactions table
ALTER TABLE public.gift_transactions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'claimed', 'expired')),
ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS earnings_cents INTEGER DEFAULT 0;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_gift_transactions_status
  ON public.gift_transactions(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_gift_transactions_receiver_status
  ON public.gift_transactions(receiver_id, status);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_expires_at
  ON public.gift_transactions(expires_at) WHERE expires_at IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_gift_transactions_message_id
  ON public.gift_transactions(message_id);

-- Add comments explaining the new fields
COMMENT ON COLUMN public.gift_transactions.status IS 'Gift claim status: pending (awaiting reply), claimed (reply sent), expired (24h passed)';
COMMENT ON COLUMN public.gift_transactions.message_id IS 'The gift message sent to chat';
COMMENT ON COLUMN public.gift_transactions.reply_message_id IS 'The reply message that claimed the gift';
COMMENT ON COLUMN public.gift_transactions.expires_at IS 'When the gift expires (24h after creation)';
COMMENT ON COLUMN public.gift_transactions.earnings_cents IS 'Amount earned by receiver (50% of coins_spent * $0.05)';

-- Function to claim a gift (called when woman replies)
CREATE OR REPLACE FUNCTION claim_gift_on_reply(
  p_gift_transaction_id UUID,
  p_reply_message_id UUID,
  p_receiver_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_gift_transaction record;
  v_earnings_cents INTEGER;
  v_result JSONB;
BEGIN
  -- Get the gift transaction with row lock
  SELECT * INTO v_gift_transaction
  FROM public.gift_transactions
  WHERE id = p_gift_transaction_id
    AND receiver_id = p_receiver_id
    AND status = 'pending'
  FOR UPDATE;

  -- Check if gift exists and is claimable
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gift not found, already claimed, or expired'
    );
  END IF;

  -- Check if expired
  IF v_gift_transaction.expires_at < NOW() THEN
    -- Mark as expired
    UPDATE public.gift_transactions
    SET status = 'expired'
    WHERE id = p_gift_transaction_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gift has expired'
    );
  END IF;

  -- Calculate earnings (50% of coin value)
  v_earnings_cents := ROUND((v_gift_transaction.coins_spent / 2.0) * 5); -- $0.05 per coin

  -- Update gift transaction status
  UPDATE public.gift_transactions
  SET
    status = 'claimed',
    reply_message_id = p_reply_message_id,
    claimed_at = NOW(),
    earnings_cents = v_earnings_cents
  WHERE id = p_gift_transaction_id;

  -- Add earnings to receiver's account
  UPDATE public.users
  SET earnings = earnings + v_earnings_cents
  WHERE id = p_receiver_id;

  -- Record transaction for receiver
  INSERT INTO public.transactions (user_id, type, amount, description, metadata)
  VALUES (
    p_receiver_id,
    'gift_received',
    v_earnings_cents,
    'Claimed gift by replying',
    jsonb_build_object(
      'gift_transaction_id', p_gift_transaction_id,
      'reply_message_id', p_reply_message_id,
      'coins_equivalent', v_gift_transaction.coins_spent / 2.0
    )
  );

  -- Return success with earnings info
  RETURN jsonb_build_object(
    'success', true,
    'earnings_cents', v_earnings_cents,
    'earnings_dollars', v_earnings_cents::float / 100
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire gifts past 24 hours
CREATE OR REPLACE FUNCTION expire_old_gifts()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.gift_transactions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to function
COMMENT ON FUNCTION claim_gift_on_reply IS 'Claims a pending gift when the receiver replies to the gift message';
COMMENT ON FUNCTION expire_old_gifts IS 'Expires all pending gifts past their 24-hour expiration time';
