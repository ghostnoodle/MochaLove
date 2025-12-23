import { supabase } from "~/lib/supabase";

/**
 * Stripe Connect Service
 * Handles Express Connected Account creation, onboarding, and payouts
 */

export interface ConnectAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    errors: Array<{
      code: string;
      reason: string;
      requirement: string;
    }>;
  };
}

export interface PayoutParams {
  userId: string;
  amountCents: number;
  cashOutRequestId: string;
}

export const stripeConnectService = {
  /**
   * Create a Stripe Express Connected Account for a user
   * Called when user first attempts to set up bank account
   */
  async createConnectedAccount(userId: string, userEmail: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("create-connect-account", {
      body: {
        userId,
        userEmail,
      },
    });

    if (error) throw error;
    if (!data?.accountId) throw new Error("No account ID returned from function");

    // Update user profile with connect account ID
    const { error: updateError } = await supabase
      .from("users")
      .update({ stripe_connect_account_id: data.accountId })
      .eq("id", userId);

    if (updateError) throw updateError;

    return data.accountId;
  },

  /**
   * Generate Stripe Connect onboarding link
   * Returns URL that user should be redirected to for completing bank account setup
   */
  async createOnboardingLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    console.log("🔌 [STRIPE-CONNECT] createOnboardingLink called");
    console.log("🔌 [STRIPE-CONNECT] accountId:", accountId);
    console.log("🔌 [STRIPE-CONNECT] refreshUrl:", refreshUrl);
    console.log("🔌 [STRIPE-CONNECT] returnUrl:", returnUrl);

    console.log("🔌 [STRIPE-CONNECT] Invoking create-connect-onboarding-link function...");

    // Get current session for auth headers
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    console.log("🔌 [STRIPE-CONNECT] Auth token available:", !!token);

    // Try direct fetch first as fallback for Draftbit environment
    try {
      const functionUrl = `https://ioscbfcleqiclevlokmo.supabase.co/functions/v1/create-connect-onboarding-link`;
      console.log("🔌 [STRIPE-CONNECT] Trying direct fetch to:", functionUrl);

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2NiZmNsZXFpY2xldmxva21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTc5NTcsImV4cCI6MjA4MTY3Mzk1N30.F2QdEjep6U7NnjZHBHazB0Ctuwr9iJyvpQ1vF-v9MKk",
        },
        body: JSON.stringify({
          accountId,
          refreshUrl,
          returnUrl,
        }),
      });

      console.log("🔌 [STRIPE-CONNECT] Fetch response status:", response.status);
      console.log("🔌 [STRIPE-CONNECT] Fetch response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔌 [STRIPE-CONNECT] Fetch error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("🔌 [STRIPE-CONNECT] Fetch response data:", data);

      if (!data?.url) {
        console.error("🔌 [STRIPE-CONNECT] No URL in response, data:", data);
        throw new Error("No onboarding URL returned");
      }

      console.log("🔌 [STRIPE-CONNECT] Onboarding URL:", data.url);
      console.log("🔌 [STRIPE-CONNECT] URL length:", data.url.length);

      return data.url;
    } catch (fetchError) {
      console.error("🔌 [STRIPE-CONNECT] Direct fetch failed:", fetchError);
      console.error("🔌 [STRIPE-CONNECT] Falling back to supabase.functions.invoke...");

      // Fallback to original method
      const { data, error } = await supabase.functions.invoke("create-connect-onboarding-link", {
        body: {
          accountId,
          refreshUrl,
          returnUrl,
        },
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });

      console.log("🔌 [STRIPE-CONNECT] Function response - data:", data);
      console.log("🔌 [STRIPE-CONNECT] Function response - error:", error);

      if (error) {
        console.error("🔌 [STRIPE-CONNECT] Error from Edge Function:", error);
        console.error("🔌 [STRIPE-CONNECT] Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      if (!data?.url) {
        console.error("🔌 [STRIPE-CONNECT] No URL in response, data:", data);
        throw new Error("No onboarding URL returned");
      }

      console.log("🔌 [STRIPE-CONNECT] Onboarding URL:", data.url);
      console.log("🔌 [STRIPE-CONNECT] URL length:", data.url.length);

      return data.url;
    }
  },

  /**
   * Check the status of a connected account
   * Returns verification status and any missing requirements
   */
  async getAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
    const { data, error } = await supabase.functions.invoke("get-connect-account-status", {
      body: { accountId },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Process a payout to a connected account
   * Called by admin after approving a cash-out request
   */
  async processPayout(params: PayoutParams): Promise<{ payoutId: string }> {
    const { data, error } = await supabase.functions.invoke("process-payout", {
      body: {
        userId: params.userId,
        amountCents: params.amountCents,
        cashOutRequestId: params.cashOutRequestId,
      },
    });

    if (error) throw error;
    if (!data?.payoutId) throw new Error("No payout ID returned");

    return { payoutId: data.payoutId };
  },

  /**
   * Get payout history for a user
   */
  async getPayoutHistory(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from("cash_out_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Check if user has a connected account and if it's verified
   */
  async checkUserConnectStatus(userId: string): Promise<{
    hasAccount: boolean;
    accountId: string | null;
    isVerified: boolean;
    needsOnboarding: boolean;
  }> {
    console.log("🔌 [STRIPE-CONNECT] checkUserConnectStatus called for user:", userId);

    // Get user's connect account ID from profile
    const { data: user, error } = await supabase
      .from("users")
      .select("stripe_connect_account_id, stripe_connect_onboarding_completed")
      .eq("id", userId)
      .single();

    console.log("🔌 [STRIPE-CONNECT] User data:", user);
    console.log("🔌 [STRIPE-CONNECT] Error:", error);

    if (error) {
      console.error("🔌 [STRIPE-CONNECT] Database error:", error);
      throw error;
    }

    const hasAccount = !!user.stripe_connect_account_id;
    const accountId = user.stripe_connect_account_id;
    const needsOnboarding = !user.stripe_connect_onboarding_completed;

    console.log("🔌 [STRIPE-CONNECT] hasAccount:", hasAccount);
    console.log("🔌 [STRIPE-CONNECT] accountId:", accountId);
    console.log("🔌 [STRIPE-CONNECT] needsOnboarding:", needsOnboarding);

    // If they have an account, check if it's verified
    let isVerified = false;
    if (accountId) {
      try {
        console.log("🔌 [STRIPE-CONNECT] Getting account status from Stripe...");
        const status = await this.getAccountStatus(accountId);
        console.log("🔌 [STRIPE-CONNECT] Status:", status);
        isVerified = status.payoutsEnabled && status.chargesEnabled;
        console.log("🔌 [STRIPE-CONNECT] isVerified:", isVerified);
      } catch (err) {
        // If we can't get status, assume not verified
        console.error("🔌 [STRIPE-CONNECT] Error getting account status:", err);
        isVerified = false;
      }
    }

    const result = {
      hasAccount,
      accountId,
      isVerified,
      needsOnboarding,
    };

    console.log("🔌 [STRIPE-CONNECT] Final result:", result);
    return result;
  },
};
