// Supabase Edge Function: process-payout
// Processes a payout to a connected account after admin approval

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, amountCents, cashOutRequestId } = await req.json();

    if (!userId || !amountCents || !cashOutRequestId) {
      throw new Error("Missing required parameters");
    }

    console.log(`Processing payout for user ${userId}: $${(amountCents / 100).toFixed(2)}`);

    // Get user's Stripe Connect account ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("stripe_connect_account_id, earnings")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    if (!user.stripe_connect_account_id) {
      throw new Error("User does not have a connected Stripe account");
    }

    // Verify user has sufficient balance
    if (user.earnings < amountCents) {
      throw new Error("Insufficient balance");
    }

    // Create payout to connected account
    const payout = await stripe.payouts.create(
      {
        amount: amountCents,
        currency: "usd",
        metadata: {
          user_id: userId,
          cash_out_request_id: cashOutRequestId,
        },
      },
      {
        stripeAccount: user.stripe_connect_account_id,
      },
    );

    console.log(`✅ Payout created: ${payout.id}, status: ${payout.status}`);

    // Update cash-out request with payout ID and set status to processing
    const { error: updateRequestError } = await supabase
      .from("cash_out_requests")
      .update({
        stripe_payout_id: payout.id,
        status: "processing",
        processed_at: new Date().toISOString(),
      })
      .eq("id", cashOutRequestId);

    if (updateRequestError) {
      console.error("⚠️  Failed to update cash-out request:", updateRequestError);
    }

    // Deduct from user's earnings
    const { error: deductError } = await supabase
      .from("users")
      .update({
        earnings: user.earnings - amountCents,
      })
      .eq("id", userId);

    if (deductError) {
      console.error("⚠️  Failed to deduct earnings:", deductError);
      // Note: In production, you should handle this more carefully
      // Consider using a transaction or reversing the payout
    }

    // Create transaction record
    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id: userId,
      type: "cash_out",
      amount_cents: -amountCents, // Negative because it's a deduction
      description: `Cash-out to bank account`,
      reference_id: payout.id,
    });

    if (transactionError) {
      console.error("⚠️  Failed to create transaction:", transactionError);
    }

    return new Response(
      JSON.stringify({
        payoutId: payout.id,
        status: payout.status,
        success: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error processing payout:", error);

    // Update cash-out request status to failed
    try {
      const { cashOutRequestId } = await req.json();
      if (cashOutRequestId) {
        await supabase
          .from("cash_out_requests")
          .update({
            status: "failed",
            failure_reason: error.message,
          })
          .eq("id", cashOutRequestId);
      }
    } catch (updateError) {
      console.error("Failed to update request status:", updateError);
    }

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
