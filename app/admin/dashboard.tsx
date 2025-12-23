import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import {
  ChevronLeft,
  Users,
  AlertCircle,
  DollarSign,
  MessageCircle,
  Heart,
  Gift,
  TrendingUp,
  Ban,
  Shield,
} from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { adminService, type AdminStats } from "~/lib/admin";

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Check admin status
  React.useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) return;

      const adminStatus = await adminService.isAdmin(user.id);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        Alert.alert("Access Denied", "You do not have admin privileges to access this page.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    };

    checkAdmin();
  }, [user?.id]);

  // Load stats
  const loadStats = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading admin stats:", error);
      Alert.alert("Error", "Failed to load statistics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
  };

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <Shield className="h-16 w-16 text-destructive mb-4" />
          <Text className="text-xl font-bold text-foreground">Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading dashboard...</Text>
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
            <TouchableOpacity onPress={() => router.replace("/(tabs)/profile")} className="mr-4">
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-bold text-foreground">Admin Dashboard</Text>
              <Text className="text-sm text-muted-foreground mt-1">System Overview</Text>
            </View>
          </View>
          <View className="bg-primary/20 rounded-full px-3 py-1.5 border border-primary">
            <Text className="text-sm font-semibold text-primary">ADMIN</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-bold text-foreground mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push("/admin/users")}
              className="flex-1 bg-card rounded-2xl p-4 border border-border items-center"
            >
              <Users className="h-8 w-8 text-primary mb-2" />
              <Text className="text-sm font-semibold text-foreground">Manage Users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/admin/reports")}
              className="flex-1 bg-card rounded-2xl p-4 border border-border items-center"
            >
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <Text className="text-sm font-semibold text-foreground">View Reports</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3 mt-3">
            <TouchableOpacity
              onPress={() => router.push("/admin/analytics")}
              className="flex-1 bg-card rounded-2xl p-4 border border-border items-center"
            >
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <Text className="text-sm font-semibold text-foreground">Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/admin/actions")}
              className="flex-1 bg-card rounded-2xl p-4 border border-border items-center"
            >
              <Shield className="h-8 w-8 text-foreground mb-2" />
              <Text className="text-sm font-semibold text-foreground">Action Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Statistics */}
        <View className="px-6 py-4">
          <Text className="text-lg font-bold text-foreground mb-3">User Statistics</Text>

          <View className="bg-card rounded-2xl border border-border overflow-hidden">
            <View className="flex-row border-b border-border">
              <View className="flex-1 p-4 border-r border-border">
                <Users className="h-6 w-6 text-primary mb-2" />
                <Text className="text-2xl font-bold text-foreground">
                  {stats?.total_users.toLocaleString()}
                </Text>
                <Text className="text-sm text-muted-foreground">Total Users</Text>
              </View>
              <View className="flex-1 p-4">
                <Users className="h-6 w-6 text-primary mb-2" />
                <Text className="text-2xl font-bold text-foreground">
                  {stats?.active_users.toLocaleString()}
                </Text>
                <Text className="text-sm text-muted-foreground">Active Users</Text>
              </View>
            </View>

            <View className="flex-row border-b border-border">
              <View className="flex-1 p-4 border-r border-border">
                <Users className="h-6 w-6 text-blue-500 mb-2" />
                <Text className="text-2xl font-bold text-foreground">
                  {stats?.total_men.toLocaleString()}
                </Text>
                <Text className="text-sm text-muted-foreground">Men</Text>
              </View>
              <View className="flex-1 p-4">
                <Users className="h-6 w-6 text-pink-500 mb-2" />
                <Text className="text-2xl font-bold text-foreground">
                  {stats?.total_women.toLocaleString()}
                </Text>
                <Text className="text-sm text-muted-foreground">Women</Text>
              </View>
            </View>

            <View className="flex-row">
              <View className="flex-1 p-4 border-r border-border">
                <Ban className="h-6 w-6 text-destructive mb-2" />
                <Text className="text-2xl font-bold text-foreground">
                  {stats?.banned_users.toLocaleString()}
                </Text>
                <Text className="text-sm text-muted-foreground">Banned</Text>
              </View>
              <View className="flex-1 p-4">
                <AlertCircle className="h-6 w-6 text-yellow-500 mb-2" />
                <Text className="text-2xl font-bold text-foreground">
                  {stats?.pending_profiles.toLocaleString()}
                </Text>
                <Text className="text-sm text-muted-foreground">Pending</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Engagement Statistics */}
        <View className="px-6 py-4">
          <Text className="text-lg font-bold text-foreground mb-3">Engagement</Text>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <MessageCircle className="h-6 w-6 text-primary mb-2" />
              <Text className="text-2xl font-bold text-foreground">
                {stats?.total_messages.toLocaleString()}
              </Text>
              <Text className="text-sm text-muted-foreground">Total Messages</Text>
            </View>

            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <Heart className="h-6 w-6 text-primary mb-2" />
              <Text className="text-2xl font-bold text-foreground">
                {stats?.total_matches.toLocaleString()}
              </Text>
              <Text className="text-sm text-muted-foreground">Total Matches</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <Gift className="h-6 w-6 text-primary mb-2" />
              <Text className="text-2xl font-bold text-foreground">
                {stats?.total_gifts_sent.toLocaleString()}
              </Text>
              <Text className="text-sm text-muted-foreground">Gifts Sent</Text>
            </View>

            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <MessageCircle className="h-6 w-6 text-primary mb-2" />
              <Text className="text-2xl font-bold text-foreground">
                {stats?.active_conversations.toLocaleString()}
              </Text>
              <Text className="text-sm text-muted-foreground">Active Chats</Text>
            </View>
          </View>
        </View>

        {/* Revenue Statistics */}
        <View className="px-6 py-4 pb-8">
          <Text className="text-lg font-bold text-foreground mb-3">Revenue</Text>

          <View className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl p-6 border border-primary">
            <DollarSign className="h-8 w-8 text-primary mb-3" />
            <Text className="text-3xl font-bold text-foreground mb-2">
              ${((stats?.total_revenue_cents || 0) / 100).toLocaleString()}
            </Text>
            <Text className="text-sm text-muted-foreground mb-1">Total Revenue</Text>
            <Text className="text-xs text-muted-foreground">
              {stats?.total_transactions.toLocaleString()} transactions
            </Text>
          </View>

          {stats?.pending_reports !== undefined && stats.pending_reports > 0 && (
            <View className="bg-destructive/20 rounded-2xl p-4 border border-destructive mt-4">
              <View className="flex-row items-center">
                <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                <Text className="text-sm font-semibold text-destructive flex-1">
                  {stats.pending_reports} pending report{stats.pending_reports > 1 ? "s" : ""}{" "}
                  require attention
                </Text>
                <TouchableOpacity onPress={() => router.push("/admin/reports")}>
                  <Text className="text-sm font-bold text-destructive">View →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
