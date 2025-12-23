/**
 * Stripe Provider Wrapper (Native only - iOS/Android)
 * Wraps app content with StripeProvider for native payment processing
 */

import * as React from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
import { STRIPE_CONFIG } from "~/lib/stripe";

interface StripeWrapperProps {
  children: React.ReactNode;
}

export function StripeWrapper({ children }: StripeWrapperProps) {
  return (
    <StripeProvider
      publishableKey={STRIPE_CONFIG.publishableKey}
      merchantDisplayName={STRIPE_CONFIG.merchantDisplayName}
    >
      {children}
    </StripeProvider>
  );
}
