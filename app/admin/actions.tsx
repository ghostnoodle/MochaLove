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
import { ChevronLeft, Shield, Ban, CheckCircle, AlertCircle, User } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { adminService, type AdminAction } from "~/lib/admin";

export default function AdminActionsScreen() {
  const { user } = useAuth();
  const [actions, setActions] = React.useState<AdminAction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);

  const loadActions = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const data = await adminService.getActionHistory(pageNum, 50);

      if (refresh || pageNum === 1) {
        setActions(data);
      } else {
        setActions([...actions, ...data]);
      }

      setHasMore(data.length === 50);
      setPage(pageNum);
    } catch (error) {
      console.error("Error loading actions:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadActions(1);
  }, []);

  const handleRefresh = () => {
    loadActions(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadActions(page + 1);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "ban_user":
        return <Ban className="h-5 w-5 text-destructive" />;
      case "unban_user":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "resolve_report":
      case "dismiss_report":
        return <AlertCircle className="h-5 w-5 text-primary" />;
      case "grant_admin":
      case "revoke_admin":
        return <Shield className="h-5 w-5 text-primary" />;
      default:
        return <User className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: { [key: string]: string } = {
      ban_user: "Banned User",
      unban_user: "Unbanned User",
      approve_profile: "Approved Profile",
      reject_profile: "Rejected Profile",
      delete_content: "Deleted Content",
      resolve_report: "Resolved Report",
      dismiss_report: "Dismissed Report",
      update_user: "Updated User",
      grant_admin: "Granted Admin",
      revoke_admin: "Revoked Admin",
    };
    return labels[actionType] || actionType;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (isLoading && actions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-muted-foreground mt-4">Loading action log...</Text>
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
          <Text className="text-2xl font-bold text-foreground">Admin Action Log</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          View all administrative actions taken by admins
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View className="px-6 py-4">
          {actions.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <Text className="text-lg font-semibold text-foreground mb-2">No Actions Yet</Text>
              <Text className="text-sm text-muted-foreground text-center">
                Admin actions will appear here as they are performed
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {actions.map((action) => (
                <View key={action.id} className="bg-card rounded-2xl p-4 border border-border">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center flex-1">
                      <View className="bg-muted rounded-full p-2 mr-3">
                        {getActionIcon(action.action_type)}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground mb-1">
                          {getActionLabel(action.action_type)}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {formatDate(action.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Admin info */}
                  {action.admin_name && (
                    <View className="mb-2">
                      <Text className="text-xs text-muted-foreground mb-1">Performed by:</Text>
                      <Text className="text-sm font-medium text-foreground">
                        {action.admin_name}
                      </Text>
                    </View>
                  )}

                  {/* Target user */}
                  {action.target_user_name && (
                    <View className="mb-2">
                      <Text className="text-xs text-muted-foreground mb-1">Target user:</Text>
                      <Text className="text-sm font-medium text-foreground">
                        {action.target_user_name}
                      </Text>
                    </View>
                  )}

                  {/* Reason */}
                  {action.reason && (
                    <View className="mt-2 bg-muted/50 rounded-xl p-3">
                      <Text className="text-xs text-muted-foreground mb-1">Reason:</Text>
                      <Text className="text-sm text-foreground">{action.reason}</Text>
                    </View>
                  )}

                  {/* Metadata */}
                  {action.metadata && (
                    <View className="mt-2">
                      <Text className="text-xs text-muted-foreground">
                        Additional details available
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Load more indicator */}
              {isLoading && actions.length > 0 && (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#10b981" />
                </View>
              )}

              {!hasMore && actions.length > 0 && (
                <View className="py-4 items-center">
                  <Text className="text-sm text-muted-foreground">No more actions to load</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
