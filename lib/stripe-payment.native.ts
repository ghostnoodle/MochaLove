/**
 * Native Stripe Payment Handler (iOS/Android only)
 * This file handles the actual Stripe payment flow on mobile devices
 */

import { useStripe } from "@stripe/stripe-react-native";
import { Alert } from "react-native";
import { paymentService } from "./payment-service";

export function useStripePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const processPayment = async (params: {
    packageId: string;
    amount: number;
    coins: number;
    userId: string;
    userName?: string;
    userEmail?: string;
    onSuccess: () => void;
  }) => {
    try {
      // Step 1: Create payment intent via Supabase Edge Function
      const { clientSecret, paymentIntentId } = await paymentService.createPaymentIntent(
        params.packageId,
        params.amount,
        params.coins,
      );

      // Step 2: Initialize the payment sheet with Stripe
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "MochaLove",
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: params.userName,
          email: params.userEmail,
        },
        applePay: {
          merchantCountryCode: "US",
        },
        googlePay: {
          merchantCountryCode: "US",
          testEnv: true, // Set to false in production
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Step 3: Present the payment sheet (shows card input UI)
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled
        if (presentError.code === "Canceled") {
          return { cancelled: true };
        }
        throw new Error(presentError.message);
      }

      // Step 4: Payment successful! Confirm in backend
      await paymentService.confirmCoinPurchase({
        userId: params.userId,
        packageId: params.packageId,
        coins: params.coins,
        price: params.amount,
        paymentIntentId,
      });

      // Success!
      params.onSuccess();
      return { success: true };
    } catch (error) {
      console.error("Payment error:", error);
      Alert.alert(
        "Payment Failed",
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
      return { error: true };
    }
  };

  return { processPayment };
}
