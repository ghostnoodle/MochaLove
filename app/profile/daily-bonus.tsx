import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Gift, Calendar, Coins, Star } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";

const DAILY_BONUS_REWARDS = [
  { day: 1, coins: 10 },
  { day: 2, coins: 15 },
  { day: 3, coins: 20 },
  { day: 4, coins: 25 },
  { day: 5, coins: 30 },
  { day: 6, coins: 40 },
  { day: 7, coins: 100 }, // Bonus for 7 day streak
];

export default function DailyBonusScreen() {
  const { profile, refetchProfile } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isClaiming, setIsClaiming] = React.useState(false);
  const [lastClaimDate, setLastClaimDate] = React.useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = React.useState(0);

  const canClaimToday = React.useMemo(() => {
    if (!lastClaimDate) return true;
    const today = new Date().toDateString();
    const lastClaim = new Date(lastClaimDate).toDateString();
    return today !== lastClaim;
  }, [lastClaimDate]);

  const todayReward = DAILY_BONUS_REWARDS[currentStreak % 7] || DAILY_BONUS_REWARDS[0];

  React.useEffect(() => {
    loadBonusData();
  }, []);

  const loadBonusData = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      // Check if user has claimed today
      const { data, error } = await supabase
        .from("daily_bonuses")
        .select("*")
        .eq("user_id", profile.id)
        .order("claimed_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setLastClaimDate(data.claimed_at);
        setCurrentStreak(data.streak);
      }
    } catch (error) {
      console.error("Error loading bonus data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimBonus = async () => {
    if (!canClaimToday || !profile?.id) return;

    setIsClaiming(true);

    try {
      // Calculate new streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      const lastClaimStr = lastClaimDate ? new Date(lastClaimDate).toDateString() : null;

      const newStreak = lastClaimStr === yesterdayStr ? currentStreak + 1 : 1;
      const reward = DAILY_BONUS_REWARDS[(newStreak - 1) % 7];

      // Record the bonus claim
      const { error: bonusError } = await supabase.from("daily_bonuses").insert({
        user_id: profile.id,
        coins_awarded: reward.coins,
        streak: newStreak,
        claimed_at: new Date().toISOString(),
      });

      if (bonusError) throw bonusError;

      // Update user's coin balance
      const { error: updateError } = await supabase
        .from("users")
        .update({
          coins: (profile.coins || 0) + reward.coins,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      // Refresh profile
      await refetchProfile();

      // Update local state
      setLastClaimDate(new Date().toISOString());
      setCurrentStreak(newStreak);

      Alert.alert(
        "🎉 Bonus Claimed!",
        `You received ${reward.coins} coins!\n\nStreak: ${newStreak} day${newStreak !== 1 ? "s" : ""}`,
        [{ text: "Awesome!", onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("Error claiming bonus:", error);
      Alert.alert("Error", "Failed to claim bonus. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#7ed321" />
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
        <Text className="text-2xl font-bold text-foreground">Daily Check-In</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View className="m-6 bg-gradient-to-br from-primary to-primary/70 rounded-3xl p-6 items-center">
          <Gift className="h-16 w-16 text-primary-foreground mb-4" />
          <Text className="text-3xl font-bold text-primary-foreground mb-2">
            {todayReward.coins} Coins
          </Text>
          <Text className="text-primary-foreground/80 text-center mb-4">
            {canClaimToday ? "Available to claim!" : "Come back tomorrow!"}
          </Text>
          {currentStreak > 0 && (
            <View className="flex-row items-center bg-primary-foreground/20 rounded-full px-4 py-2">
              <Star className="h-5 w-5 text-primary-foreground mr-2" />
              <Text className="text-primary-foreground font-semibold">
                {currentStreak} Day Streak
              </Text>
            </View>
          )}
        </View>

        {/* Claim Button */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={handleClaimBonus}
            disabled={!canClaimToday || isClaiming}
            className={`rounded-2xl py-4 ${canClaimToday ? "bg-primary" : "bg-muted"}`}
          >
            {isClaiming ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text
                className={`text-center font-bold text-lg ${
                  canClaimToday ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {canClaimToday ? "Claim Daily Bonus" : "Already Claimed Today"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Weekly Rewards */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Weekly Rewards</Text>
          <View className="bg-card rounded-2xl border border-border overflow-hidden">
            {DAILY_BONUS_REWARDS.map((reward, index) => {
              const isCurrentDay = currentStreak % 7 === index;
              const isPastDay = canClaimToday
                ? currentStreak % 7 > index
                : currentStreak % 7 >= index;

              return (
                <View
                  key={reward.day}
                  className={`p-4 flex-row items-center justify-between ${
                    index < DAILY_BONUS_REWARDS.length - 1 ? "border-b border-border" : ""
                  } ${isCurrentDay ? "bg-primary/10" : ""}`}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                        isPastDay ? "bg-primary" : isCurrentDay ? "bg-primary/30" : "bg-muted"
                      }`}
                    >
                      <Text
                        className={`font-bold ${
                          isPastDay || isCurrentDay
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {reward.day}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-base font-medium text-foreground">
                        Day {reward.day}
                      </Text>
                      {reward.day === 7 && (
                        <Text className="text-xs text-primary">Streak Bonus! 🔥</Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Coins className="h-5 w-5 text-primary mr-2" />
                    <Text className="text-lg font-bold text-foreground">{reward.coins}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Info Box */}
        <View className="mx-6 mb-8 bg-primary/20 rounded-xl p-4 border border-primary/30">
          <View className="flex-row items-start">
            <Calendar className="h-5 w-5 text-primary mr-2 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-primary mb-1">How It Works</Text>
              <Text className="text-sm text-primary/80">
                Check in daily to earn coins! Your streak increases with consecutive days, and you
                get a special bonus on day 7. Miss a day and your streak resets, but you can start
                again anytime.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
