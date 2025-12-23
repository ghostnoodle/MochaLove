// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events (payment success, etc.)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
  }

  try {
    const body = await req.text();

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("📥 Webhook event received:", event.type);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("✅ Checkout session completed:", session.id);
      console.log("📦 Session metadata:", session.metadata);

      // Extract purchase details from metadata
      const { packageId, coins, userId } = session.metadata || {};
      const amountCents = session.amount_total || 0;
      const paymentIntentId = session.payment_intent as string;

      if (!packageId || !coins || !userId) {
        console.error("❌ Missing metadata in session:", session.metadata);
        return new Response(JSON.stringify({ error: "Missing required metadata" }), {
          status: 400,
        });
      }

      console.log("💰 Processing coin purchase:", {
        userId,
        coins,
        amountCents,
        packageId,
      });

      // Call Supabase RPC to add coins to user account
      const { data, error } = await supabase.rpc("process_coin_purchase", {
        p_user_id: userId,
        p_coins: parseInt(coins),
        p_amount_cents: amountCents,
        p_payment_intent_id: paymentIntentId,
        p_package_id: packageId,
      });

      if (error) {
        console.error("❌ Error processing coin purchase:", error);
        throw error;
      }

      console.log("✅ Coins added successfully:", data);
    }

    // Return success response
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Webhook processing failed",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

/* To deploy this function:

1. Deploy the function:
   supabase functions deploy stripe-webhook

2. Set environment variables in Supabase Dashboard:
   - STRIPE_SECRET_KEY (already set)
   - STRIPE_WEBHOOK_SECRET (get from Stripe Dashboard after creating webhook)
   - SUPABASE_URL (your Supabase URL)
   - SUPABASE_SERVICE_ROLE_KEY (your service role key)

3. Add webhook endpoint in Stripe Dashboard:
   - Go to https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - URL: https://<your-project>.supabase.co/functions/v1/stripe-webhook
   - Events to listen: checkout.session.completed
   - Copy the webhook signing secret and add it to Supabase secrets as STRIPE_WEBHOOK_SECRET

*/
