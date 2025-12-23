-- Favorites and Match Queue Feature
-- Run this SQL in your Supabase SQL Editor

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  favorited_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, favorited_user_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_favorited_user_id ON public.favorites(favorited_user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON public.favorites(created_at DESC);

-- Create profile_views table (to track who viewed your profile)
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  viewed_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_user_id, created_at::date) -- One view per day per user
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile views
CREATE POLICY "Users can view who viewed them" ON public.profile_views
  FOR SELECT USING (auth.uid() = viewed_user_id);

CREATE POLICY "Users can record views" ON public.profile_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON public.profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_user ON public.profile_views(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON public.profile_views(created_at DESC);

-- Function to get mutual favorites (people who favorited each other)
CREATE OR REPLACE FUNCTION get_mutual_favorites(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.photo_url,
    u.bio,
    f.created_at
  FROM public.favorites f
  INNER JOIN public.users u ON u.id = f.favorited_user_id
  WHERE f.user_id = user_id_param
    AND EXISTS (
      SELECT 1
      FROM public.favorites f2
      WHERE f2.user_id = f.favorited_user_id
        AND f2.favorited_user_id = user_id_param
    )
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users have mutually favorited each other
CREATE OR REPLACE FUNCTION is_mutual_favorite(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.favorites
    WHERE user_id = user1_id AND favorited_user_id = user2_id
  ) AND EXISTS (
    SELECT 1 FROM public.favorites
    WHERE user_id = user2_id AND favorited_user_id = user1_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get "who liked you" (people who favorited you but you haven't favorited back)
CREATE OR REPLACE FUNCTION get_who_liked_you(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.photo_url,
    u.bio,
    f.created_at
  FROM public.favorites f
  INNER JOIN public.users u ON u.id = f.user_id
  WHERE f.favorited_user_id = user_id_param
    AND NOT EXISTS (
      SELECT 1
      FROM public.favorites f2
      WHERE f2.user_id = user_id_param
        AND f2.favorited_user_id = f.user_id
    )
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.favorites IS 'Stores user favorites (likes/swipes right)';
COMMENT ON TABLE public.profile_views IS 'Tracks profile views for "who viewed you" feature';
COMMENT ON FUNCTION get_mutual_favorites IS 'Returns users who mutually favorited each other';
COMMENT ON FUNCTION get_who_liked_you IS 'Returns users who favorited you but you haven''t favorited back';
