/**
 * Stripe Provider Wrapper (Web)
 * On web, this is just a pass-through component
 */

import * as React from "react";

interface StripeWrapperProps {
  children: React.ReactNode;
}

export function StripeWrapper({ children }: StripeWrapperProps) {
  // On web, just render children without StripeProvider
  return <>{children}</>;
}
