// Supabase Edge Function: stripe-webhooks
// Handles Stripe webhook events for payout status updates

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`📨 Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log(`✅ Payout paid: ${payout.id}`);

        // Update cash-out request to completed
        const { error } = await supabase
          .from("cash_out_requests")
          .update({
            status: "completed",
            processed_at: new Date(payout.arrival_date * 1000).toISOString(),
          })
          .eq("stripe_payout_id", payout.id);

        if (error) {
          console.error("Failed to update cash-out request:", error);
        }
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.log(`❌ Payout failed: ${payout.id}`);

        // Update cash-out request to failed
        const { error } = await supabase
          .from("cash_out_requests")
          .update({
            status: "failed",
            failure_reason: payout.failure_message || "Payout failed",
          })
          .eq("stripe_payout_id", payout.id);

        if (error) {
          console.error("Failed to update cash-out request:", error);
        }

        // Refund user's earnings
        const { data: request } = await supabase
          .from("cash_out_requests")
          .select("user_id, amount_cents")
          .eq("stripe_payout_id", payout.id)
          .single();

        if (request) {
          await supabase.rpc("increment", {
            table_name: "users",
            column_name: "earnings",
            row_id: request.user_id,
            increment_by: request.amount_cents,
          });
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log(`🔄 Account updated: ${account.id}`);

        // Update user's Connect status
        const { error } = await supabase
          .from("users")
          .update({
            stripe_connect_onboarding_completed: account.details_submitted || false,
            stripe_connect_charges_enabled: account.charges_enabled || false,
            stripe_connect_payouts_enabled: account.payouts_enabled || false,
          })
          .eq("stripe_connect_account_id", account.id);

        if (error) {
          console.error("Failed to update user:", error);
        }
        break;
      }

      case "payout.created": {
        const payout = event.data.object as Stripe.Payout;
        console.log(`📤 Payout created: ${payout.id}`);
        // Just log for now, status is already set to 'processing'
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
