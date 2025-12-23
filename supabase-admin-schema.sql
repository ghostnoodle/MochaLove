-- Admin Dashboard Schema
-- Run this SQL in your Supabase SQL Editor

-- Add admin role to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN DEFAULT FALSE;

-- Create admin_actions table (audit log for admin actions)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'ban_user',
    'unban_user',
    'approve_profile',
    'reject_profile',
    'delete_content',
    'resolve_report',
    'dismiss_report',
    'update_user',
    'grant_admin',
    'revoke_admin'
  )),
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin actions
CREATE POLICY "Admins can view admin actions" ON public.admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Only admins can create admin actions
CREATE POLICY "Admins can create admin actions" ON public.admin_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Add banned status to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'active' CHECK (profile_status IN ('active', 'pending', 'suspended', 'deleted'));

-- Update reports table to add status tracking
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Add policy for admins to view all reports
CREATE POLICY "Admins can view all reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.is_admin = TRUE OR users.is_moderator = TRUE)
    )
  );

-- Add policy for admins to update reports
CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.is_admin = TRUE OR users.is_moderator = TRUE)
    )
  );

-- Create indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned) WHERE is_banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_profile_status ON public.users(profile_status);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);

-- Function to get admin dashboard statistics
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.users),
    'active_users', (SELECT COUNT(*) FROM public.users WHERE profile_status = 'active' AND is_banned = FALSE),
    'banned_users', (SELECT COUNT(*) FROM public.users WHERE is_banned = TRUE),
    'pending_profiles', (SELECT COUNT(*) FROM public.users WHERE profile_status = 'pending'),
    'total_men', (SELECT COUNT(*) FROM public.users WHERE gender = 'man'),
    'total_women', (SELECT COUNT(*) FROM public.users WHERE gender = 'woman'),
    'pending_reports', (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
    'total_transactions', (SELECT COUNT(*) FROM public.transactions),
    'total_revenue_cents', (SELECT COALESCE(SUM(amount), 0) FROM public.transactions WHERE type = 'coin_purchase'),
    'total_messages', (SELECT COUNT(*) FROM public.messages),
    'total_matches', (SELECT COUNT(*) FROM public.matches),
    'total_gifts_sent', (SELECT COUNT(*) FROM public.gift_transactions),
    'active_conversations', (SELECT COUNT(DISTINCT conversation_id) FROM public.messages WHERE created_at > NOW() - INTERVAL '7 days')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban a user
CREATE OR REPLACE FUNCTION admin_ban_user(
  admin_user_id UUID,
  target_user_id UUID,
  ban_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_user_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  -- Ban the user
  UPDATE public.users
  SET is_banned = TRUE,
      banned_at = NOW(),
      banned_reason = ban_reason,
      profile_status = 'suspended'
  WHERE id = target_user_id;

  -- Log the action
  INSERT INTO public.admin_actions (admin_id, action_type, target_user_id, reason)
  VALUES (admin_user_id, 'ban_user', target_user_id, ban_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user
CREATE OR REPLACE FUNCTION admin_unban_user(
  admin_user_id UUID,
  target_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_user_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  -- Unban the user
  UPDATE public.users
  SET is_banned = FALSE,
      banned_at = NULL,
      banned_reason = NULL,
      profile_status = 'active'
  WHERE id = target_user_id;

  -- Log the action
  INSERT INTO public.admin_actions (admin_id, action_type, target_user_id)
  VALUES (admin_user_id, 'unban_user', target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update report status
CREATE OR REPLACE FUNCTION admin_update_report(
  admin_user_id UUID,
  report_id UUID,
  new_status TEXT,
  resolution_notes TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Check if admin or moderator
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_user_id AND (is_admin = TRUE OR is_moderator = TRUE)) THEN
    RAISE EXCEPTION 'User is not an admin or moderator';
  END IF;

  -- Update the report
  UPDATE public.reports
  SET status = new_status,
      reviewed_by = admin_user_id,
      reviewed_at = NOW(),
      resolution_notes = resolution_notes
  WHERE id = report_id;

  -- Log the action
  INSERT INTO public.admin_actions (admin_id, action_type, metadata)
  VALUES (admin_user_id, 'resolve_report', json_build_object('report_id', report_id, 'status', new_status));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue analytics (last 30 days)
CREATE OR REPLACE FUNCTION get_revenue_analytics()
RETURNS TABLE (
  date DATE,
  revenue_cents BIGINT,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    SUM(amount) as revenue_cents,
    COUNT(*) as transaction_count
  FROM public.transactions
  WHERE type = 'coin_purchase'
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user growth analytics (last 30 days)
CREATE OR REPLACE FUNCTION get_user_growth_analytics()
RETURNS TABLE (
  date DATE,
  new_users BIGINT,
  new_men BIGINT,
  new_women BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*) as new_users,
    COUNT(*) FILTER (WHERE gender = 'man') as new_men,
    COUNT(*) FILTER (WHERE gender = 'woman') as new_women
  FROM public.users
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.admin_actions IS 'Audit log for all admin actions';
COMMENT ON FUNCTION get_admin_stats IS 'Get comprehensive admin dashboard statistics';
COMMENT ON FUNCTION admin_ban_user IS 'Ban a user (admin only)';
COMMENT ON FUNCTION admin_unban_user IS 'Unban a user (admin only)';
COMMENT ON FUNCTION get_revenue_analytics IS 'Get daily revenue for last 30 days';
COMMENT ON FUNCTION get_user_growth_analytics IS 'Get daily user signups for last 30 days';
