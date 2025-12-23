/**
 * Web Stripe Payment Handler
 * Opens Stripe Checkout in a new window for web payments
 */

import { Alert, Linking, Platform } from "react-native";
import { paymentService } from "./payment-service";

export function useStripePayment() {
  const processPayment = async (params: {
    packageId: string;
    amount: number;
    coins: number;
    userId: string;
    userName?: string;
    userEmail?: string;
    onSuccess: () => void;
  }) => {
    console.log("🔵 [WEB] Starting payment process...", {
      packageId: params.packageId,
      amount: params.amount,
      coins: params.coins,
      userId: params.userId,
      platform: Platform.OS,
    });

    try {
      // Step 1: Create checkout session via Supabase Edge Function
      console.log("🔵 [WEB] Calling createCheckoutSession...");
      const result = await paymentService.createCheckoutSession(
        params.packageId,
        params.amount,
        params.coins,
        params.userId,
        params.userEmail,
      );

      console.log("🟢 [WEB] Checkout session created:", result);

      const { checkoutUrl, sessionId } = result;

      if (!checkoutUrl) {
        throw new Error("No checkout URL received from server");
      }

      console.log("🔵 [WEB] Opening checkout URL:", checkoutUrl);

      // Step 2: Navigate to Stripe Checkout
      if (Platform.OS === "web") {
        // Validate the checkout URL
        if (!checkoutUrl.startsWith("https://checkout.stripe.com")) {
          console.error("🔴 Invalid checkout URL:", checkoutUrl);
          throw new Error(`Invalid checkout URL: ${checkoutUrl}`);
        }

        // On web, navigate to checkout page (avoids popup blockers)
        console.log("🔵 [WEB] Navigating to Stripe Checkout...");
        console.log("🔵 [WEB] Full URL:", checkoutUrl);
        console.log("🔵 [WEB] User Agent:", navigator.userAgent);
        console.log("🔵 [WEB] Executing redirect now...");

        // Try multiple redirect methods for better mobile browser compatibility
        try {
          // Method 1: Direct navigation (most reliable on mobile)
          console.log("🔵 [WEB] Attempting window.location.href redirect...");
          window.location.href = checkoutUrl;

          // Fallback methods in case the first one fails silently
          setTimeout(() => {
            console.log("⚠️ [WEB] Redirect may have failed, trying window.location.assign...");
            window.location.assign(checkoutUrl);
          }, 500);

          // Success - user is being redirected
          return { success: true, pending: true };
        } catch (redirectError) {
          console.error("🔴 [WEB] Redirect failed:", redirectError);

          // Show manual link as fallback
          Alert.alert("Open Payment Page", "Please click OK to open the payment page", [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {},
            },
            {
              text: "OK",
              onPress: () => {
                window.open(checkoutUrl, "_blank");
              },
            },
          ]);
          return { success: true, pending: true };
        }
      } else {
        // Fallback for non-web platforms
        const supported = await Linking.canOpenURL(checkoutUrl);

        if (supported) {
          await Linking.openURL(checkoutUrl);

          Alert.alert(
            "Complete Your Purchase",
            `You'll be redirected to Stripe Checkout to complete your purchase of ${params.coins.toLocaleString()} coins for $${params.amount.toFixed(2)}.\n\nAfter payment, you'll be redirected back to the app.`,
            [{ text: "OK" }],
          );

          return { success: true, pending: true };
        } else {
          throw new Error("Cannot open payment URL");
        }
      }
    } catch (error) {
      console.error("🔴 [WEB] Payment error:", error);

      // Show detailed error message
      const errorMessage =
        error instanceof Error ? error.message : "Failed to initiate payment. Please try again.";

      Alert.alert(
        "Payment Error",
        `Unable to open Stripe Checkout.\n\nError: ${errorMessage}\n\nPlease check:\n• Edge Function is deployed\n• Stripe key is configured\n• Browser allows popups`,
      );

      return { error: true };
    }
  };

  return { processPayment };
}
