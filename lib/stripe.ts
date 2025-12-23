/**
 * Stripe Configuration
 *
 * To set up Stripe:
 * 1. Create a Stripe account at https://stripe.com
 * 2. Get your publishable key from the Stripe Dashboard
 * 3. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables
 * 4. For production, use live keys; for development, use test keys
 */

export const STRIPE_CONFIG = {
  // This key is safe to expose in client code
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",

  // Merchant display name shown to users during payment
  merchantDisplayName: "MochaLove",

  // Set to true when using test mode keys
  testMode: process.env.EXPO_PUBLIC_STRIPE_TEST_MODE === "true",
} as const;

/**
 * Validates that Stripe is configured correctly
 */
export function validateStripeConfig() {
  if (!STRIPE_CONFIG.publishableKey) {
    throw new Error(
      "Stripe publishable key is missing. Please add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.",
    );
  }

  if (STRIPE_CONFIG.testMode) {
    console.warn("⚠️ Stripe is running in TEST MODE. Real charges will not be processed.");
  }
}

/**
 * Server-side configuration (for Supabase Edge Functions)
 * DO NOT expose the secret key in client code
 */
export const STRIPE_SERVER_CONFIG = {
  // This should ONLY be used in Supabase Edge Functions
  // Add STRIPE_SECRET_KEY to your Supabase project secrets
  secretKey: process.env.STRIPE_SECRET_KEY || "",
} as const;
