import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, DollarSign, CreditCard, Settings, TrendingUp } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { paymentService } from "~/lib/payment-service";
import { stripeConnectService } from "~/lib/stripe-connect";

export default function CashOutScreen() {
  console.log("💸 [CASH-OUT] Screen mounted");

  const { profile } = useAuth();
  const [amount, setAmount] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(true);
  const [connectStatus, setConnectStatus] = React.useState<{
    hasAccount: boolean;
    accountId: string | null;
    isVerified: boolean;
    needsOnboarding: boolean;
  } | null>(null);

  const availableBalance = ((profile?.earnings || 0) / 100).toFixed(2);
  const minCashout = 50.0; // Minimum $50 cashout

  console.log("💸 [CASH-OUT] Profile ID:", profile?.id);
  console.log("💸 [CASH-OUT] Available balance:", availableBalance);
  console.log("💸 [CASH-OUT] Connect status:", connectStatus);

  React.useEffect(() => {
    console.log("💸 [CASH-OUT] useEffect triggered");
    checkConnectStatus();
  }, [profile?.id]);

  const checkConnectStatus = async () => {
    console.log("💸 [CASH-OUT] checkConnectStatus called");
    if (!profile?.id) {
      console.log("💸 [CASH-OUT] No profile ID, skipping");
      return;
    }

    try {
      setIsCheckingStatus(true);
      console.log("💸 [CASH-OUT] Calling stripeConnectService...");
      const status = await stripeConnectService.checkUserConnectStatus(profile.id);
      console.log("💸 [CASH-OUT] Status received:", status);
      setConnectStatus(status);
    } catch (error) {
      console.error("💸 [CASH-OUT] Error checking connect status:", error);
      console.error("💸 [CASH-OUT] Error details:", JSON.stringify(error, null, 2));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCashOut = async () => {
    console.log("💸 [CASH-OUT] handleCashOut called, amount:", amount);
    const cashoutAmount = parseFloat(amount);

    // Validation
    if (!amount || isNaN(cashoutAmount)) {
      console.log("💸 [CASH-OUT] Invalid amount");
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (cashoutAmount < minCashout) {
      console.log("💸 [CASH-OUT] Below minimum");
      Alert.alert("Error", `Minimum cashout amount is $${minCashout.toFixed(2)}`);
      return;
    }

    if (cashoutAmount > parseFloat(availableBalance)) {
      console.log("💸 [CASH-OUT] Insufficient balance");
      Alert.alert("Error", "Insufficient balance");
      return;
    }

    if (!profile?.id) {
      console.log("💸 [CASH-OUT] No profile ID");
      Alert.alert("Error", "Please log in to request cash out");
      return;
    }

    // Check if user has verified bank account
    console.log("💸 [CASH-OUT] Checking if verified:", connectStatus?.isVerified);
    if (!connectStatus?.isVerified) {
      console.log("💸 [CASH-OUT] Not verified, showing alert");
      Alert.alert(
        "Bank Account Required",
        "You need to set up and verify your bank account before requesting a cash-out.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set Up Now",
            onPress: () => {
              console.log("💸 [CASH-OUT] Navigating to payment settings");
              router.push("/profile/payment-settings");
            },
          },
        ],
      );
      return;
    }

    console.log("💸 [CASH-OUT] Starting request...");
    setIsProcessing(true);

    try {
      console.log("💸 [CASH-OUT] Calling paymentService.requestCashOut");
      await paymentService.requestCashOut({
        userId: profile.id,
        amountCents: Math.round(cashoutAmount * 100),
        paymentMethod: "stripe",
        accountDetails: `Stripe Connect: ${connectStatus.accountId}`,
      });

      console.log("💸 [CASH-OUT] Request successful!");
      Alert.alert(
        "Cash Out Request Submitted ✅",
        `Your request to cash out $${cashoutAmount.toFixed(2)} has been submitted for admin review. Once approved, funds will be transferred to your bank account within 2-5 business days.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("💸 [CASH-OUT] Error:", error);
      console.error("💸 [CASH-OUT] Stack:", error.stack);
      Alert.alert("Error", `Failed to submit: ${error.message || "Please try again."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    const quickAmount = (parseFloat(availableBalance) * percentage).toFixed(2);
    setAmount(quickAmount);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Cash Out</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Available Balance Card */}
        <View className="m-6 bg-gradient-to-br from-primary to-primary/70 rounded-3xl p-6">
          <Text className="text-sm text-primary-foreground/80 mb-2">Available Balance</Text>
          <View className="flex-row items-center">
            <DollarSign className="h-8 w-8 text-primary-foreground mr-2" />
            <Text className="text-4xl font-bold text-primary-foreground">{availableBalance}</Text>
          </View>
          <View className="mt-4 pt-4 border-t border-primary-foreground/20">
            <Text className="text-xs text-primary-foreground/80">
              💰 Minimum cashout: ${minCashout.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Cash Out Form */}
        <View className="px-6">
          <Text className="text-lg font-bold text-foreground mb-4">Enter Amount</Text>

          {/* Amount Input */}
          <View className="bg-card rounded-2xl p-4 border border-border mb-4">
            <Text className="text-sm text-muted-foreground mb-2">Amount ($)</Text>
            <View className="flex-row items-center">
              <DollarSign className="h-6 w-6 text-foreground mr-2" />
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                className="flex-1 text-2xl font-bold text-foreground"
              />
            </View>
          </View>

          {/* Quick Amount Buttons */}
          <View className="flex-row gap-2 mb-6">
            <TouchableOpacity
              onPress={() => setQuickAmount(0.25)}
              className="flex-1 bg-card rounded-xl py-3 border border-border"
            >
              <Text className="text-center font-medium text-foreground">25%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setQuickAmount(0.5)}
              className="flex-1 bg-card rounded-xl py-3 border border-border"
            >
              <Text className="text-center font-medium text-foreground">50%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setQuickAmount(0.75)}
              className="flex-1 bg-card rounded-xl py-3 border border-border"
            >
              <Text className="text-center font-medium text-foreground">75%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setQuickAmount(1)}
              className="flex-1 bg-card rounded-xl py-3 border border-border"
            >
              <Text className="text-center font-medium text-foreground">Max</Text>
            </TouchableOpacity>
          </View>

          {/* Payment Method */}
          <Text className="text-lg font-bold text-foreground mb-4">Payment Method</Text>

          {(() => {
            console.log("💸 [CASH-OUT] Rendering payment method section");
            console.log("💸 [CASH-OUT] isCheckingStatus:", isCheckingStatus);
            console.log("💸 [CASH-OUT] connectStatus:", connectStatus);
            console.log("💸 [CASH-OUT] connectStatus?.isVerified:", connectStatus?.isVerified);
            if (isCheckingStatus) {
              console.log("💸 [CASH-OUT] Showing loading state");
            } else if (connectStatus?.isVerified) {
              console.log("💸 [CASH-OUT] Showing verified bank account");
            } else {
              console.log("💸 [CASH-OUT] Showing 'Set Up Bank Account' button");
            }
          })()}

          {isCheckingStatus ? (
            <View className="bg-card rounded-2xl p-4 border border-border mb-6">
              <ActivityIndicator size="small" color="#9333EA" />
              <Text className="text-center text-muted-foreground mt-2">
                Checking bank account status...
              </Text>
            </View>
          ) : connectStatus?.isVerified ? (
            <View className="bg-green-50 dark:bg-green-950 rounded-2xl p-4 border border-green-200 dark:border-green-800 mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-green-500/20 rounded-full p-3 mr-4">
                    <CreditCard className="h-6 w-6 text-green-600" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-green-900 dark:text-green-100">
                      Bank Account Connected ✅
                    </Text>
                    <Text className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Account ending in ••••
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push("/profile/payment-settings")}>
                  <Settings className="h-5 w-5 text-green-600" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                console.log("💸 [CASH-OUT] Set Up Bank Account button clicked");
                console.log("💸 [CASH-OUT] Attempting to navigate to /profile/payment-settings");
                try {
                  router.push("/profile/payment-settings");
                  console.log("💸 [CASH-OUT] Navigation called successfully");
                } catch (error) {
                  console.error("💸 [CASH-OUT] Navigation error:", error);
                }
              }}
              className="bg-orange-50 dark:bg-orange-950 rounded-2xl p-4 border border-orange-200 dark:border-orange-800 mb-6"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-orange-500/20 rounded-full p-3 mr-4">
                    <CreditCard className="h-6 w-6 text-orange-600" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-orange-900 dark:text-orange-100">
                      Set Up Bank Account
                    </Text>
                    <Text className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Required to receive cash-outs
                    </Text>
                  </View>
                </View>
                <ChevronLeft className="h-5 w-5 text-orange-600 rotate-180" />
              </View>
            </TouchableOpacity>
          )}

          {/* Info Box */}
          <View className="bg-primary/20 rounded-xl p-4 border border-primary/30 mb-6">
            <View className="flex-row items-start">
              <TrendingUp className="h-5 w-5 text-primary mr-2 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-primary mb-1">Processing Time</Text>
                <Text className="text-sm text-primary/80">
                  Cash outs are typically processed within 3-5 business days. You'll receive a
                  notification when your payment is on the way.
                </Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleCashOut}
            disabled={isProcessing}
            className="bg-primary rounded-2xl py-4 mb-8"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-center font-bold text-primary-foreground text-lg">
                Request Cash Out
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
