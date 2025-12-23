import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings, Coins, Gift, Video, MessageCircle, Heart, Shield } from "~/lib/icons";
import { router } from "expo-router";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";

export default function ProfileScreen() {
  const { user, profile, signOut, refetchProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    console.log("🔴 [LOGOUT] handleLogout called");
    console.log("🔴 [LOGOUT] Current user:", user?.id);
    console.log("🔴 [LOGOUT] Current profile:", profile?.name);

    // TEMPORARY: Skip confirmation for debugging
    console.log("🔴 [LOGOUT] Skipping confirmation dialog for testing");

    try {
      console.log("🔴 [LOGOUT] Setting isLoggingOut to true");
      setIsLoggingOut(true);

      console.log("🔴 [LOGOUT] Calling signOut()...");
      await signOut();
      console.log("🔴 [LOGOUT] ✅ signOut() completed successfully");

      console.log("🔴 [LOGOUT] Navigating to welcome screen...");
      router.replace("/(auth)/welcome");
      console.log("🔴 [LOGOUT] ✅ Navigation called");
    } catch (error) {
      console.error("🔴 [LOGOUT] ❌ Error during logout:", error);
      console.error("🔴 [LOGOUT] Error details:", JSON.stringify(error, null, 2));
      Alert.alert("Error", "Failed to logout. Please try again.");
      setIsLoggingOut(false);
      console.log("🔴 [LOGOUT] isLoggingOut set back to false");
    }
  };

  const stats = [
    {
      label: "Matches",
      value: 0, // TODO: Fetch from matches table
      icon: Heart,
      color: "text-pink-500",
    },
    {
      label: "Messages",
      value: 0, // TODO: Count from messages table
      icon: MessageCircle,
      color: "text-blue-500",
    },
    {
      label: "Video Calls",
      value: 0, // TODO: Count from video_calls table
      icon: Video,
      color: "text-purple-500",
    },
    {
      label: "Gifts",
      value: 0, // TODO: Count from gift_transactions table
      icon: Gift,
      color: "text-primary",
    },
  ];

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted-foreground">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Profile</Text>
          <TouchableOpacity onPress={() => router.push("/profile/settings")} className="p-2">
            <Settings className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View className="mx-6 mb-6 bg-card rounded-3xl p-6 border border-border">
          <View className="items-center mb-6">
            <Image
              source={{
                uri: profile.photo_url || "https://i.pravatar.cc/200?img=12",
              }}
              className="w-24 h-24 rounded-full mb-4"
            />
            <Text className="text-2xl font-bold text-foreground mb-1">
              {profile.name || "User"}
            </Text>
            <Text className="text-sm text-muted-foreground mb-3">{profile.email}</Text>
            <View className="bg-primary/20 rounded-full px-4 py-2">
              <Text className="text-sm font-semibold text-primary capitalize">
                {profile.gender === "man" ? "💰 Coin User" : "💵 Earning User"}
              </Text>
            </View>
          </View>

          {/* Balance */}
          <View className="bg-background rounded-2xl p-4 border border-border">
            <Text className="text-sm text-muted-foreground text-center mb-2">
              {profile.gender === "man" ? "Coin Balance" : "Earnings"}
            </Text>
            <View className="flex-row items-center justify-center">
              <Coins className="h-6 w-6 text-primary mr-2" />
              <Text className="text-3xl font-bold text-primary">
                {profile.gender === "man"
                  ? (profile.coins || 0).toLocaleString()
                  : `$${((profile.earnings || 0) / 100).toFixed(2)}`}
              </Text>
            </View>
            {profile.gender === "man" ? (
              <>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/shop")}
                  className="bg-primary rounded-xl py-3 mt-4"
                >
                  <Text className="text-center font-semibold text-primary-foreground">
                    Buy More Coins
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/profile/cash-out")}
                className="bg-primary rounded-xl py-3 mt-4"
              >
                <Text className="text-center font-semibold text-primary-foreground">Cash Out</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-bold text-foreground mb-4">Your Activity</Text>
          <View className="flex-row flex-wrap gap-3">
            {stats.map((stat) => (
              <View
                key={stat.label}
                className="flex-1 min-w-[45%] bg-card rounded-2xl p-4 border border-border"
              >
                <stat.icon className={`h-8 w-8 ${stat.color} mb-2`} />
                <Text className="text-2xl font-bold text-foreground mb-1">{stat.value}</Text>
                <Text className="text-sm text-muted-foreground">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu Items */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-bold text-foreground mb-4">Account</Text>

          <TouchableOpacity
            onPress={() => router.push("/profile/edit-profile")}
            className="bg-card rounded-2xl p-4 mb-3 border border-border"
          >
            <Text className="text-base font-medium text-foreground">Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/profile/transaction-history")}
            className="bg-card rounded-2xl p-4 mb-3 border border-border"
          >
            <Text className="text-base font-medium text-foreground">Transaction History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/gifts/history")}
            className="bg-card rounded-2xl p-4 mb-3 border border-border"
          >
            <Text className="text-base font-medium text-foreground">Gift History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/profile/favorites")}
            className="bg-card rounded-2xl p-4 mb-3 border border-border"
          >
            <Text className="text-base font-medium text-foreground">Favorites & Matches</Text>
          </TouchableOpacity>

          {/* Daily Check-In Bonus - Only for men (coin users) */}
          {profile.gender === "man" && (
            <TouchableOpacity
              onPress={() => router.push("/profile/daily-bonus")}
              className="bg-card rounded-2xl p-4 mb-3 border border-border"
            >
              <Text className="text-base font-medium text-foreground">Daily Check-In Bonus</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => router.push("/profile/help")}
            className="bg-card rounded-2xl p-4 mb-3 border border-border"
          >
            <Text className="text-base font-medium text-foreground">Help & Support</Text>
          </TouchableOpacity>

          {/* Admin Dashboard - Only visible to admins */}
          {profile.is_admin && (
            <TouchableOpacity
              onPress={() => router.push("/admin/dashboard")}
              className="bg-primary/20 rounded-2xl p-4 mb-3 border border-primary flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Shield className="h-5 w-5 text-primary mr-3" />
                <Text className="text-base font-medium text-primary">Admin Dashboard</Text>
              </View>
              <View className="bg-primary rounded-full px-2 py-0.5">
                <Text className="text-xs font-bold text-primary-foreground">ADMIN</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleLogout}
            className="bg-destructive/20 rounded-2xl p-4 border border-destructive"
            disabled={isLoggingOut}
          >
            <Text className="text-base font-medium text-destructive text-center">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Loading Overlay */}
      {isLoggingOut && (
        <View
          className="absolute inset-0 bg-background/80 items-center justify-center"
          style={{ zIndex: 999 }}
        >
          <View className="bg-card rounded-3xl p-8 border border-border items-center">
            <ActivityIndicator size="large" color="#7ed321" />
            <Text className="text-foreground mt-4 font-semibold">Logging out...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
