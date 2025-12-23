import { supabase } from "~/lib/supabase";

/**
 * Payment Service
 * Handles coin purchases and cash-out requests
 */

export interface PurchaseCoinsParams {
  userId: string;
  packageId: string;
  coins: number;
  price: number;
  paymentIntentId: string;
}

export interface CashOutParams {
  userId: string;
  amountCents: number;
  paymentMethod: "stripe" | "paypal" | "bank_transfer";
  accountDetails: string;
}

export const paymentService = {
  /**
   * Create a payment intent for coin purchase (Native)
   * This calls a Supabase Edge Function that creates a Stripe Payment Intent
   */
  async createPaymentIntent(
    packageId: string,
    amount: number,
    coins: number,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const { data, error } = await supabase.functions.invoke("create-payment-intent", {
      body: {
        packageId,
        amount: Math.round(amount * 100), // Convert to cents
        coins,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Create a Stripe Checkout session for coin purchase (Web)
   * This calls a Supabase Edge Function that creates a Stripe Checkout Session
   */
  async createCheckoutSession(
    packageId: string,
    amount: number,
    coins: number,
    userId: string,
    userEmail?: string,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    console.log("📡 [PAYMENT-SERVICE] Calling create-checkout-session Edge Function...", {
      packageId,
      amount: Math.round(amount * 100),
      coins,
      userId,
      userEmail,
    });

    // Check if window is available
    if (typeof window === "undefined") {
      console.error("❌ window object not available!");
      throw new Error("Payment service requires web environment");
    }

    console.log("🔵 [PAYMENT-SERVICE] Window origin:", window.location.origin);
    console.log("🔵 [PAYMENT-SERVICE] User agent:", navigator.userAgent);

    try {
      // Get the user's session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token =
        session?.access_token ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2NiZmNsZXFpY2xldmxva21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTc5NTcsImV4cCI6MjA4MTY3Mzk1N30.F2QdEjep6U7NnjZHBHazB0Ctuwr9iJyvpQ1vF-v9MKk";

      // Build the full Shop URL with payment parameters
      const shopUrl = `${window.location.origin}/shop`;
      const successParams = new URLSearchParams({
        payment: "success",
        coins: coins.toString(),
        packageId: packageId,
        amount: Math.round(amount * 100).toString(),
      });

      const requestBody = {
        packageId,
        amount: Math.round(amount * 100),
        coins,
        userId,
        userEmail,
        successUrl: `${shopUrl}?${successParams.toString()}`,
        cancelUrl: `${shopUrl}?payment=cancelled`,
      };

      console.log("🔍 [PAYMENT-SERVICE] Testing Edge Function endpoint...");
      console.log("🔍 [PAYMENT-SERVICE] Success URL:", requestBody.successUrl);
      console.log("🔍 [PAYMENT-SERVICE] Request body:", requestBody);

      const testResponse = await fetch(
        "https://ioscbfcleqiclevlokmo.supabase.co/functions/v1/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2NiZmNsZXFpY2xldmxva21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTc5NTcsImV4cCI6MjA4MTY3Mzk1N30.F2QdEjep6U7NnjZHBHazB0Ctuwr9iJyvpQ1vF-v9MKk",
          },
          body: JSON.stringify(requestBody),
        },
      );

      console.log("🔍 [PAYMENT-SERVICE] Response status:", testResponse.status);
      console.log("🔍 [PAYMENT-SERVICE] Response ok:", testResponse.ok);
      console.log(
        "🔍 [PAYMENT-SERVICE] Response headers:",
        Object.fromEntries(testResponse.headers.entries()),
      );

      const testText = await testResponse.text();
      console.log("🔍 [PAYMENT-SERVICE] Response body:", testText);

      if (!testResponse.ok) {
        console.error(
          "❌ [PAYMENT-SERVICE] Edge Function failed with status:",
          testResponse.status,
        );
        throw new Error(`Function returned ${testResponse.status}: ${testText}`);
      }

      const data = JSON.parse(testText);
      console.log("✅ [PAYMENT-SERVICE] Direct fetch success:", data);
      console.log("✅ [PAYMENT-SERVICE] Checkout URL:", data.checkoutUrl);
      console.log("✅ [PAYMENT-SERVICE] Session ID:", data.sessionId);
      return data;

      // Original Supabase client method (kept as backup)
      /*
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout after 30 seconds")), 30000);
      });

      const invokePromise = supabase.functions.invoke("create-checkout-session", {
        body: {
          packageId,
          amount: Math.round(amount * 100), // Convert to cents
          coins,
          userId,
          userEmail,
          successUrl: `${window.location.origin}`,
          cancelUrl: `${window.location.origin}`,
        },
      });

      const result = (await Promise.race([invokePromise, timeoutPromise])) as {
        data: any;
        error: any;
      };

      const { data, error } = result;

      console.log("📦 Edge Function response:", { data, error });

      if (error) {
        console.error("❌ Edge Function error:", error);
        console.error("❌ Error details:", {
          name: error.name,
          message: error.message,
          context: error.context,
          details: JSON.stringify(error, null, 2),
        });
        throw new Error(
          `Edge Function failed: ${error.name} - ${error.message || "Unknown error"}\n\n` +
            `Error type: ${error.name}\n\n` +
            `Make sure:\n` +
            `1. create-checkout-session function is deployed\n` +
            `2. STRIPE_SECRET_KEY is set in Supabase secrets\n` +
            `3. Function has correct permissions`,
        );
      }

      if (!data) {
        throw new Error("No data returned from Edge Function");
      }

      // Check if data has error property (from function's response)
      if (data.error) {
        throw new Error(`Stripe error: ${data.error}`);
      }

      if (!data.checkoutUrl) {
        throw new Error(`Invalid response from Edge Function: ${JSON.stringify(data)}`);
      }

      console.log("✅ Edge Function success:", data);
      return data;
      */
    } catch (err) {
      console.error("💥 Exception in createCheckoutSession:", err);
      throw err;
    }
  },

  /**
   * Confirm coin purchase after successful payment
   * Updates user's coin balance and creates transaction record
   */
  async confirmCoinPurchase(params: PurchaseCoinsParams) {
    const { error } = await supabase.rpc("process_coin_purchase", {
      p_user_id: params.userId,
      p_coins: params.coins,
      p_amount_cents: Math.round(params.price * 100),
      p_payment_intent_id: params.paymentIntentId,
      p_package_id: params.packageId,
    });

    if (error) throw error;
    return { success: true };
  },

  /**
   * Request a cash-out for female users
   * Creates a pending cash-out request that will be processed manually or via Stripe Connect
   */
  async requestCashOut(params: CashOutParams) {
    console.log("💳 [PAYMENT-SERVICE] requestCashOut called");
    console.log("💳 [PAYMENT-SERVICE] Params:", params);

    const { error } = await supabase.from("cash_out_requests").insert({
      user_id: params.userId,
      amount_cents: params.amountCents,
      payment_method: params.paymentMethod,
      account_details: params.accountDetails,
      status: "pending",
    });

    console.log("💳 [PAYMENT-SERVICE] Insert error:", error);

    if (error) {
      console.error("💳 [PAYMENT-SERVICE] Failed to insert cash-out request:", error);
      throw error;
    }

    console.log("💳 [PAYMENT-SERVICE] Cash-out request created successfully");
    return { success: true };
  },

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },
};
