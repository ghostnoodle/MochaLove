import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  DollarSign,
  Gift,
  MessageCircle,
} from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  metadata?: any;
}

export default function TransactionHistoryScreen() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "coins" | "earnings">("all");

  const loadTransactions = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadTransactions();
  }, [profile?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "coin_purchase":
        return <Coins className="h-5 w-5 text-primary" />;
      case "message_sent":
      case "message_received":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case "gift_sent":
      case "gift_received":
        return <Gift className="h-5 w-5 text-pink-500" />;
      case "cash_out":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      default:
        return <Coins className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? "text-green-500" : "text-red-500";
  };

  const getTransactionSign = (amount: number) => {
    return amount > 0 ? "+" : "";
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "coins") return t.type.includes("coin") || t.type.includes("message");
    if (filter === "earnings") return t.type.includes("received") || t.type === "cash_out";
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const formatAmount = (type: string, amount: number) => {
    if (type.includes("coin") || type.includes("message") || type.includes("gift")) {
      return `${getTransactionSign(amount)}${Math.abs(amount)} coins`;
    } else {
      return `${getTransactionSign(amount)}$${(Math.abs(amount) / 100).toFixed(2)}`;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Transaction History</Text>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-6 py-4 gap-2">
        <TouchableOpacity
          onPress={() => setFilter("all")}
          className={`flex-1 py-3 rounded-xl ${
            filter === "all" ? "bg-primary" : "bg-card border border-border"
          }`}
        >
          <Text
            className={`text-center font-medium ${
              filter === "all" ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("coins")}
          className={`flex-1 py-3 rounded-xl ${
            filter === "coins" ? "bg-primary" : "bg-card border border-border"
          }`}
        >
          <Text
            className={`text-center font-medium ${
              filter === "coins" ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            Coins
          </Text>
        </TouchableOpacity>
        {profile?.gender === "woman" && (
          <TouchableOpacity
            onPress={() => setFilter("earnings")}
            className={`flex-1 py-3 rounded-xl ${
              filter === "earnings" ? "bg-primary" : "bg-card border border-border"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                filter === "earnings" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              Earnings
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Transactions List */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" />
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Coins className="h-16 w-16 text-muted-foreground mb-4" />
            <Text className="text-lg font-medium text-foreground mb-2">No Transactions Yet</Text>
            <Text className="text-sm text-muted-foreground text-center px-8">
              Your transaction history will appear here
            </Text>
          </View>
        ) : (
          <View className="px-6 pb-6">
            {filteredTransactions.map((transaction) => (
              <View
                key={transaction.id}
                className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center"
              >
                {/* Icon */}
                <View className="bg-muted rounded-full p-3 mr-4">
                  {getTransactionIcon(transaction.type)}
                </View>

                {/* Details */}
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground mb-1">
                    {transaction.description}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>

                {/* Amount */}
                <Text className={`text-lg font-bold ${getTransactionColor(transaction.amount)}`}>
                  {formatAmount(transaction.type, transaction.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
