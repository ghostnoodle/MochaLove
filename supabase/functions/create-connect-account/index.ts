// Supabase Edge Function: create-connect-account
// Creates a Stripe Express Connected Account for a user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
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
    const { userId, userEmail } = await req.json();

    if (!userId || !userEmail) {
      throw new Error("Missing required parameters: userId and userEmail");
    }

    console.log(`Creating Stripe Connect account for user ${userId} (${userEmail})`);

    // Create Express Connected Account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userEmail,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        user_id: userId,
        platform: "MochaLove",
      },
    });

    console.log(`✅ Created Stripe account: ${account.id}`);

    return new Response(
      JSON.stringify({
        accountId: account.id,
        success: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error creating Connect account:", error);
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
