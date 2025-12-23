import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, UserX, Ban } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";
import { reportBlockService } from "~/lib/report-block";

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked_user: {
    id: string;
    name: string;
    photo_url: string;
    age: number;
  };
}

export default function BlockedUsersScreen() {
  const { profile } = useAuth();
  const [blockedUsers, setBlockedUsers] = React.useState<BlockedUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [unblocking, setUnblocking] = React.useState<string | null>(null);

  const loadBlockedUsers = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("blocked_users")
        .select(
          `
          id,
          blocked_id,
          created_at,
          blocked_user:users!blocked_users_blocked_id_fkey (
            id,
            name,
            photo_url,
            age
          )
        `,
        )
        .eq("blocker_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (error) {
      console.error("Error loading blocked users:", error);
      Alert.alert("Error", "Failed to load blocked users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadBlockedUsers();
  }, [profile?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBlockedUsers();
  };

  const handleUnblock = async (blockedUserId: string, blockedUserName: string) => {
    if (!profile?.id) return;

    Alert.alert("Unblock User", `Are you sure you want to unblock ${blockedUserName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        style: "destructive",
        onPress: async () => {
          setUnblocking(blockedUserId);
          try {
            await reportBlockService.unblockUser(profile.id, blockedUserId);
            setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== blockedUserId));
            Alert.alert("Success", `${blockedUserName} has been unblocked`);
          } catch (error) {
            console.error("Error unblocking user:", error);
            Alert.alert("Error", "Failed to unblock user");
          } finally {
            setUnblocking(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Blocked Users</Text>
      </View>

      {/* Blocked Users List */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" />
          </View>
        ) : blockedUsers.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ban className="h-16 w-16 text-muted-foreground mb-4" />
            <Text className="text-lg font-medium text-foreground mb-2">No Blocked Users</Text>
            <Text className="text-sm text-muted-foreground text-center px-8">
              Users you block will appear here
            </Text>
          </View>
        ) : (
          <View className="px-6 py-6">
            {blockedUsers.map((blockedUser) => {
              const user = blockedUser.blocked_user;
              const isUnblocking = unblocking === blockedUser.blocked_id;

              return (
                <View
                  key={blockedUser.id}
                  className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center"
                >
                  {/* Profile Picture */}
                  <Image
                    source={{
                      uri: user.photo_url || "https://i.pravatar.cc/200",
                    }}
                    className="w-16 h-16 rounded-full mr-4"
                  />

                  {/* User Info */}
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground mb-1">{user.name}</Text>
                    <Text className="text-sm text-muted-foreground">
                      Blocked on{" "}
                      {new Date(blockedUser.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>

                  {/* Unblock Button */}
                  <TouchableOpacity
                    onPress={() => handleUnblock(blockedUser.blocked_id, user.name)}
                    disabled={isUnblocking}
                    className="bg-primary rounded-xl px-4 py-2"
                  >
                    {isUnblocking ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-sm font-semibold text-primary-foreground">Unblock</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
