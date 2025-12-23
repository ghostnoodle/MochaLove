import { supabase } from "./supabase";
import type { Gift } from "~/types";

export interface GiftTransaction {
  id: string;
  gift_id: string;
  sender_id: string;
  receiver_id: string;
  coins_spent: number;
  status: "pending" | "claimed" | "expired";
  message_id?: string;
  reply_message_id?: string;
  claimed_at?: string;
  expires_at?: string;
  earnings_cents: number;
  created_at: string;
  gift?: Gift;
}

export interface GiftWithCatalog extends GiftTransaction {
  gift_name: string;
  gift_icon: string;
  gift_category: string;
}

// Gift Service
export const giftService = {
  /**
   * Get all available gifts from catalog
   */
  async getCatalog(): Promise<Gift[]> {
    const { data, error } = await supabase
      .from("gift_catalog")
      .select("*")
      .order("coins", { ascending: true });

    if (error) throw error;
    return data.map((gift) => ({
      id: gift.id,
      name: gift.name,
      coins: gift.coins,
      category: gift.category as "micro" | "mid" | "luxury",
      icon: gift.icon || "🎁",
      usdValue: gift.usd_value,
    }));
  },

  /**
   * Get gifts by category
   */
  async getByCategory(category: "micro" | "mid" | "luxury"): Promise<Gift[]> {
    const { data, error } = await supabase
      .from("gift_catalog")
      .select("*")
      .eq("category", category)
      .order("coins", { ascending: true });

    if (error) throw error;
    return data.map((gift) => ({
      id: gift.id,
      name: gift.name,
      coins: gift.coins,
      category: gift.category as "micro" | "mid" | "luxury",
      icon: gift.icon || "🎁",
      usdValue: gift.usd_value,
    }));
  },

  /**
   * Send a gift to another user (creates pending gift requiring reply to claim)
   */
  async sendGift(params: {
    giftId: string;
    senderId: string;
    receiverId: string;
    coinsSpent: number;
    conversationId?: string;
    messageId?: string;
  }): Promise<GiftTransaction> {
    console.log("💰 [GIFT] Starting gift send process...", {
      giftId: params.giftId,
      senderId: params.senderId,
      receiverId: params.receiverId,
      coinsSpent: params.coinsSpent,
    });

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create gift transaction with PENDING status (no earnings yet!)
    const { data, error } = await supabase
      .from("gift_transactions")
      .insert({
        gift_id: params.giftId,
        sender_id: params.senderId,
        receiver_id: params.receiverId,
        coins_spent: params.coinsSpent,
        status: "pending",
        message_id: params.messageId,
        expires_at: expiresAt.toISOString(),
        earnings_cents: 0, // Not earned yet!
      })
      .select()
      .single();

    if (error) throw error;

    console.log("💰 [GIFT] Gift transaction created as PENDING:", data.id);

    // Get current user data
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("coins")
      .eq("id", params.senderId)
      .single();

    if (fetchError || !userData) {
      console.error("❌ [GIFT] Error fetching user data:", fetchError);
      throw new Error("Failed to fetch user data");
    }

    console.log("💰 [GIFT] Current user coins:", userData.coins);

    // Calculate new balance
    const newCoins = userData.coins - params.coinsSpent;

    if (newCoins < 0) {
      throw new Error("Insufficient coins");
    }

    // Update sender's coins
    const { error: coinError } = await supabase
      .from("users")
      .update({ coins: newCoins })
      .eq("id", params.senderId);

    if (coinError) {
      console.error("❌ [GIFT] Error deducting coins:", coinError);
      throw new Error("Failed to deduct coins from sender: " + coinError.message);
    }

    console.log("✅ [GIFT] Coins deducted successfully. New balance:", newCoins);

    // Record transaction for SENDER only (receiver gets transaction when they claim)
    await supabase.from("transactions").insert({
      user_id: params.senderId,
      type: "gift_sent",
      amount: -params.coinsSpent,
      description: `Sent gift (pending claim)`,
      metadata: {
        gift_id: params.giftId,
        gift_transaction_id: data.id,
        receiver_id: params.receiverId,
        conversation_id: params.conversationId,
        expires_at: expiresAt.toISOString(),
      },
    });

    console.log("✅ [GIFT] Gift sent successfully as PENDING");

    return data;
  },

  /**
   * Get gifts sent by a user
   */
  async getSentGifts(userId: string, limit = 50): Promise<GiftWithCatalog[]> {
    const { data, error } = await supabase
      .from("gift_transactions")
      .select(
        `
        *,
        gift:gift_catalog(name, icon, category)
      `,
      )
      .eq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map((item: any) => ({
      ...item,
      gift_name: item.gift?.name || "Gift",
      gift_icon: item.gift?.icon || "🎁",
      gift_category: item.gift?.category || "micro",
    }));
  },

  /**
   * Get gifts received by a user
   */
  async getReceivedGifts(userId: string, limit = 50): Promise<GiftWithCatalog[]> {
    const { data, error } = await supabase
      .from("gift_transactions")
      .select(
        `
        *,
        gift:gift_catalog(name, icon, category)
      `,
      )
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map((item: any) => ({
      ...item,
      gift_name: item.gift?.name || "Gift",
      gift_icon: item.gift?.icon || "🎁",
      gift_category: item.gift?.category || "micro",
    }));
  },

  /**
   * Get gift statistics for a user
   */
  async getStats(userId: string): Promise<{
    totalSent: number;
    totalReceived: number;
    coinsSpent: number;
    earningsFromGifts: number;
  }> {
    // Get sent gifts
    const { data: sentData } = await supabase
      .from("gift_transactions")
      .select("coins_spent")
      .eq("sender_id", userId);

    // Get received gifts
    const { data: receivedData } = await supabase
      .from("gift_transactions")
      .select("coins_spent")
      .eq("receiver_id", userId);

    const totalSent = sentData?.length || 0;
    const totalReceived = receivedData?.length || 0;
    const coinsSpent = sentData?.reduce((sum, item) => sum + item.coins_spent, 0) || 0;
    const earningsFromGifts =
      receivedData?.reduce((sum, item) => sum + Math.round((item.coins_spent / 2) * 5), 0) || 0;

    return {
      totalSent,
      totalReceived,
      coinsSpent,
      earningsFromGifts,
    };
  },

  /**
   * Subscribe to gift transactions for real-time updates
   */
  subscribeToReceivedGifts(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`gifts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gift_transactions",
          filter: `receiver_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },

  /**
   * Claim a gift by replying to it
   */
  async claimGift(params: {
    giftTransactionId: string;
    replyMessageId: string;
    receiverId: string;
  }): Promise<{ success: boolean; earningsCents?: number; error?: string }> {
    console.log("🎁 [GIFT] Attempting to claim gift...", params);

    const { data, error } = await supabase.rpc("claim_gift_on_reply", {
      p_gift_transaction_id: params.giftTransactionId,
      p_reply_message_id: params.replyMessageId,
      p_receiver_id: params.receiverId,
    });

    if (error) {
      console.error("❌ [GIFT] Error claiming gift:", error);
      throw error;
    }

    console.log("✅ [GIFT] Claim result:", data);
    return data;
  },

  /**
   * Get pending gifts for a user (gifts awaiting reply)
   */
  async getPendingGifts(userId: string): Promise<GiftWithCatalog[]> {
    const { data, error } = await supabase
      .from("gift_transactions")
      .select(
        `
        *,
        gift:gift_catalog(name, icon, category)
      `,
      )
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      ...item,
      gift_name: item.gift?.name || "Gift",
      gift_icon: item.gift?.icon || "🎁",
      gift_category: item.gift?.category || "micro",
    }));
  },

  /**
   * Get gift transaction by message ID
   */
  async getGiftByMessageId(messageId: string): Promise<GiftTransaction | null> {
    const { data, error } = await supabase
      .from("gift_transactions")
      .select("*")
      .eq("message_id", messageId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data;
  },
};
