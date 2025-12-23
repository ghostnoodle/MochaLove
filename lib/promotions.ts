import { supabase } from "./supabase";

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string | null;
  promotion_type:
    | "bonus_coins"
    | "discount_percentage"
    | "discount_fixed"
    | "first_purchase"
    | "special_event";
  bonus_percentage: number | null;
  discount_percentage: number | null;
  discount_amount_cents: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_uses: number | null;
  max_uses_per_user: number;
  current_uses: number;
  applicable_package_ids: string[] | null;
  first_purchase_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionForUser extends Promotion {
  user_uses_count: number;
  can_use: boolean;
}

export interface PromotionUse {
  id: string;
  promotion_id: string;
  user_id: string;
  transaction_id: string | null;
  discount_amount_cents: number;
  bonus_coins: number;
  created_at: string;
}

export interface PromotionValidation {
  valid: boolean;
  error?: string;
  promotion_id?: string;
  title?: string;
  promotion_type?: string;
  bonus_percentage?: number;
  discount_percentage?: number;
  discount_amount_cents?: number;
}

export interface AppliedPromotion {
  promotionId: string;
  title: string;
  type: "bonus_coins" | "discount_percentage" | "discount_fixed";
  bonusPercentage?: number;
  discountPercentage?: number;
  discountAmountCents?: number;
  // Calculated values
  originalAmountCents: number;
  discountedAmountCents: number;
  bonusCoins: number;
  totalCoins: number;
}

// Promotions Service
export const promotionsService = {
  /**
   * Get all active promotions
   */
  async getActivePromotions(): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString())
      .order("end_date", { ascending: true });

    if (error) throw error;
    return data as Promotion[];
  },

  /**
   * Get active promotions for a specific user (includes usage info)
   */
  async getActivePromotionsForUser(userId: string): Promise<PromotionForUser[]> {
    const { data, error } = await supabase.rpc("get_active_promotions_for_user", {
      user_id_param: userId,
    });

    if (error) throw error;
    return data as PromotionForUser[];
  },

  /**
   * Get a promotion by code
   */
  async getPromotionByCode(code: string): Promise<Promotion | null> {
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw error;
    }
    return data as Promotion;
  },

  /**
   * Validate a promotion code for a user
   */
  async validatePromotionCode(
    code: string,
    userId: string,
    packageId?: string,
  ): Promise<PromotionValidation> {
    const { data, error } = await supabase.rpc("validate_promotion_code", {
      promo_code: code,
      user_id_param: userId,
      package_id_param: packageId,
    });

    if (error) throw error;
    return data as PromotionValidation;
  },

  /**
   * Calculate the promotion discount and bonus
   */
  calculatePromotionBenefit(
    promotion: Promotion | PromotionValidation,
    originalAmountCents: number,
    baseCoins: number,
  ): AppliedPromotion {
    let discountedAmountCents = originalAmountCents;
    let bonusCoins = 0;

    // Apply discount
    if (promotion.discount_percentage) {
      const discount = Math.floor((originalAmountCents * promotion.discount_percentage) / 100);
      discountedAmountCents = originalAmountCents - discount;
    } else if (promotion.discount_amount_cents) {
      discountedAmountCents = Math.max(0, originalAmountCents - promotion.discount_amount_cents);
    }

    // Calculate bonus coins
    if (promotion.bonus_percentage) {
      bonusCoins = Math.floor((baseCoins * promotion.bonus_percentage) / 100);
    }

    const totalCoins = baseCoins + bonusCoins;

    return {
      promotionId: promotion.id || "",
      title: promotion.title || "",
      type: (promotion.promotion_type || "bonus_coins") as AppliedPromotion["type"],
      bonusPercentage: promotion.bonus_percentage || undefined,
      discountPercentage: promotion.discount_percentage || undefined,
      discountAmountCents: promotion.discount_amount_cents || undefined,
      originalAmountCents,
      discountedAmountCents,
      bonusCoins,
      totalCoins,
    };
  },

  /**
   * Record a promotion use (called after successful purchase)
   */
  async recordPromotionUse(
    promotionId: string,
    userId: string,
    transactionId: string,
    discountAmountCents: number,
    bonusCoins: number,
  ): Promise<void> {
    const { error } = await supabase.rpc("record_promotion_use", {
      promotion_id_param: promotionId,
      user_id_param: userId,
      transaction_id_param: transactionId,
      discount_amount_cents_param: discountAmountCents,
      bonus_coins_param: bonusCoins,
    });

    if (error) throw error;
  },

  /**
   * Get user's promotion usage history
   */
  async getUserPromotionUses(userId: string): Promise<PromotionUse[]> {
    const { data, error } = await supabase
      .from("promotion_uses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as PromotionUse[];
  },

  /**
   * Check if user has made a purchase before (for first-purchase promotions)
   */
  async hasUserMadePurchase(userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "coin_purchase");

    if (error) throw error;
    return (count || 0) > 0;
  },

  /**
   * Calculate time remaining for a promotion
   */
  getTimeRemaining(endDate: string): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const distance = end - now;

    if (distance < 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
      isExpired: false,
    };
  },

  /**
   * Format time remaining as a string
   */
  formatTimeRemaining(endDate: string): string {
    const { days, hours, minutes, isExpired } = this.getTimeRemaining(endDate);

    if (isExpired) return "Expired";

    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  },
};
