// Supabase Edge Function: create-checkout-session
// Handles Stripe Checkout Session creation for web coin purchases

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

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
    const { packageId, amount, coins, userId, userEmail, successUrl, cancelUrl } = await req.json();

    // Validate input
    if (!packageId || !amount || !coins || !userId) {
      throw new Error("Missing required parameters: packageId, amount, coins, userId");
    }

    if (amount < 50) {
      // Stripe minimum is $0.50
      throw new Error("Amount must be at least 50 cents");
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${coins} Coins`,
              description: `Purchase ${coins} coins for MochaLove`,
              images: [], // You can add a product image URL here
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}`,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: {
        packageId,
        coins: coins.toString(),
        userId,
        product: "coin_purchase",
      },
    });

    // Return checkout URL to redirect user
    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

/* To deploy this function:

1. Make sure you have Supabase CLI installed and project linked

2. Your Stripe secret key should already be set (same as create-payment-intent):
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx

3. Deploy the function:
   supabase functions deploy create-checkout-session

4. Test the function:
   curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/create-checkout-session' \
     --header 'Authorization: Bearer <anon-key>' \
     --header 'Content-Type: application/json' \
     --data '{"packageId":"standard","amount":999,"coins":100,"userId":"test-user-123","userEmail":"test@example.com","successUrl":"https://yourapp.com","cancelUrl":"https://yourapp.com"}'

*/
