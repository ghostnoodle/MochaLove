-- Purchase Promotions System
-- Run this SQL in your Supabase SQL Editor

-- Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN (
    'bonus_coins',
    'discount_percentage',
    'discount_fixed',
    'first_purchase',
    'special_event'
  )),

  -- Promotion value
  bonus_percentage INTEGER, -- For bonus coins (e.g., 50 = 50% extra)
  discount_percentage INTEGER, -- For percentage discount (e.g., 20 = 20% off)
  discount_amount_cents INTEGER, -- For fixed discount

  -- Validity
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  -- Applicable products (NULL = all packages)
  applicable_package_ids TEXT[], -- Array of package IDs this applies to

  -- First purchase only
  first_purchase_only BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can read active promotions
CREATE POLICY "Users can read active promotions" ON public.promotions
  FOR SELECT USING (
    is_active = TRUE
    AND start_date <= NOW()
    AND end_date >= NOW()
  );

-- Create promotion_uses table to track user usage
CREATE TABLE IF NOT EXISTS public.promotion_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  discount_amount_cents INTEGER NOT NULL,
  bonus_coins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promotion_id, user_id) -- One use per user by default, unless promotion allows more
);

-- Enable RLS
ALTER TABLE public.promotion_uses ENABLE ROW LEVEL SECURITY;

-- Users can read their own promotion uses
CREATE POLICY "Users can read own promotion uses" ON public.promotion_uses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own promotion uses
CREATE POLICY "Users can insert own promotion uses" ON public.promotion_uses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON public.promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON public.promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotion_uses_user ON public.promotion_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_uses_promotion ON public.promotion_uses(promotion_id);

-- Function to get active promotions for a user
CREATE OR REPLACE FUNCTION get_active_promotions_for_user(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  title TEXT,
  description TEXT,
  promotion_type TEXT,
  bonus_percentage INTEGER,
  discount_percentage INTEGER,
  discount_amount_cents INTEGER,
  end_date TIMESTAMPTZ,
  max_uses_per_user INTEGER,
  user_uses_count BIGINT,
  can_use BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.code,
    p.title,
    p.description,
    p.promotion_type,
    p.bonus_percentage,
    p.discount_percentage,
    p.discount_amount_cents,
    p.end_date,
    p.max_uses_per_user,
    COALESCE(COUNT(pu.id), 0) AS user_uses_count,
    (
      p.is_active = TRUE
      AND p.start_date <= NOW()
      AND p.end_date >= NOW()
      AND (p.max_uses IS NULL OR p.current_uses < p.max_uses)
      AND (COALESCE(COUNT(pu.id), 0) < p.max_uses_per_user)
      AND (
        p.first_purchase_only = FALSE
        OR NOT EXISTS (
          SELECT 1 FROM public.transactions
          WHERE user_id = user_id_param
            AND type = 'coin_purchase'
        )
      )
    ) AS can_use
  FROM public.promotions p
  LEFT JOIN public.promotion_uses pu ON pu.promotion_id = p.id AND pu.user_id = user_id_param
  WHERE p.is_active = TRUE
    AND p.start_date <= NOW()
    AND p.end_date >= NOW()
  GROUP BY p.id
  ORDER BY p.end_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and apply a promotion code
CREATE OR REPLACE FUNCTION validate_promotion_code(
  promo_code TEXT,
  user_id_param UUID,
  package_id_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  promo RECORD;
  user_uses_count INTEGER;
  has_purchased BOOLEAN;
  result JSON;
BEGIN
  -- Get promotion
  SELECT * INTO promo
  FROM public.promotions
  WHERE code = promo_code
    AND is_active = TRUE
    AND start_date <= NOW()
    AND end_date >= NOW();

  -- Check if promotion exists
  IF promo IS NULL THEN
    RETURN json_build_object('valid', FALSE, 'error', 'Invalid or expired promotion code');
  END IF;

  -- Check max uses
  IF promo.max_uses IS NOT NULL AND promo.current_uses >= promo.max_uses THEN
    RETURN json_build_object('valid', FALSE, 'error', 'This promotion has reached its usage limit');
  END IF;

  -- Check user uses
  SELECT COUNT(*) INTO user_uses_count
  FROM public.promotion_uses
  WHERE promotion_id = promo.id
    AND user_id = user_id_param;

  IF user_uses_count >= promo.max_uses_per_user THEN
    RETURN json_build_object('valid', FALSE, 'error', 'You have already used this promotion');
  END IF;

  -- Check first purchase requirement
  IF promo.first_purchase_only THEN
    SELECT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = user_id_param
        AND type = 'coin_purchase'
    ) INTO has_purchased;

    IF has_purchased THEN
      RETURN json_build_object('valid', FALSE, 'error', 'This promotion is only for first-time purchases');
    END IF;
  END IF;

  -- Check package applicability
  IF promo.applicable_package_ids IS NOT NULL
     AND package_id_param IS NOT NULL
     AND NOT (package_id_param = ANY(promo.applicable_package_ids)) THEN
    RETURN json_build_object('valid', FALSE, 'error', 'This promotion is not applicable to the selected package');
  END IF;

  -- Return valid promotion details
  RETURN json_build_object(
    'valid', TRUE,
    'promotion_id', promo.id,
    'title', promo.title,
    'promotion_type', promo.promotion_type,
    'bonus_percentage', promo.bonus_percentage,
    'discount_percentage', promo.discount_percentage,
    'discount_amount_cents', promo.discount_amount_cents
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record promotion use
CREATE OR REPLACE FUNCTION record_promotion_use(
  promotion_id_param UUID,
  user_id_param UUID,
  transaction_id_param UUID,
  discount_amount_cents_param INTEGER,
  bonus_coins_param INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  -- Insert promotion use
  INSERT INTO public.promotion_uses (
    promotion_id,
    user_id,
    transaction_id,
    discount_amount_cents,
    bonus_coins
  ) VALUES (
    promotion_id_param,
    user_id_param,
    transaction_id_param,
    discount_amount_cents_param,
    bonus_coins_param
  );

  -- Increment current uses
  UPDATE public.promotions
  SET current_uses = current_uses + 1
  WHERE id = promotion_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample promotions
INSERT INTO public.promotions (
  code,
  title,
  description,
  promotion_type,
  bonus_percentage,
  start_date,
  end_date,
  max_uses_per_user,
  first_purchase_only
) VALUES
  (
    'WELCOME50',
    '🎉 Welcome Bonus',
    'Get 50% extra coins on your first purchase!',
    'bonus_coins',
    50,
    NOW(),
    NOW() + INTERVAL '30 days',
    1,
    TRUE
  ),
  (
    'MOCHA20',
    '☕ Coffee Time',
    'Save 20% on all coin packages',
    'discount_percentage',
    20,
    NOW(),
    NOW() + INTERVAL '7 days',
    3,
    FALSE
  ),
  (
    'WEEKEND100',
    '🎊 Weekend Special',
    'Double your coins this weekend!',
    'bonus_coins',
    100,
    NOW(),
    NOW() + INTERVAL '2 days',
    1,
    FALSE
  )
ON CONFLICT (code) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_promotion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promotion_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION update_promotion_updated_at();

COMMENT ON TABLE public.promotions IS 'Promotional offers for coin purchases';
COMMENT ON TABLE public.promotion_uses IS 'Tracks user usage of promotions';
COMMENT ON FUNCTION get_active_promotions_for_user IS 'Returns active promotions available to a specific user';
COMMENT ON FUNCTION validate_promotion_code IS 'Validates if a promotion code can be used by a user';
COMMENT ON FUNCTION record_promotion_use IS 'Records that a user has used a promotion';
