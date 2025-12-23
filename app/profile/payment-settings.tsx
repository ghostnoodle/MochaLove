import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, CreditCard, CheckCircle, AlertCircle, ExternalLink } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { stripeConnectService } from "~/lib/stripe-connect";

export default function PaymentSettingsScreen() {
  console.log("🏦 [PAYMENT-SETTINGS] Screen mounted");

  const { profile } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [connectStatus, setConnectStatus] = React.useState<{
    hasAccount: boolean;
    accountId: string | null;
    isVerified: boolean;
    needsOnboarding: boolean;
  } | null>(null);

  console.log("🏦 [PAYMENT-SETTINGS] Profile:", profile);
  console.log("🏦 [PAYMENT-SETTINGS] Connect status:", connectStatus);
  console.log("🏦 [PAYMENT-SETTINGS] isLoading:", isLoading);
  console.log("🏦 [PAYMENT-SETTINGS] isProcessing:", isProcessing);

  React.useEffect(() => {
    console.log("🏦 [PAYMENT-SETTINGS] useEffect triggered");
    loadConnectStatus();
  }, [profile?.id]);

  const loadConnectStatus = async () => {
    console.log("🏦 [PAYMENT-SETTINGS] loadConnectStatus called");
    if (!profile?.id) {
      console.log("🏦 [PAYMENT-SETTINGS] No profile ID, skipping");
      return;
    }

    try {
      setIsLoading(true);
      console.log("🏦 [PAYMENT-SETTINGS] Fetching connect status...");
      const status = await stripeConnectService.checkUserConnectStatus(profile.id);
      console.log("🏦 [PAYMENT-SETTINGS] Status received:", status);
      setConnectStatus(status);
    } catch (error) {
      console.error("🏦 [PAYMENT-SETTINGS] Error loading connect status:", error);
      Alert.alert("Error", "Failed to load payment settings");
    } finally {
      setIsLoading(false);
      console.log("🏦 [PAYMENT-SETTINGS] Finished loading");
    }
  };

  const handleSetupBankAccount = async () => {
    console.log("🏦 [PAYMENT-SETTINGS] handleSetupBankAccount called");
    console.log("🏦 [PAYMENT-SETTINGS] Profile ID:", profile?.id);
    console.log("🏦 [PAYMENT-SETTINGS] Profile email:", profile?.email);

    if (!profile?.id || !profile?.email) {
      console.log("🏦 [PAYMENT-SETTINGS] Missing profile ID or email");
      Alert.alert("Error", "Please log in to set up your bank account");
      return;
    }

    console.log("🏦 [PAYMENT-SETTINGS] Starting setup...");
    setIsProcessing(true);

    // Declare accountId outside try block so it's accessible in catch block
    let accountId = connectStatus?.accountId;

    try {
      console.log("🏦 [PAYMENT-SETTINGS] Current account ID:", accountId);

      // Create Connect account if user doesn't have one
      if (!connectStatus?.hasAccount) {
        console.log("🏦 [PAYMENT-SETTINGS] No account, creating new one...");
        accountId = await stripeConnectService.createConnectedAccount(profile.id, profile.email);
        console.log("🏦 [PAYMENT-SETTINGS] Created account:", accountId);
      }

      if (!accountId) {
        throw new Error("Failed to create Connect account");
      }

      // Generate onboarding link
      console.log("🏦 [PAYMENT-SETTINGS] Generating onboarding link...");
      console.log("🏦 [PAYMENT-SETTINGS] Account ID:", accountId);

      const refreshUrl = `${window?.location?.origin || "exp://192.168.1.1:8081"}/profile/payment-settings`;
      const returnUrl = `${window?.location?.origin || "exp://192.168.1.1:8081"}/profile/payment-settings?onboarding=complete`;

      console.log("🏦 [PAYMENT-SETTINGS] Refresh URL:", refreshUrl);
      console.log("🏦 [PAYMENT-SETTINGS] Return URL:", returnUrl);

      const onboardingUrl = await stripeConnectService.createOnboardingLink(
        accountId,
        refreshUrl,
        returnUrl,
      );

      console.log("🏦 [PAYMENT-SETTINGS] Onboarding URL received:", onboardingUrl);
      console.log("🏦 [PAYMENT-SETTINGS] URL length:", onboardingUrl?.length);

      // Open Stripe onboarding
      console.log("🏦 [PAYMENT-SETTINGS] Checking if URL can be opened...");
      const supported = await Linking.canOpenURL(onboardingUrl);
      console.log("🏦 [PAYMENT-SETTINGS] URL supported:", supported);

      if (supported) {
        console.log("🏦 [PAYMENT-SETTINGS] Opening URL with Linking.openURL...");
        await Linking.openURL(onboardingUrl);
        console.log("🏦 [PAYMENT-SETTINGS] Linking.openURL called successfully");
      } else {
        console.log("🏦 [PAYMENT-SETTINGS] URL not supported");
        Alert.alert("Error", "Unable to open onboarding link. URL not supported.");
      }
    } catch (error) {
      console.error("🏦 [PAYMENT-SETTINGS] Error setting up bank account:", error);
      console.error("🏦 [PAYMENT-SETTINGS] Error name:", error?.name);
      console.error("🏦 [PAYMENT-SETTINGS] Error message:", error?.message);
      console.error("🏦 [PAYMENT-SETTINGS] Error stack:", error?.stack);
      console.error("🏦 [PAYMENT-SETTINGS] Full error object:", JSON.stringify(error, null, 2));

      // Check if this is a network/fetch error (Draftbit sandbox limitation)
      const errorMessage = error?.message || "";
      if (
        errorMessage.includes("Failed to send a request") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("network")
      ) {
        console.log("🏦 [PAYMENT-SETTINGS] Detected network restriction");

        // Generate Stripe Connect dashboard URL for manual access
        const stripeAccountUrl = `https://dashboard.stripe.com/test/connect/accounts/${accountId}`;

        Alert.alert(
          "Sandbox Limitation Detected",
          "The Draftbit sandbox is blocking API requests to Stripe. You have two options:\n\n1. Open your Stripe Dashboard manually\n2. Deploy this app to test on a real device",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Stripe Dashboard",
              onPress: () => {
                console.log("🏦 [PAYMENT-SETTINGS] Opening Stripe Dashboard:", stripeAccountUrl);
                Linking.openURL(stripeAccountUrl).catch((err) => {
                  console.error("🏦 [PAYMENT-SETTINGS] Failed to open URL:", err);
                  Alert.alert("Error", "Could not open Stripe Dashboard");
                });
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", `Failed to set up bank account: ${errorMessage}. Please try again.`);
      }
    } finally {
      console.log("🏦 [PAYMENT-SETTINGS] Setting isProcessing to false");
      setIsProcessing(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!connectStatus?.accountId) return;

    setIsProcessing(true);
    try {
      const status = await stripeConnectService.getAccountStatus(connectStatus.accountId);

      // Reload the full connect status
      await loadConnectStatus();

      if (status.payoutsEnabled) {
        Alert.alert(
          "Verification Complete! ✅",
          "Your bank account is verified and ready to receive payouts.",
        );
      } else if (status.requirements.currentlyDue.length > 0) {
        Alert.alert(
          "Additional Information Required",
          "Please complete the onboarding process to verify your bank account.",
        );
      } else {
        Alert.alert(
          "Verification In Progress",
          "Your account is being verified. This usually takes a few minutes.",
        );
      }
    } catch (error) {
      console.error("Error refreshing status:", error);
      Alert.alert("Error", "Failed to refresh status");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333EA" />
          <Text className="mt-4 text-muted-foreground">Loading payment settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Payment Settings</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Bank Account Status Card */}
        <View className="m-6">
          {connectStatus?.isVerified ? (
            // Verified State
            <View className="bg-green-50 dark:bg-green-950 rounded-3xl p-6 border border-green-200 dark:border-green-800">
              <View className="flex-row items-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <Text className="text-lg font-bold text-green-900 dark:text-green-100">
                  Bank Account Verified ✅
                </Text>
              </View>
              <Text className="text-sm text-green-700 dark:text-green-300 mb-4">
                Your bank account is connected and verified. You're ready to receive cash-outs!
              </Text>
              <View className="flex-row items-center bg-green-100 dark:bg-green-900 rounded-xl p-3">
                <CreditCard className="h-5 w-5 text-green-600 mr-2" />
                <Text className="text-sm font-medium text-green-900 dark:text-green-100">
                  Account ending in ••••
                </Text>
              </View>
            </View>
          ) : connectStatus?.hasAccount && connectStatus?.needsOnboarding ? (
            // Pending Verification State
            <View className="bg-orange-50 dark:bg-orange-950 rounded-3xl p-6 border border-orange-200 dark:border-orange-800">
              <View className="flex-row items-center mb-3">
                <AlertCircle className="h-6 w-6 text-orange-600 mr-2" />
                <Text className="text-lg font-bold text-orange-900 dark:text-orange-100">
                  Verification Pending
                </Text>
              </View>
              <Text className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                Your bank account setup is incomplete. Please complete the onboarding process to
                verify your account.
              </Text>
              <TouchableOpacity
                onPress={handleSetupBankAccount}
                disabled={isProcessing}
                className="bg-orange-600 rounded-xl py-3 flex-row items-center justify-center"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5 text-white mr-2" />
                    <Text className="text-white font-semibold">Complete Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Not Set Up State
            <View className="bg-card rounded-3xl p-6 border border-border">
              <View className="flex-row items-center mb-3">
                <CreditCard className="h-6 w-6 text-primary mr-2" />
                <Text className="text-lg font-bold text-foreground">No Bank Account Connected</Text>
              </View>
              <Text className="text-sm text-muted-foreground mb-4">
                Connect your bank account to receive cash-outs. You'll be redirected to Stripe's
                secure onboarding to add your bank details.
              </Text>
              <TouchableOpacity
                onPress={handleSetupBankAccount}
                disabled={isProcessing}
                className="bg-primary rounded-xl py-4"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-center font-bold text-primary-foreground text-base">
                    Set Up Bank Account
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Refresh Status Button */}
          {connectStatus?.hasAccount && (
            <TouchableOpacity
              onPress={handleRefreshStatus}
              disabled={isProcessing}
              className="mt-4 bg-card rounded-2xl py-3 border border-border"
            >
              <Text className="text-center font-medium text-foreground">
                {isProcessing ? "Refreshing..." : "Refresh Status"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Information Section */}
        <View className="px-6 pb-8">
          <Text className="text-lg font-bold text-foreground mb-4">How It Works</Text>

          <View className="bg-card rounded-2xl p-4 border border-border mb-3">
            <Text className="text-sm font-medium text-foreground mb-2">🔒 Secure & Safe</Text>
            <Text className="text-sm text-muted-foreground">
              Your bank details are securely handled by Stripe. We never see or store your bank
              account information.
            </Text>
          </View>

          <View className="bg-card rounded-2xl p-4 border border-border mb-3">
            <Text className="text-sm font-medium text-foreground mb-2">⚡ Fast Verification</Text>
            <Text className="text-sm text-muted-foreground">
              Most bank accounts are verified instantly. You'll be able to request cash-outs as soon
              as verification is complete.
            </Text>
          </View>

          <View className="bg-card rounded-2xl p-4 border border-border">
            <Text className="text-sm font-medium text-foreground mb-2">💰 Cash-Out Ready</Text>
            <Text className="text-sm text-muted-foreground">
              Once verified, you can cash out your earnings anytime (minimum $50). Funds typically
              arrive in 2-5 business days.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
