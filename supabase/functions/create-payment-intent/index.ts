// Supabase Edge Function: create-payment-intent
// Handles Stripe Payment Intent creation for coin purchases

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
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
    const { packageId, amount, coins } = await req.json();

    // Validate input
    if (!packageId || !amount || !coins) {
      throw new Error("Missing required parameters: packageId, amount, coins");
    }

    if (amount < 50) {
      // Stripe minimum is $0.50
      throw new Error("Amount must be at least 50 cents");
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: "usd",
      metadata: {
        packageId,
        coins: coins.toString(),
        product: "coin_purchase",
      },
      description: `MochaLove - ${coins} Coins`,
    });

    // Return client secret to initialize payment sheet
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
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

1. Install Supabase CLI:
   npm install -g supabase

2. Link your project:
   supabase link --project-ref <your-project-ref>

3. Set your Stripe secret key as an environment variable:
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx

4. Deploy the function:
   supabase functions deploy create-payment-intent

5. Test the function:
   curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/create-payment-intent' \
     --header 'Authorization: Bearer <anon-key>' \
     --header 'Content-Type: application/json' \
     --data '{"packageId":"standard","amount":999,"coins":100}'

*/
