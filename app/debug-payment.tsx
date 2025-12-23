import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";

/**
 * Payment Debug Screen
 * Use this to diagnose why coin balance isn't updating after payment
 */
export default function DebugPaymentScreen() {
  const { user, profile } = useAuth();
  const [diagnostics, setDiagnostics] = React.useState<any>(null);
  const [isChecking, setIsChecking] = React.useState(false);

  const runDiagnostics = async () => {
    if (!user?.id) {
      Alert.alert("Error", "Not logged in");
      return;
    }

    setIsChecking(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      checks: {},
    };

    try {
      // Check 1: Can we read from users table?
      console.log("🔍 Checking database access...");
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, coins, email")
        .eq("id", user.id)
        .single();

      results.checks.databaseAccess = {
        success: !userError,
        error: userError?.message,
        data: userData,
      };

      // Check 2: Can we read transactions?
      console.log("🔍 Checking transactions table...");
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "coin_purchase")
        .order("created_at", { ascending: false })
        .limit(5);

      results.checks.transactions = {
        success: !txError,
        error: txError?.message,
        count: transactions?.length || 0,
        recent: transactions,
      };

      // Check 3: Test if RPC function exists
      console.log("🔍 Testing process_coin_purchase RPC function...");
      try {
        // This will fail if function doesn't exist or if we can't call it
        // We're passing invalid data to test if the function exists
        const { error: rpcError } = await supabase.rpc("process_coin_purchase", {
          p_user_id: "00000000-0000-0000-0000-000000000000", // Fake UUID
          p_coins: 0,
          p_amount_cents: 0,
          p_payment_intent_id: "test",
          p_package_id: "test",
        });

        results.checks.rpcFunction = {
          exists: true,
          note: "Function exists (may have failed due to test data, which is expected)",
          error: rpcError?.message,
        };
      } catch (err: any) {
        results.checks.rpcFunction = {
          exists: false,
          error: err.message || "Function does not exist",
        };
      }

      // Check 4: Test realtime connection
      console.log("🔍 Testing realtime subscriptions...");
      let realtimeWorks = false;
      const channel = supabase.channel("test-channel-" + Date.now());

      await new Promise<void>((resolve) => {
        channel
          .on("broadcast", { event: "test" }, () => {
            realtimeWorks = true;
          })
          .subscribe((status) => {
            console.log("Realtime status:", status);
            if (status === "SUBSCRIBED") {
              setTimeout(() => {
                channel.send({
                  type: "broadcast",
                  event: "test",
                  payload: {},
                });
                setTimeout(() => {
                  channel.unsubscribe();
                  resolve();
                }, 500);
              }, 100);
            } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
              resolve();
            }
          });

        // Timeout after 3 seconds
        setTimeout(() => {
          channel.unsubscribe();
          resolve();
        }, 3000);
      });

      results.checks.realtime = {
        enabled: realtimeWorks,
        note: realtimeWorks ? "Realtime is working" : "Realtime may not be enabled",
      };

      // Check 5: Edge functions URLs
      results.checks.edgeFunctions = {
        checkoutSession:
          "https://ioscbfcleqiclevlokmo.supabase.co/functions/v1/create-checkout-session",
        webhook: "https://ioscbfcleqiclevlokmo.supabase.co/functions/v1/stripe-webhook",
        note: "These URLs should be used in Stripe webhook configuration",
      };

      console.log("✅ Diagnostics complete:", results);
      setDiagnostics(results);

      // Show summary
      const issues: string[] = [];
      if (!results.checks.databaseAccess.success) {
        issues.push("❌ Cannot read from database");
      }
      if (!results.checks.rpcFunction.exists) {
        issues.push("❌ process_coin_purchase function not found");
      }
      if (!results.checks.realtime.enabled) {
        issues.push("⚠️ Realtime may not be enabled");
      }

      if (issues.length > 0) {
        Alert.alert("Issues Found", issues.join("\n\n"));
      } else {
        Alert.alert(
          "Checks Passed!",
          "Database setup looks good. If payments still aren't working, check:\n\n" +
            "1. Stripe webhook is configured in Stripe Dashboard\n" +
            "2. STRIPE_WEBHOOK_SECRET is set in Supabase\n" +
            "3. Edge functions are deployed",
        );
      }
    } catch (error: any) {
      console.error("Error running diagnostics:", error);
      results.checks.error = error.message;
      setDiagnostics(results);
      Alert.alert("Error", error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const manuallyAddCoins = async () => {
    if (!user?.id) return;

    Alert.alert(
      "Manual Coin Test",
      "This will manually add 100 test coins to verify database write access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Test Coins",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("users")
                .update({ coins: (profile?.coins || 0) + 100 })
                .eq("id", user.id);

              if (error) throw error;

              Alert.alert("Success!", "100 test coins added. Check if your balance updated.");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Payment Diagnostics" }} />
      <ScrollView className="flex-1 px-6 py-4">
        <Text className="text-2xl font-bold text-foreground mb-4">Payment Debug Tool</Text>

        <View className="bg-card rounded-2xl p-4 border border-border mb-4">
          <Text className="text-sm text-muted-foreground mb-4">
            This tool helps diagnose why coin balance might not be updating after payment.
          </Text>

          <TouchableOpacity
            onPress={runDiagnostics}
            disabled={isChecking}
            className="bg-primary rounded-xl py-3 mb-3"
          >
            <Text className="text-center text-primary-foreground font-semibold">
              {isChecking ? "Running Diagnostics..." : "Run Diagnostics"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={manuallyAddCoins}
            disabled={isChecking}
            className="bg-secondary rounded-xl py-3"
          >
            <Text className="text-center text-secondary-foreground font-semibold">
              Manual Coin Test (+100)
            </Text>
          </TouchableOpacity>
        </View>

        {diagnostics && (
          <View className="bg-card rounded-2xl p-4 border border-border">
            <Text className="text-lg font-bold text-foreground mb-3">Results</Text>

            <Text className="text-xs font-mono text-muted-foreground mb-2">
              User ID: {diagnostics.userId}
            </Text>
            <Text className="text-xs font-mono text-muted-foreground mb-4">
              Time: {diagnostics.timestamp}
            </Text>

            {/* Database Access */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">✓ Database Access</Text>
              <Text className="text-xs text-muted-foreground">
                {diagnostics.checks.databaseAccess.success
                  ? `✅ Success - Current coins: ${diagnostics.checks.databaseAccess.data?.coins || 0}`
                  : `❌ Failed - ${diagnostics.checks.databaseAccess.error}`}
              </Text>
            </View>

            {/* Transactions */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                ✓ Transactions Table
              </Text>
              <Text className="text-xs text-muted-foreground">
                {diagnostics.checks.transactions.success
                  ? `✅ Found ${diagnostics.checks.transactions.count} coin purchase(s)`
                  : `❌ Failed - ${diagnostics.checks.transactions.error}`}
              </Text>
            </View>

            {/* RPC Function */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">✓ RPC Function</Text>
              <Text className="text-xs text-muted-foreground">
                {diagnostics.checks.rpcFunction.exists
                  ? "✅ process_coin_purchase exists"
                  : "❌ Function not found - Run SQL schema!"}
              </Text>
            </View>

            {/* Realtime */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">✓ Realtime</Text>
              <Text className="text-xs text-muted-foreground">
                {diagnostics.checks.realtime.enabled
                  ? "✅ Enabled"
                  : "⚠️ May not be enabled - check Supabase settings"}
              </Text>
            </View>

            {/* Edge Functions */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                ✓ Edge Function URLs
              </Text>
              <Text className="text-xs text-muted-foreground mb-1">
                Webhook: {diagnostics.checks.edgeFunctions.webhook}
              </Text>
              <Text className="text-xs text-muted-foreground">
                Checkout: {diagnostics.checks.edgeFunctions.checkoutSession}
              </Text>
            </View>
          </View>
        )}

        <View className="bg-muted rounded-2xl p-4 mt-4">
          <Text className="text-sm font-semibold text-foreground mb-2">
            Common Issues & Solutions
          </Text>
          <Text className="text-xs text-muted-foreground mb-2">
            1. <Text className="font-bold">Database schema not applied:</Text> Run
            supabase-payments-schema.sql in Supabase SQL Editor
          </Text>
          <Text className="text-xs text-muted-foreground mb-2">
            2. <Text className="font-bold">Webhook not configured:</Text> Add webhook endpoint in
            Stripe Dashboard pointing to stripe-webhook function
          </Text>
          <Text className="text-xs text-muted-foreground mb-2">
            3. <Text className="font-bold">Missing secrets:</Text> Set STRIPE_SECRET_KEY and
            STRIPE_WEBHOOK_SECRET in Supabase
          </Text>
          <Text className="text-xs text-muted-foreground">
            4. <Text className="font-bold">Edge functions not deployed:</Text> Deploy
            create-checkout-session and stripe-webhook functions
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
