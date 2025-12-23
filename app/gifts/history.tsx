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
import { ChevronLeft, Gift, ArrowUpRight, ArrowDownLeft } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { giftService, type GiftWithCatalog } from "~/lib/gifts";

export default function GiftsHistoryScreen() {
  const { user, profile } = useAuth();
  const [sentGifts, setSentGifts] = React.useState<GiftWithCatalog[]>([]);
  const [receivedGifts, setReceivedGifts] = React.useState<GiftWithCatalog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<"sent" | "received">("received");
  const [stats, setStats] = React.useState({
    totalSent: 0,
    totalReceived: 0,
    coinsSpent: 0,
    earningsFromGifts: 0,
  });

  const loadGifts = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const [sent, received, statistics] = await Promise.all([
        giftService.getSentGifts(user.id),
        giftService.getReceivedGifts(user.id),
        giftService.getStats(user.id),
      ]);

      setSentGifts(sent);
      setReceivedGifts(received);
      setStats(statistics);
    } catch (error) {
      console.error("Error loading gifts:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadGifts();
  }, [user?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGifts();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const currentGifts = selectedTab === "sent" ? sentGifts : receivedGifts;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading gift history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Gift History</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* Stats Cards */}
        <View className="px-6 py-4">
          <View className="flex-row gap-3">
            {/* Sent Stats */}
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <View className="flex-row items-center mb-2">
                <ArrowUpRight className="h-5 w-5 text-destructive mr-2" />
                <Text className="text-sm text-muted-foreground">Sent</Text>
              </View>
              <Text className="text-2xl font-bold text-foreground mb-1">{stats.totalSent}</Text>
              <Text className="text-xs text-muted-foreground">
                {stats.coinsSpent.toLocaleString()} coins spent
              </Text>
            </View>

            {/* Received Stats */}
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <View className="flex-row items-center mb-2">
                <ArrowDownLeft className="h-5 w-5 text-primary mr-2" />
                <Text className="text-sm text-muted-foreground">Received</Text>
              </View>
              <Text className="text-2xl font-bold text-foreground mb-1">{stats.totalReceived}</Text>
              <Text className="text-xs text-muted-foreground">
                ${(stats.earningsFromGifts / 100).toFixed(2)} earned
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View className="px-6 pb-4">
          <View className="flex-row bg-card rounded-2xl p-1 border border-border">
            <TouchableOpacity
              onPress={() => setSelectedTab("received")}
              className={`flex-1 rounded-xl py-3 ${
                selectedTab === "received" ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  selectedTab === "received" ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                Received ({receivedGifts.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab("sent")}
              className={`flex-1 rounded-xl py-3 ${
                selectedTab === "sent" ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  selectedTab === "sent" ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                Sent ({sentGifts.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gift List */}
        <View className="px-6 pb-6">
          {currentGifts.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Gift className="h-16 w-16 text-muted-foreground mb-4" />
              <Text className="text-xl font-semibold text-foreground mb-2">
                No Gifts {selectedTab === "sent" ? "Sent" : "Received"}
              </Text>
              <Text className="text-muted-foreground text-center">
                {selectedTab === "sent"
                  ? "Send your first gift to someone special!"
                  : "When you receive gifts, they'll appear here"}
              </Text>
            </View>
          ) : (
            currentGifts.map((gift) => (
              <View
                key={gift.id}
                className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center"
              >
                {/* Gift Icon */}
                <View className="mr-4">
                  <Text className="text-4xl">{gift.gift_icon}</Text>
                </View>

                {/* Gift Info */}
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground mb-1">
                    {gift.gift_name}
                  </Text>
                  <Text className="text-sm text-muted-foreground mb-1">
                    {formatDate(gift.created_at)}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-xs text-muted-foreground">
                      {selectedTab === "sent" ? "To:" : "From:"}{" "}
                    </Text>
                    <Text className="text-xs font-medium text-foreground">
                      {selectedTab === "sent" ? "User" : "User"}
                    </Text>
                  </View>
                </View>

                {/* Amount */}
                <View className="items-end">
                  <View
                    className={`rounded-full px-3 py-1.5 ${
                      selectedTab === "sent" ? "bg-destructive/20" : "bg-primary/20"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        selectedTab === "sent" ? "text-destructive" : "text-primary"
                      }`}
                    >
                      {selectedTab === "sent" ? "-" : "+"}
                      {gift.coins_spent} coins
                    </Text>
                  </View>
                  {selectedTab === "received" && (
                    <Text className="text-xs text-primary mt-1">
                      +${(Math.round((gift.coins_spent / 2) * 5) / 100).toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
