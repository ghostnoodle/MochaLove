-- Enhanced Messaging Features Migration
-- Run this SQL in your Supabase SQL Editor

-- 1. Add read_at timestamp to messages table for read receipts
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. Add audio_url for voice messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 3. Add audio_duration for voice message playback
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;

-- 4. Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('heart', 'like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id) -- One reaction per user per message
);

-- Enable RLS on message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read reactions on messages they're part of
CREATE POLICY "Users can read message reactions" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_reactions.message_id
        AND (messages.from_user_id = auth.uid() OR messages.to_user_id = auth.uid())
    )
  );

-- Users can add reactions to messages they're part of
CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_reactions.message_id
        AND (messages.from_user_id = auth.uid() OR messages.to_user_id = auth.uid())
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Users can read typing indicators in their conversations
CREATE POLICY "Users can read typing indicators" ON public.typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = typing_indicators.conversation_id
        AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can update their own typing status
CREATE POLICY "Users can update own typing status" ON public.typing_indicators
  FOR ALL USING (auth.uid() = user_id);

-- 6. Update the mark_conversation_as_read function to set read_at timestamp
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  conversation_id_param UUID,
  user_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  -- Mark all messages in this conversation as read for this user and set read_at
  UPDATE public.messages
  SET is_read = TRUE,
      read_at = CASE WHEN read_at IS NULL THEN NOW() ELSE read_at END
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

-- 7. Function to update typing indicator
CREATE OR REPLACE FUNCTION update_typing_indicator(
  conversation_id_param UUID,
  user_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.typing_indicators (conversation_id, user_id, updated_at)
  VALUES (conversation_id_param, user_id_param, NOW())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to remove typing indicator
CREATE OR REPLACE FUNCTION remove_typing_indicator(
  conversation_id_param UUID,
  user_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE conversation_id = conversation_id_param
    AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON public.typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);

-- 10. Function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.message_reactions IS 'Stores emoji reactions on messages';
COMMENT ON TABLE public.typing_indicators IS 'Real-time typing status for conversations';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was first read (for read receipts)';
COMMENT ON COLUMN public.messages.audio_url IS 'URL to voice message audio file';
COMMENT ON COLUMN public.messages.audio_duration_seconds IS 'Duration of voice message in seconds';
