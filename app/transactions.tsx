import * as React from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Gift,
  Video,
} from "lucide-react-native";
import { iconWithClassName } from "~/lib/icons/iconWithClassName";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";
import { TouchableOpacity } from "react-native";

// Register icons
iconWithClassName(ArrowLeft);
iconWithClassName(TrendingUp);
iconWithClassName(TrendingDown);
iconWithClassName(MessageCircle);
iconWithClassName(Gift);
iconWithClassName(Video);

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load transactions
  React.useEffect(() => {
    if (!user?.id) return;

    const loadTransactions = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("transactions")
          .select("id, type, amount, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        setTransactions(data || []);
        console.log("💰 [TRANSACTIONS] Loaded", data?.length || 0, "transactions");
      } catch (error) {
        console.error("Error loading transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();

    // Subscribe to real-time transaction updates
    const subscription = supabase
      .channel(`transactions-list-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("💰 [TRANSACTIONS] New transaction received:", payload);
          setTransactions((prev) => [payload.new as Transaction, ...prev]);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "message_received":
        return MessageCircle;
      case "gift_received":
        return Gift;
      case "video_call":
        return Video;
      default:
        return TrendingDown;
    }
  };

  const getTransactionColor = (type: string) => {
    // Earnings are green (positive)
    if (
      type === "message_received" ||
      type === "gift_received" ||
      type === "video_call" ||
      type === "daily_bonus" ||
      type === "new_user_bonus"
    ) {
      return "text-primary";
    }
    // Withdrawals/spending are red (negative)
    return "text-red-500";
  };

  const isEarning = (type: string) => {
    return (
      type === "message_received" ||
      type === "gift_received" ||
      type === "video_call" ||
      type === "daily_bonus" ||
      type === "new_user_bonus"
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Transaction History</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
          <Text className="text-xl font-semibold text-foreground mb-2">No Transactions Yet</Text>
          <Text className="text-muted-foreground text-center">
            Your coin earnings and withdrawals will appear here
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-4">
            {transactions.map((transaction) => {
              const IconComponent = getTransactionIcon(transaction.type);
              const color = getTransactionColor(transaction.type);
              const earning = isEarning(transaction.type);
              const amountInDollars = transaction.amount / 100;

              return (
                <View
                  key={transaction.id}
                  className="bg-card rounded-2xl p-4 mb-3 border border-border"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`${earning ? "bg-primary/10" : "bg-red-500/10"} rounded-xl p-3 mr-3`}
                      >
                        <IconComponent className={`h-5 w-5 ${color}`} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground mb-1">
                          {transaction.description}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {formatTimestamp(transaction.created_at)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end ml-2">
                      <Text className={`text-lg font-bold ${color}`}>
                        {earning ? "+" : "-"}${amountInDollars.toFixed(2)}
                      </Text>
                      <View
                        className={`${earning ? "bg-primary/20" : "bg-red-500/20"} rounded-full px-2 py-0.5 mt-1`}
                      >
                        <Text className={`text-xs font-semibold ${color}`}>
                          {earning ? "Earned" : "Spent"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
