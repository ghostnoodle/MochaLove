-- Additional SQL for Real-time Messaging
-- Copy and run this in your Supabase SQL Editor

-- 1. Enable Realtime on tables
-- This allows real-time subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- 2. Create function to update conversation metadata when a message is sent
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

-- 3. Create trigger on messages insert
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
CREATE TRIGGER on_message_sent
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- 4. Create function to reset unread count when conversation is marked as read
CREATE OR REPLACE FUNCTION reset_unread_count(
  conversation_uuid UUID,
  user_uuid UUID
)
RETURNS void AS $$
BEGIN
  UPDATE public.conversations
  SET
    unread_count_user1 = CASE WHEN user1_id = user_uuid THEN 0 ELSE unread_count_user1 END,
    unread_count_user2 = CASE WHEN user2_id = user_uuid THEN 0 ELSE unread_count_user2 END
  WHERE id = conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add policy to allow users to view other profiles for discovery
DROP POLICY IF EXISTS "Users can view other profiles for discovery" ON public.users;
CREATE POLICY "Users can view other profiles for discovery"
ON public.users
FOR SELECT
USING (profile_completed = true);

-- 6. Add balance column if it doesn't exist (for women's earnings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'balance'
  ) THEN
    ALTER TABLE public.users ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00;
  END IF;
END $$;

-- Done! Your messaging system is now ready.
-- Test by:
-- 1. Liking a profile in the Discover tab
-- 2. Going to Messages tab and tapping "Matches"
-- 3. Tapping a match to open the chat
-- 4. Sending a message (costs 10 coins for men)
