-- Gift System RPC Functions
-- These functions handle atomic coin deductions and earnings additions

-- Function to deduct coins from a user
CREATE OR REPLACE FUNCTION deduct_coins(user_id_param UUID, coins_param INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET coins = coins - coins_param
  WHERE id = user_id_param;

  -- Verify the update happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Function to add earnings to a user
CREATE OR REPLACE FUNCTION add_earnings(user_id_param UUID, earnings_param INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET earnings = earnings + earnings_param
  WHERE id = user_id_param;

  -- Verify the update happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;
