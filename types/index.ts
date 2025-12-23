// User types
export type UserGender = "man" | "woman";

export interface User {
  id: string;
  email: string;
  gender: UserGender;
  coins: number; // For men
  earnings: number; // For women (in USD cents)
  created_at: string;
  profile_completed: boolean;
}

// Coin package types
export interface CoinPackage {
  id: string;
  name: string;
  price: number; // in USD
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  pricePerCoin: number;
  isBestValue?: boolean;
  badge?: string;
}

// Transaction types
export type TransactionType =
  | "coin_purchase"
  | "message_sent"
  | "video_call"
  | "gift_sent"
  | "mini_game"
  | "daily_bonus"
  | "new_user_bonus";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number; // coins for men, USD cents for women
  description: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

// Gift types
export interface Gift {
  id: string;
  name: string;
  coins: number;
  category: "micro" | "mid" | "luxury";
  icon: string;
  usdValue: number;
}

// Conversation types
export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string;
  last_message_from_id: string | null;
  unread_count_user1: number;
  unread_count_user2: number;
  created_at: string;
  updated_at: string;
}

// Message types
export interface Message {
  id: string;
  conversation_id: string;
  from_user_id: string;
  to_user_id: string;
  content?: string;
  photo_url?: string;
  photo_gift_required?: number; // coins required to unlock photo
  photo_unlocked: boolean;
  audio_url?: string; // Voice message audio file URL
  audio_duration_seconds?: number; // Voice message duration
  is_read: boolean;
  read_at?: string; // Timestamp when message was read (for read receipts)
  created_at: string;
}

// Message reaction types
export type ReactionType = "heart" | "like" | "love" | "laugh" | "wow" | "sad" | "angry";

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
}

// Typing indicator types
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  updated_at: string;
}
