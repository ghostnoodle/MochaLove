import { supabase } from "./supabase";
import type {
  Conversation,
  Message,
  MessageReaction,
  ReactionType,
  TypingIndicator,
} from "~/types";

// Conversation Service
export const conversationService = {
  /**
   * Get or create a conversation between two users
   */
  async getOrCreate(user1Id: string, user2Id: string): Promise<string> {
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      user1_param: user1Id,
      user2_param: user2Id,
    });

    if (error) throw error;
    return data as string;
  },

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    return data as Conversation[];
  },

  /**
   * Get a single conversation by ID
   */
  async getById(conversationId: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) throw error;
    return data as Conversation;
  },

  /**
   * Mark a conversation as read for a user
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("mark_conversation_as_read", {
      conversation_id_param: conversationId,
      user_id_param: userId,
    });

    if (error) throw error;
  },

  /**
   * Get unread count for a user in a conversation
   */
  getUnreadCount(conversation: Conversation, userId: string): number {
    if (conversation.user1_id === userId) {
      return conversation.unread_count_user1;
    }
    return conversation.unread_count_user2;
  },

  /**
   * Get the other user ID in a conversation
   */
  getOtherUserId(conversation: Conversation, currentUserId: string): string {
    return conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;
  },

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversations(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user1_id=eq.${userId}`,
        },
        callback,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user2_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },
};

// Message Service
export const messageService = {
  /**
   * Send a new message
   */
  async send(params: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    content?: string;
    photoUrl?: string;
    photoGiftRequired?: number;
  }): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: params.conversationId,
        from_user_id: params.fromUserId,
        to_user_id: params.toUserId,
        content: params.content,
        photo_url: params.photoUrl,
        photo_gift_required: params.photoGiftRequired || 0,
        photo_unlocked: !params.photoGiftRequired, // Auto-unlock if no gift required
      })
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  },

  /**
   * Get messages in a conversation
   */
  async getByConversationId(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Message[];
  },

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", messageId);

    if (error) throw error;
  },

  /**
   * Unlock a photo message
   */
  async unlockPhoto(messageId: string): Promise<void> {
    const { error } = await supabase
      .from("messages")
      .update({ photo_unlocked: true })
      .eq("id", messageId);

    if (error) throw error;
  },

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(conversationId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        callback,
      )
      .subscribe();
  },

  /**
   * Send a voice message
   */
  async sendVoiceMessage(params: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    audioUrl: string;
    audioDurationSeconds: number;
  }): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: params.conversationId,
        from_user_id: params.fromUserId,
        to_user_id: params.toUserId,
        audio_url: params.audioUrl,
        audio_duration_seconds: params.audioDurationSeconds,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  },
};

// Reaction Service
export const reactionService = {
  /**
   * Add or update a reaction to a message
   */
  async addReaction(messageId: string, userId: string, reaction: ReactionType): Promise<void> {
    const { error } = await supabase.from("message_reactions").upsert(
      {
        message_id: messageId,
        user_id: userId,
        reaction,
      },
      {
        onConflict: "message_id,user_id",
      },
    );

    if (error) throw error;
  },

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  /**
   * Get reactions for a message
   */
  async getReactionsForMessage(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("message_id", messageId);

    if (error) throw error;
    return data as MessageReaction[];
  },

  /**
   * Get reactions for multiple messages
   */
  async getReactionsForMessages(messageIds: string[]): Promise<Record<string, MessageReaction[]>> {
    if (messageIds.length === 0) return {};

    const { data, error } = await supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", messageIds);

    if (error) throw error;

    // Group reactions by message_id
    const grouped: Record<string, MessageReaction[]> = {};
    (data as MessageReaction[]).forEach((reaction) => {
      if (!grouped[reaction.message_id]) {
        grouped[reaction.message_id] = [];
      }
      grouped[reaction.message_id].push(reaction);
    });

    return grouped;
  },

  /**
   * Subscribe to reaction changes for messages in a conversation
   */
  subscribeToReactions(conversationId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`reactions:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        callback,
      )
      .subscribe();
  },
};

// Typing Indicator Service
export const typingService = {
  /**
   * Update typing indicator (user is typing)
   */
  async setTyping(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("update_typing_indicator", {
      conversation_id_param: conversationId,
      user_id_param: userId,
    });

    if (error) throw error;
  },

  /**
   * Remove typing indicator (user stopped typing)
   */
  async removeTyping(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("remove_typing_indicator", {
      conversation_id_param: conversationId,
      user_id_param: userId,
    });

    if (error) throw error;
  },

  /**
   * Get current typing indicators for a conversation
   */
  async getTyping(conversationId: string): Promise<TypingIndicator[]> {
    const { data, error } = await supabase
      .from("typing_indicators")
      .select("*")
      .eq("conversation_id", conversationId)
      .gte("updated_at", new Date(Date.now() - 10000).toISOString()); // Only get recent (last 10 seconds)

    if (error) throw error;
    return data as TypingIndicator[];
  },

  /**
   * Subscribe to typing indicator changes
   */
  subscribeToTyping(conversationId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        callback,
      )
      .subscribe();
  },
};
