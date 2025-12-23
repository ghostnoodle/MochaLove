import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, TrendingUp, Users, DollarSign } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { adminService } from "~/lib/admin";
import type { RevenueAnalytics, UserGrowthAnalytics } from "~/lib/admin";

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [revenueData, setRevenueData] = React.useState<RevenueAnalytics[]>([]);
  const [userGrowthData, setUserGrowthData] = React.useState<UserGrowthAnalytics[]>([]);

  React.useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [revenue, growth] = await Promise.all([
        adminService.getRevenueAnalytics(),
        adminService.getUserGrowthAnalytics(),
      ]);
      setRevenueData(revenue);
      setUserGrowthData(growth);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalRevenue = () => {
    return revenueData.reduce((sum, day) => sum + (day.revenue_cents || 0), 0);
  };

  const getTotalNewUsers = () => {
    return userGrowthData.reduce((sum, day) => sum + (day.new_users || 0), 0);
  };

  const getAverageRevenuePerDay = () => {
    if (revenueData.length === 0) return 0;
    return getTotalRevenue() / revenueData.length;
  };

  const getMaxRevenue = () => {
    return Math.max(...revenueData.map((d) => d.revenue_cents || 0));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderBarChart = (data: number[], maxValue: number, color: string) => {
    const screenWidth = Dimensions.get("window").width - 48; // Account for padding
    const barWidth = Math.max(20, screenWidth / data.length - 8);

    return (
      <View className="flex-row items-end justify-between h-48 mb-2">
        {data.map((value, index) => {
          const height = maxValue > 0 ? (value / maxValue) * 180 : 0;
          return (
            <View key={index} className="items-center flex-1">
              <View
                style={{
                  height: Math.max(2, height),
                  width: barWidth,
                  backgroundColor: color,
                  borderRadius: 4,
                }}
              />
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-muted-foreground mt-4">Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity onPress={() => router.push("/admin/dashboard")} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Analytics</Text>
        </View>
        <Text className="text-sm text-muted-foreground">Last 30 days performance</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {/* Summary Cards */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <DollarSign className="h-5 w-5 text-green-500 mb-2" />
              <Text className="text-2xl font-bold text-foreground">
                ${(getTotalRevenue() / 100).toFixed(2)}
              </Text>
              <Text className="text-xs text-muted-foreground">Total Revenue</Text>
            </View>

            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <Users className="h-5 w-5 text-blue-500 mb-2" />
              <Text className="text-2xl font-bold text-foreground">{getTotalNewUsers()}</Text>
              <Text className="text-xs text-muted-foreground">New Users</Text>
            </View>
          </View>

          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <TrendingUp className="h-5 w-5 text-primary mb-2" />
              <Text className="text-2xl font-bold text-foreground">
                ${(getAverageRevenuePerDay() / 100).toFixed(2)}
              </Text>
              <Text className="text-xs text-muted-foreground">Avg Daily Revenue</Text>
            </View>

            <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
              <DollarSign className="h-5 w-5 text-yellow-500 mb-2" />
              <Text className="text-2xl font-bold text-foreground">
                ${(getMaxRevenue() / 100).toFixed(2)}
              </Text>
              <Text className="text-xs text-muted-foreground">Peak Day Revenue</Text>
            </View>
          </View>

          {/* Revenue Chart */}
          <View className="bg-card rounded-2xl p-4 border border-border mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-bold text-foreground">Revenue Trend</Text>
                <Text className="text-xs text-muted-foreground">Daily revenue (last 30 days)</Text>
              </View>
              <View className="bg-green-500/20 rounded-full px-3 py-1">
                <Text className="text-xs font-bold text-green-500">
                  ${(getTotalRevenue() / 100).toFixed(0)}
                </Text>
              </View>
            </View>

            {revenueData.length > 0 ? (
              <>
                {renderBarChart(
                  revenueData.map((d) => d.revenue_cents || 0).reverse(),
                  getMaxRevenue(),
                  "#10b981",
                )}
                <View className="flex-row justify-between mt-2">
                  <Text className="text-xs text-muted-foreground">
                    {formatDate(revenueData[revenueData.length - 1].date)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">Today</Text>
                </View>
              </>
            ) : (
              <View className="h-48 items-center justify-center">
                <Text className="text-muted-foreground">No revenue data available</Text>
              </View>
            )}
          </View>

          {/* User Growth Chart */}
          <View className="bg-card rounded-2xl p-4 border border-border mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-bold text-foreground">User Growth</Text>
                <Text className="text-xs text-muted-foreground">Daily signups (last 30 days)</Text>
              </View>
              <View className="bg-blue-500/20 rounded-full px-3 py-1">
                <Text className="text-xs font-bold text-blue-500">{getTotalNewUsers()}</Text>
              </View>
            </View>

            {userGrowthData.length > 0 ? (
              <>
                {renderBarChart(
                  userGrowthData.map((d) => d.new_users || 0).reverse(),
                  Math.max(...userGrowthData.map((d) => d.new_users || 0)),
                  "#3b82f6",
                )}
                <View className="flex-row justify-between mt-2">
                  <Text className="text-xs text-muted-foreground">
                    {formatDate(userGrowthData[userGrowthData.length - 1].date)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">Today</Text>
                </View>
              </>
            ) : (
              <View className="h-48 items-center justify-center">
                <Text className="text-muted-foreground">No user growth data available</Text>
              </View>
            )}
          </View>

          {/* Gender Breakdown */}
          {userGrowthData.length > 0 && (
            <View className="bg-card rounded-2xl p-4 border border-border mb-6">
              <Text className="text-lg font-bold text-foreground mb-4">Gender Distribution</Text>
              <View className="flex-row items-center justify-around">
                <View className="items-center">
                  <View className="bg-blue-500/20 rounded-full w-16 h-16 items-center justify-center mb-2">
                    <Text className="text-2xl">👨</Text>
                  </View>
                  <Text className="text-xl font-bold text-foreground">
                    {userGrowthData.reduce((sum, day) => sum + (day.new_men || 0), 0)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">Men</Text>
                </View>

                <View className="items-center">
                  <View className="bg-pink-500/20 rounded-full w-16 h-16 items-center justify-center mb-2">
                    <Text className="text-2xl">👩</Text>
                  </View>
                  <Text className="text-xl font-bold text-foreground">
                    {userGrowthData.reduce((sum, day) => sum + (day.new_women || 0), 0)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">Women</Text>
                </View>
              </View>
            </View>
          )}

          {/* Recent Data Table */}
          <View className="bg-card rounded-2xl p-4 border border-border">
            <Text className="text-lg font-bold text-foreground mb-4">Recent Activity</Text>
            <View className="space-y-2">
              {revenueData.slice(0, 7).map((day, index) => {
                const growth = userGrowthData.find((g) => g.date === day.date);
                return (
                  <View
                    key={day.date}
                    className="flex-row items-center justify-between py-3 border-b border-border"
                  >
                    <View>
                      <Text className="text-sm font-semibold text-foreground">
                        {formatDate(day.date)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {growth?.new_users || 0} new users
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-bold text-primary">
                        ${((day.revenue_cents || 0) / 100).toFixed(2)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {day.transaction_count || 0} transactions
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
