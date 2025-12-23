-- Profile Enhancements: Bio and Interests
-- Run this SQL in your Supabase SQL Editor

-- Create interests table (predefined interest categories)
CREATE TABLE IF NOT EXISTS public.interest_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default interest categories
INSERT INTO public.interest_categories (name, icon) VALUES
  ('Music', '🎵'),
  ('Sports', '⚽'),
  ('Travel', '✈️'),
  ('Food', '🍕'),
  ('Movies', '🎬'),
  ('Reading', '📚'),
  ('Gaming', '🎮'),
  ('Fitness', '💪'),
  ('Art', '🎨'),
  ('Photography', '📷'),
  ('Cooking', '👨‍🍳'),
  ('Dancing', '💃'),
  ('Fashion', '👗'),
  ('Technology', '💻'),
  ('Nature', '🌿'),
  ('Pets', '🐾'),
  ('Coffee', '☕'),
  ('Wine', '🍷'),
  ('Yoga', '🧘'),
  ('Hiking', '🥾')
ON CONFLICT (name) DO NOTHING;

-- Create user interests junction table
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  interest_id UUID REFERENCES public.interest_categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest_id)
);

-- Enable RLS
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user interests
CREATE POLICY "Users can read all interests" ON public.user_interests
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own interests" ON public.user_interests
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest_id ON public.user_interests(interest_id);

-- Add age and height fields to users table (useful for dating apps)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS looking_for TEXT CHECK (looking_for IN ('friendship', 'dating', 'relationship', 'anything'));

-- Function to get user interests with category details
CREATE OR REPLACE FUNCTION get_user_interests(user_id_param UUID)
RETURNS TABLE (
  interest_id UUID,
  interest_name TEXT,
  interest_icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ic.id,
    ic.name,
    ic.icon
  FROM public.user_interests ui
  INNER JOIN public.interest_categories ic ON ic.id = ui.interest_id
  WHERE ui.user_id = user_id_param
  ORDER BY ic.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add user interest
CREATE OR REPLACE FUNCTION add_user_interest(
  user_id_param UUID,
  interest_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_interests (user_id, interest_id)
  VALUES (user_id_param, interest_id_param)
  ON CONFLICT (user_id, interest_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user interest
CREATE OR REPLACE FUNCTION remove_user_interest(
  user_id_param UUID,
  interest_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.user_interests
  WHERE user_id = user_id_param
    AND interest_id = interest_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find users with common interests
CREATE OR REPLACE FUNCTION find_users_with_common_interests(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  photo_url TEXT,
  bio TEXT,
  common_interests_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.photo_url,
    u.bio,
    COUNT(ui2.interest_id) as common_interests_count
  FROM public.users u
  INNER JOIN public.user_interests ui2 ON ui2.user_id = u.id
  WHERE ui2.interest_id IN (
    SELECT interest_id
    FROM public.user_interests
    WHERE user_id = user_id_param
  )
  AND u.id != user_id_param
  GROUP BY u.id, u.name, u.photo_url, u.bio
  ORDER BY common_interests_count DESC, RANDOM()
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.interest_categories IS 'Predefined interest categories';
COMMENT ON TABLE public.user_interests IS 'User selected interests';
COMMENT ON FUNCTION get_user_interests IS 'Get all interests for a user';
COMMENT ON FUNCTION find_users_with_common_interests IS 'Find users with similar interests';
