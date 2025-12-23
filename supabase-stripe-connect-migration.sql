-- Stripe Connect Integration Migration
-- Run this in your Supabase SQL Editor to add Stripe Connect support

-- Add Stripe Connect fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Add payout tracking fields to cash_out_requests table
ALTER TABLE public.cash_out_requests
ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Update status to support more states
-- Status values: pending, approved, processing, completed, failed, rejected
COMMENT ON COLUMN public.cash_out_requests.status IS
  'Status: pending (awaiting approval), approved (admin approved), processing (payout initiated), completed (payout successful), failed (payout failed), rejected (admin rejected)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect_account_id
  ON public.users(stripe_connect_account_id);

-- Create indexes for cash out request filtering
CREATE INDEX IF NOT EXISTS idx_cash_out_requests_approved_at
  ON public.cash_out_requests(approved_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_out_requests_stripe_payout_id
  ON public.cash_out_requests(stripe_payout_id);

-- Function to update cash out request status
CREATE OR REPLACE FUNCTION update_cash_out_status(
  p_request_id UUID,
  p_status TEXT,
  p_stripe_payout_id TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL,
  p_approved_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.cash_out_requests
  SET
    status = p_status,
    stripe_payout_id = COALESCE(p_stripe_payout_id, stripe_payout_id),
    failure_reason = COALESCE(p_failure_reason, failure_reason),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    approved_by = COALESCE(p_approved_by, approved_by),
    approved_at = CASE
      WHEN p_status = 'approved' AND approved_at IS NULL THEN NOW()
      ELSE approved_at
    END,
    processed_at = CASE
      WHEN p_status IN ('completed', 'failed') AND processed_at IS NULL THEN NOW()
      ELSE processed_at
    END,
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_cash_out_status TO authenticated;

-- Update RLS policies for admin access
CREATE POLICY "Admins can read all cash out requests" ON public.cash_out_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update cash out requests" ON public.cash_out_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW admin_cash_out_requests_view AS
SELECT
  cor.id,
  cor.user_id,
  cor.amount_cents,
  cor.payment_method,
  cor.status,
  cor.stripe_payout_id,
  cor.failure_reason,
  cor.admin_notes,
  cor.approved_by,
  cor.approved_at,
  cor.created_at,
  cor.processed_at,
  u.email as user_email,
  u.display_name as user_name,
  u.earnings as user_total_earnings,
  approver.email as approved_by_email
FROM public.cash_out_requests cor
LEFT JOIN public.users u ON cor.user_id = u.id
LEFT JOIN public.users approver ON cor.approved_by = approver.id
ORDER BY cor.created_at DESC;

-- Grant access to admin view
GRANT SELECT ON admin_cash_out_requests_view TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Admins can view cash out requests" ON admin_cash_out_requests_view
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

COMMENT ON TABLE public.users IS 'User profiles with Stripe Connect integration';
COMMENT ON TABLE public.cash_out_requests IS 'Cash-out requests with admin approval workflow';
COMMENT ON VIEW admin_cash_out_requests_view IS 'Admin view of all cash-out requests with user details';
