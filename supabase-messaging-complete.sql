-- Complete SQL for Real-time Messaging System
-- Copy ALL of this and run in your Supabase SQL Editor

-- ============================================
-- STEP 1: Enable Realtime on Tables
-- ============================================
-- This allows messages to appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- ============================================
-- STEP 2: Add balance column for women's earnings
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'balance'
  ) THEN
    ALTER TABLE public.users ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00;
    COMMENT ON COLUMN public.users.balance IS 'Women earnings in USD (dollars.cents)';
  END IF;
END $$;

-- ============================================
-- STEP 3: Trigger to Update Conversation on New Message
-- ============================================
-- This automatically updates the conversation's last message info
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation with the latest message info
  UPDATE public.conversations
  SET
    last_message = COALESCE(NEW.content, '📷 Photo'),
    last_message_at = NEW.created_at,
    last_message_from_id = NEW.from_user_id,
    updated_at = NOW(),
    -- Increment unread count for recipient
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;

-- Create trigger on messages insert
CREATE TRIGGER on_message_sent
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- STEP 4: Function to Reset Unread Count
-- ============================================
-- Called when user opens a chat
CREATE OR REPLACE FUNCTION reset_unread_count(
  conversation_uuid UUID,
  user_uuid UUID
)
RETURNS void AS $$
BEGIN
  UPDATE public.conversations
  SET
    unread_count_user1 = CASE WHEN user1_id = user_uuid THEN 0 ELSE unread_count_user1 END,
    unread_count_user2 = CASE WHEN user2_id = user_uuid THEN 0 ELSE unread_count_user2 END,
    updated_at = NOW()
  WHERE id = conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Ensure Discovery Policy Exists
-- ============================================
-- Allows users to view other profiles in Discover
DROP POLICY IF EXISTS "Users can view other profiles for discovery" ON public.users;
CREATE POLICY "Users can view other profiles for discovery"
ON public.users
FOR SELECT
USING (profile_completed = true);

-- ============================================
-- STEP 6: Add Indexes for Performance
-- ============================================
-- Speed up message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON public.messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON public.messages(to_user_id);

-- Speed up conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id, last_message_at DESC);

-- Speed up matches queries
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches(user1_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches(user2_id, created_at DESC);

-- ============================================
-- DONE! Your messaging system is now ready! ✅
-- ============================================

-- To test:
-- 1. Like a profile in the Discover tab
-- 2. Go to Messages tab → Tap "Matches" button
-- 3. Tap a match to open the chat
-- 4. Send a message and watch it appear instantly! 💬
-- 5. The other user will see it in real-time too
