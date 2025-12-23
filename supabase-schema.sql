-- MochaLove Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('man', 'woman')),
  name TEXT,
  bio TEXT,
  location TEXT,
  photo_url TEXT,
  coins INTEGER DEFAULT 0 NOT NULL, -- For men
  earnings INTEGER DEFAULT 0 NOT NULL, -- For women (in cents)
  new_user_bonus_claimed BOOLEAN DEFAULT FALSE,
  daily_checkin_streak INTEGER DEFAULT 0,
  last_checkin_date DATE,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'coin_purchase',
    'message_sent',
    'message_received',
    'video_call',
    'gift_sent',
    'gift_received',
    'mini_game',
    'daily_bonus',
    'new_user_bonus'
  )),
  amount INTEGER NOT NULL, -- Coins for men, cents for women
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own matches" ON public.matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = user1_id);

-- Conversations table (tracks message threads between two users)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_from_id UUID REFERENCES public.users(id),
  unread_count_user1 INTEGER DEFAULT 0,
  unread_count_user2 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages table (linked to conversations)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  photo_url TEXT,
  photo_gift_required INTEGER DEFAULT 0, -- Coins required to unlock photo
  photo_unlocked BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages" ON public.messages
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Video calls table
CREATE TABLE public.video_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  total_coins INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'declined')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own video calls" ON public.video_calls
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create video calls" ON public.video_calls
  FOR INSERT WITH CHECK (auth.uid() = caller_id);

-- Gifts table (catalog)
CREATE TABLE public.gift_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  coins INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('micro', 'mid', 'luxury')),
  icon TEXT,
  usd_value INTEGER NOT NULL, -- In cents
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift transactions
CREATE TABLE public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_id UUID REFERENCES public.gift_catalog(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  coins_spent INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gifts" ON public.gift_transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send gifts" ON public.gift_transactions
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, gender, coins, earnings)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'gender', 'man'),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'gender', 'man') = 'man' THEN 50 ELSE 0 END,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default gift catalog
INSERT INTO public.gift_catalog (name, coins, category, icon, usd_value) VALUES
  ('Emoji Sticker', 10, 'micro', '😀', 50),
  ('Virtual Hug', 20, 'micro', '🤗', 100),
  ('Cup of Coffee', 30, 'micro', '☕', 150),
  ('Single Flower', 50, 'micro', '🌸', 250),
  ('Heart Balloon', 75, 'micro', '🎈', 375),
  ('Rose', 100, 'mid', '🌹', 500),
  ('Chocolates', 200, 'mid', '🍫', 1000),
  ('Teddy Bear', 300, 'mid', '🧸', 1500),
  ('Bouquet of Flowers', 500, 'mid', '💐', 2500),
  ('Diamond Ring', 1000, 'mid', '💍', 5000),
  ('Perfume', 1500, 'luxury', '🌺', 7500),
  ('Designer Handbag', 2000, 'luxury', '👜', 10000),
  ('Weekend Getaway', 3000, 'luxury', '✈️', 15000),
  ('Sports Car Key', 5000, 'luxury', '🏎️', 25000),
  ('Crown', 10000, 'luxury', '👑', 50000)
ON CONFLICT DO NOTHING;

-- Daily bonuses table (for daily check-in rewards)
CREATE TABLE public.daily_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  coins_awarded INTEGER NOT NULL,
  streak INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily bonuses" ON public.daily_bonuses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily bonuses" ON public.daily_bonuses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Blocked users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own blocks" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block other users" ON public.blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON public.blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'inappropriate_content',
    'harassment',
    'spam',
    'fake_profile',
    'underage',
    'other'
  )),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Indexes for performance
CREATE INDEX idx_users_gender ON public.users(gender);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_from_user ON public.messages(from_user_id);
CREATE INDEX idx_messages_to_user ON public.messages(to_user_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_matches_user1 ON public.matches(user1_id);
CREATE INDEX idx_matches_user2 ON public.matches(user2_id);
CREATE INDEX idx_daily_bonuses_user_id ON public.daily_bonuses(user_id);
CREATE INDEX idx_daily_bonuses_claimed_at ON public.daily_bonuses(claimed_at DESC);
CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_reported ON public.reports(reported_id);
CREATE INDEX idx_reports_status ON public.reports(status);

-- Function to update conversation metadata when a message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation with the latest message info
  UPDATE public.conversations
  SET
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    last_message_from_id = NEW.from_user_id,
    updated_at = NOW(),
    -- Increment unread count for the recipient
    unread_count_user1 = CASE
      WHEN user1_id = NEW.to_user_id THEN unread_count_user1 + 1
      ELSE unread_count_user1
    END,
    unread_count_user2 = CASE
      WHEN user2_id = NEW.to_user_id THEN unread_count_user2 + 1
      ELSE unread_count_user2
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Function to mark messages as read and reset unread count
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  conversation_id_param UUID,
  user_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  -- Mark all messages in this conversation as read for this user
  UPDATE public.messages
  SET is_read = TRUE
  WHERE conversation_id = conversation_id_param
    AND to_user_id = user_id_param
    AND is_read = FALSE;

  -- Reset unread count for this user in the conversation
  UPDATE public.conversations
  SET
    unread_count_user1 = CASE WHEN user1_id = user_id_param THEN 0 ELSE unread_count_user1 END,
    unread_count_user2 = CASE WHEN user2_id = user_id_param THEN 0 ELSE unread_count_user2 END
  WHERE id = conversation_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user1_param UUID,
  user2_param UUID
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Try to find existing conversation (check both directions)
  SELECT id INTO conversation_id
  FROM public.conversations
  WHERE (user1_id = user1_param AND user2_id = user2_param)
     OR (user1_id = user2_param AND user2_id = user1_param)
  LIMIT 1;

  -- If no conversation exists, create one
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id)
    VALUES (user1_param, user2_param)
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CONVERSATIONS USAGE GUIDE
-- ============================================================
--
-- 1. CREATE OR GET A CONVERSATION:
--    SELECT get_or_create_conversation('user1-uuid', 'user2-uuid');
--
-- 2. SEND A MESSAGE:
--    INSERT INTO messages (conversation_id, from_user_id, to_user_id, content)
--    VALUES ('conversation-uuid', 'sender-uuid', 'recipient-uuid', 'Hello!');
--    (This automatically updates the conversation metadata via trigger)
--
-- 3. GET ALL CONVERSATIONS FOR A USER (sorted by latest):
--    SELECT * FROM conversations
--    WHERE user1_id = 'user-uuid' OR user2_id = 'user-uuid'
--    ORDER BY last_message_at DESC;
--
-- 4. GET MESSAGES IN A CONVERSATION:
--    SELECT * FROM messages
--    WHERE conversation_id = 'conversation-uuid'
--    ORDER BY created_at ASC;
--
-- 5. MARK CONVERSATION AS READ:
--    SELECT mark_conversation_as_read('conversation-uuid', 'user-uuid');
--
-- 6. GET UNREAD COUNT FOR A USER:
--    SELECT
--      CASE
--        WHEN user1_id = 'user-uuid' THEN unread_count_user1
--        ELSE unread_count_user2
--      END as unread_count
--    FROM conversations
--    WHERE id = 'conversation-uuid';
--
-- ============================================================
