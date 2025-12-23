import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Coins, Gift, MessageCircle, Video } from "~/lib/icons";
import { TrendingUp, DollarSign } from "lucide-react-native";
import { iconWithClassName } from "~/lib/icons/iconWithClassName";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";
import { giftService } from "~/lib/gifts";

// Register icons
iconWithClassName(TrendingUp);
iconWithClassName(DollarSign);

export default function BalanceScreen() {
  const { profile, user } = useAuth();
  const [earningsInDollars, setEarningsInDollars] = React.useState((profile?.earnings || 0) / 100); // Convert cents to dollars
  const [earningsBreakdown, setEarningsBreakdown] = React.useState([
    {
      type: "Messages",
      icon: MessageCircle,
      amount: 0,
      color: "text-blue-500",
    },
    {
      type: "Video Calls",
      icon: Video,
      amount: 0,
      color: "text-purple-500",
    },
    {
      type: "Gifts Received",
      icon: Gift,
      amount: 0,
      color: "text-primary",
    },
  ]);
  const [pendingGifts, setPendingGifts] = React.useState<any[]>([]);
  const [pendingEarnings, setPendingEarnings] = React.useState(0);

  // Redirect men to shop page (they shouldn't access balance page)
  React.useEffect(() => {
    if (profile?.gender === "man") {
      router.replace("/(tabs)/shop");
    }
  }, [profile?.gender]);

  // Fetch real earnings breakdown from transactions with real-time updates
  React.useEffect(() => {
    if (!user?.id) return;

    const loadEarnings = async () => {
      try {
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("type, amount")
          .eq("user_id", user.id)
          .in("type", ["message_received", "video_call", "gift_received"]);

        if (error) throw error;

        // Calculate totals by type
        const messageEarnings =
          transactions
            ?.filter((t) => t.type === "message_received")
            .reduce((sum, t) => sum + t.amount, 0) || 0;

        const videoEarnings =
          transactions
            ?.filter((t) => t.type === "video_call")
            .reduce((sum, t) => sum + t.amount, 0) || 0;

        const giftEarnings =
          transactions
            ?.filter((t) => t.type === "gift_received")
            .reduce((sum, t) => sum + t.amount, 0) || 0;

        // Convert cents to dollars
        setEarningsBreakdown([
          {
            type: "Messages",
            icon: MessageCircle,
            amount: messageEarnings / 100,
            color: "text-blue-500",
          },
          {
            type: "Video Calls",
            icon: Video,
            amount: videoEarnings / 100,
            color: "text-purple-500",
          },
          {
            type: "Gifts Received",
            icon: Gift,
            amount: giftEarnings / 100,
            color: "text-primary",
          },
        ]);

        console.log("💰 [BALANCE] Loaded earnings breakdown");
      } catch (error) {
        console.error("Error loading earnings:", error);
      }
    };

    // Load initial earnings
    loadEarnings();

    // Subscribe to real-time transaction updates
    const subscription = supabase
      .channel(`transactions-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("💰 [BALANCE] Real-time transaction received:", payload);
          // Reload earnings immediately when new transaction is added
          loadEarnings();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Subscribe to real-time balance updates
  React.useEffect(() => {
    if (!user?.id) return;

    console.log("💰 [BALANCE] Profile earnings:", profile?.earnings, "cents");
    console.log("💰 [BALANCE] Full profile:", profile);

    // Update initial balance from earnings (convert cents to dollars)
    const earningsInCents = profile?.earnings || 0;
    const earningsInDollars = earningsInCents / 100;
    console.log(
      "💰 [BALANCE] Setting earnings: $",
      earningsInDollars.toFixed(2),
      "from",
      earningsInCents,
      "cents",
    );
    setEarningsInDollars(earningsInDollars);

    // Subscribe to user earnings changes
    const balanceSubscription = supabase
      .channel(`user-balance-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("💰 [BALANCE] Real-time earnings update:", payload);
          console.log("💰 [BALANCE] New earnings value:", payload.new?.earnings);
          if (payload.new && "earnings" in payload.new) {
            // Convert cents to dollars
            const newEarningsInDollars = (payload.new.earnings || 0) / 100;
            console.log(
              "💰 [BALANCE] Updating UI with new earnings: $",
              newEarningsInDollars.toFixed(2),
            );
            setEarningsInDollars(newEarningsInDollars);
          }
        },
      )
      .subscribe((status) => {
        console.log("💰 [BALANCE] Subscription status:", status);
      });

    return () => {
      console.log("💰 [BALANCE] Unsubscribing from balance updates");
      balanceSubscription.unsubscribe();
    };
  }, [user?.id, profile?.earnings]);

  // Load and subscribe to pending gifts
  React.useEffect(() => {
    if (!user?.id || profile?.gender !== "woman") return;

    const loadPendingGifts = async () => {
      try {
        const gifts = await giftService.getPendingGifts(user.id);
        setPendingGifts(gifts);

        // Calculate total pending earnings
        const totalPending = gifts.reduce((sum, gift) => {
          return sum + Math.round((gift.coins_spent / 2) * 5);
        }, 0);
        setPendingEarnings(totalPending / 100); // Convert cents to dollars

        console.log("💰 [BALANCE] Loaded pending gifts:", gifts.length);
      } catch (error) {
        console.error("Error loading pending gifts:", error);
      }
    };

    loadPendingGifts();

    // Subscribe to real-time gift transaction updates
    const subscription = supabase
      .channel(`gift-transactions-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gift_transactions",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("💰 [BALANCE] Real-time gift transaction update:", payload);
          loadPendingGifts();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, profile?.gender]);

  const handleCashOut = () => {
    console.log("💵 [BALANCE] Cash Out button clicked");
    console.log("💵 [BALANCE] Current earnings:", earningsInDollars);
    console.log("💵 [BALANCE] Profile:", profile);

    if (earningsInDollars < 50) {
      console.log("💵 [BALANCE] Below minimum threshold");
      Alert.alert(
        "Minimum Cash Out",
        "You need at least $50.00 to cash out. Keep chatting to reach the minimum!",
      );
      return;
    }

    console.log("💵 [BALANCE] Navigating to /profile/cash-out");
    router.push("/profile/cash-out");
  };

  const handleViewTransactions = () => {
    // Navigate to transactions page
    router.push("/transactions");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="bg-card px-6 py-8 border-b border-border">
          {/* Transaction History Button - Top Right */}
          <TouchableOpacity
            onPress={handleViewTransactions}
            className="absolute top-4 right-4 bg-primary/20 rounded-full p-2 border border-primary"
          >
            <Coins className="h-5 w-5 text-primary" />
          </TouchableOpacity>

          <View className="items-center">
            <View className="bg-primary/20 rounded-full p-4 mb-4">
              <DollarSign className="h-12 w-12 text-primary" />
            </View>
            <Text className="text-3xl font-bold text-foreground mb-2">Your Earnings</Text>
            <View className="flex-row items-center bg-background rounded-2xl px-6 py-3 border border-border">
              <DollarSign className="h-6 w-6 text-primary mr-2" />
              <Text className="text-4xl font-bold text-primary">
                {earningsInDollars.toFixed(2)}
              </Text>
            </View>
            <Text className="text-sm text-muted-foreground mt-2">Available to cash out</Text>

            {/* Pending Earnings Indicator */}
            {pendingEarnings > 0 && (
              <View className="mt-3 bg-yellow-500/20 rounded-xl px-4 py-2 border border-yellow-500">
                <Text className="text-sm text-yellow-700 font-semibold text-center">
                  +${pendingEarnings.toFixed(2)} pending • Reply to {pendingGifts.length} gift
                  {pendingGifts.length !== 1 ? "s" : ""} to claim
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Banner */}
        <View className="mx-6 mt-6 bg-primary/10 rounded-2xl p-4 border border-primary/30">
          <View className="flex-row items-center justify-center">
            <Coins className="h-5 w-5 text-primary mr-2" />
            <Text className="text-sm text-foreground font-semibold">
              Collect 5 coins ($0.25) by replying to messages
            </Text>
          </View>
        </View>

        {/* Cash Out Button */}
        <View className="px-6 mt-6">
          <TouchableOpacity
            onPress={handleCashOut}
            activeOpacity={0.7}
            disabled={earningsInDollars < 50}
            className={`rounded-2xl py-4 ${earningsInDollars >= 50 ? "bg-primary" : "bg-muted"}`}
          >
            <Text
              className={`text-center text-lg font-bold ${
                earningsInDollars >= 50 ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {earningsInDollars >= 50 ? "Cash Out Now" : "Minimum $50.00 to Cash Out"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Gifts Section */}
        {pendingGifts.length > 0 && (
          <View className="px-6 py-6 border-t border-border">
            <Text className="text-2xl font-bold text-foreground mb-2">⏰ Pending Gifts</Text>
            <Text className="text-sm text-muted-foreground mb-4">
              Reply to these gifts within 24 hours to claim your earnings!
            </Text>

            {pendingGifts.map((gift) => {
              const expiresAt = new Date(gift.expires_at);
              const now = new Date();
              const hoursLeft = Math.max(
                0,
                Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
              );
              const earningsAmount = (gift.coins_spent / 2) * 0.05;

              return (
                <TouchableOpacity
                  key={gift.id}
                  onPress={() => {
                    // Navigate to chat to reply
                    if (gift.message_id) {
                      // Navigate to the conversation
                      const conversationId = gift.sender_id; // Assuming conversation ID logic
                      router.push(`/chat/${conversationId}`);
                    }
                  }}
                  className="bg-card rounded-2xl p-4 mb-3 border-2 border-yellow-500"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="bg-primary/10 rounded-xl p-3 mr-4">
                      <Text className="text-3xl">{gift.gift_icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">
                        {gift.gift_name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        From sender • {hoursLeft}h left to claim
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-bold text-primary">
                        +${earningsAmount.toFixed(2)}
                      </Text>
                      <Text className="text-xs text-yellow-600 font-semibold">Pending</Text>
                    </View>
                  </View>
                  <View className="mt-2 bg-yellow-500/10 rounded-lg p-2">
                    <Text className="text-xs text-yellow-700 text-center font-semibold">
                      Tap to view • Send any message to claim
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Gifts Received Section */}
        <View className="px-6 py-6">
          <Text className="text-2xl font-bold text-foreground mb-4">🎁 Gifts Received</Text>

          {/* No gifts yet placeholder */}
          <View className="bg-card rounded-2xl p-8 border border-border items-center">
            <Gift className="h-16 w-16 text-muted-foreground mb-4" />
            <Text className="text-lg font-semibold text-foreground mb-2">No Gifts Yet</Text>
            <Text className="text-sm text-muted-foreground text-center">
              When you receive gifts from admirers, they'll appear here!
            </Text>
          </View>

          {/* Gift examples - for future implementation
          <View className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center">
            <View className="bg-primary/10 rounded-xl p-3 mr-4">
              <Text className="text-3xl">🌹</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Rose</Text>
              <Text className="text-xs text-muted-foreground">From John • 2 hours ago</Text>
            </View>
            <Text className="text-sm font-bold text-primary">+$2.50</Text>
          </View>
          */}
        </View>

        {/* How It Works */}
        <View className="px-6 pb-8">
          <View className="bg-card rounded-2xl p-5 border border-border">
            <Text className="text-lg font-bold text-foreground mb-4 text-center">
              💰 How You Earn
            </Text>
            <View className="space-y-2">
              <View className="flex-row items-start mb-3">
                <Text className="text-primary mr-2">💬</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Messages</Text>
                  <Text className="text-xs text-muted-foreground">
                    Collect 5 coins ($0.25) each time you reply to a man's message
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <Text className="text-primary mr-2">🎁</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Gifts</Text>
                  <Text className="text-xs text-muted-foreground">
                    Earn 50% of the coin value when you receive gifts
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Cash Out Info */}
        <View className="px-6 pb-8">
          <View className="bg-muted rounded-2xl p-4">
            <Text className="text-sm text-foreground text-center mb-2 font-semibold">
              ℹ️ Cash Out Information
            </Text>
            <Text className="text-xs text-muted-foreground text-center">
              • Minimum cash out: $50.00
            </Text>
            <Text className="text-xs text-muted-foreground text-center">
              • Processing time: 2-5 business days
            </Text>
            <Text className="text-xs text-muted-foreground text-center">
              • Secure bank transfers via Stripe
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
