// Supabase Edge Function: get-connect-account-status
// Retrieves the status of a Stripe Connected Account

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
    const { accountId } = await req.json();

    if (!accountId) {
      throw new Error("Missing required parameter: accountId");
    }

    console.log(`Fetching status for account ${accountId}`);

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    const status = {
      accountId: account.id,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        errors:
          account.requirements?.errors?.map((err) => ({
            code: err.code,
            reason: err.reason,
            requirement: err.requirement,
          })) || [],
      },
    };

    // Update user profile with latest status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        stripe_connect_onboarding_completed: status.detailsSubmitted,
        stripe_connect_charges_enabled: status.chargesEnabled,
        stripe_connect_payouts_enabled: status.payoutsEnabled,
      })
      .eq("stripe_connect_account_id", accountId);

    if (updateError) {
      console.error("⚠️  Failed to update user status:", updateError);
    }

    console.log(`✅ Account status retrieved:`, status);

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Error fetching account status:", error);
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
