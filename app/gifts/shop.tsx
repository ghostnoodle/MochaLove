import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Coins, Gift } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { giftService } from "~/lib/gifts";
import type { Gift as GiftType } from "~/types";

export default function GiftShopScreen() {
  const { receiverId, receiverName, conversationId } = useLocalSearchParams<{
    receiverId: string;
    receiverName?: string;
    conversationId?: string;
  }>();

  const { user, profile } = useAuth();
  const [gifts, setGifts] = React.useState<GiftType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<
    "all" | "micro" | "mid" | "luxury"
  >("all");

  const coinBalance = profile?.coins || 0;

  // Load gifts
  React.useEffect(() => {
    const loadGifts = async () => {
      try {
        setIsLoading(true);
        const data = await giftService.getCatalog();
        setGifts(data);
      } catch (error) {
        console.error("Error loading gifts:", error);
        Alert.alert("Error", "Failed to load gifts");
      } finally {
        setIsLoading(false);
      }
    };

    loadGifts();
  }, []);

  // Filter gifts by category
  const filteredGifts = React.useMemo(() => {
    if (selectedCategory === "all") return gifts;
    return gifts.filter((gift) => gift.category === selectedCategory);
  }, [gifts, selectedCategory]);

  const handleSendGift = (gift: GiftType) => {
    if (!user?.id || !receiverId) {
      console.log("❌ Missing user or receiver ID");
      return;
    }

    console.log("🎁 [GIFT] Initiating gift send:", {
      gift: gift.name,
      coins: gift.coins,
      sender: user.id,
      receiver: receiverId,
    });

    // Check if user has enough coins
    if (coinBalance < gift.coins) {
      console.log("❌ [GIFT] Insufficient coins");
      Alert.alert(
        "Insufficient Coins",
        `You need ${gift.coins} coins to send this gift. Visit the Shop to purchase more coins.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Shop", onPress: () => router.push("/(tabs)/shop") },
        ],
      );
      return;
    }

    // Navigate to confirmation screen
    console.log("🎁 [GIFT] Navigating to confirmation screen...");
    router.push({
      pathname: "/gifts/confirm",
      params: {
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        giftCoins: gift.coins.toString(),
        receiverId,
        receiverName: receiverName || "User",
        conversationId,
      },
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      all: "All Gifts",
      micro: "💝 Micro",
      mid: "💎 Mid-Tier",
      luxury: "👑 Luxury",
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryDescription = (category: string) => {
    const descriptions = {
      micro: "Small gestures, big smiles",
      mid: "Show you care",
      luxury: "Ultimate luxury gifts",
    };
    return descriptions[category as keyof typeof descriptions];
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading gifts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">Send a Gift</Text>
              {receiverName && (
                <Text className="text-sm text-muted-foreground mt-1">To: {receiverName}</Text>
              )}
            </View>
          </View>
          <View className="flex-row items-center bg-card rounded-full px-4 py-2 border border-border">
            <Coins className="h-5 w-5 text-primary mr-2" />
            <Text className="text-lg font-semibold text-foreground">{coinBalance}</Text>
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <View className="px-6 py-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["all", "micro", "mid", "luxury"] as const).map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2 border ${
                selectedCategory === category
                  ? "bg-primary border-primary"
                  : "bg-card border-border"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedCategory === category ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {getCategoryLabel(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Category Description */}
        {selectedCategory !== "all" && (
          <View className="px-6 pb-4">
            <Text className="text-sm text-muted-foreground">
              {getCategoryDescription(selectedCategory)}
            </Text>
          </View>
        )}

        {/* Gifts Grid */}
        <View className="px-6 pb-6">
          <View className="flex-row flex-wrap gap-3">
            {filteredGifts.map((gift) => {
              const canAfford = coinBalance >= gift.coins;

              return (
                <TouchableOpacity
                  key={gift.id}
                  onPress={() => handleSendGift(gift)}
                  disabled={!canAfford}
                  className={`flex-1 min-w-[45%] max-w-[48%] bg-card rounded-2xl p-4 border ${
                    canAfford ? "border-border" : "border-border/50 opacity-60"
                  }`}
                  activeOpacity={0.7}
                >
                  {/* Gift Icon */}
                  <View className="items-center mb-3">
                    <Text className="text-5xl mb-2">{gift.icon}</Text>
                    <Text className="text-base font-semibold text-foreground text-center">
                      {gift.name}
                    </Text>
                  </View>

                  {/* Price */}
                  <View className="flex-row items-center justify-center bg-primary/20 rounded-full px-3 py-2">
                    <Coins className="h-4 w-4 text-primary mr-1" />
                    <Text className="text-sm font-bold text-primary">{gift.coins}</Text>
                  </View>

                  {/* USD Value */}
                  <Text className="text-xs text-muted-foreground text-center mt-2">
                    ≈ ${(gift.usdValue / 100).toFixed(2)} value
                  </Text>

                  {/* Not Enough Coins Overlay */}
                  {!canAfford && (
                    <View className="absolute top-2 right-2 bg-destructive rounded-full px-2 py-1">
                      <Text className="text-xs font-semibold text-destructive-foreground">
                        Need {gift.coins - coinBalance} more
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredGifts.length === 0 && (
            <View className="items-center justify-center py-12">
              <Gift className="h-16 w-16 text-muted-foreground mb-4" />
              <Text className="text-xl font-semibold text-foreground mb-2">No Gifts Found</Text>
              <Text className="text-muted-foreground text-center">
                No gifts available in this category
              </Text>
            </View>
          )}
        </View>

        {/* Footer Info */}
        <View className="px-6 pb-8">
          <View className="bg-card rounded-2xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">💝 About Gifts</Text>
            <Text className="text-sm text-muted-foreground leading-5">
              Send virtual gifts to show appreciation! Recipients earn real money from gifts you
              send. Need more coins? Visit the Shop tab to purchase coin packages.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
