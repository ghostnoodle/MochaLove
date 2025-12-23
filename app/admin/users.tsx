import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Search, Ban, Shield, Users as UsersIcon, Filter } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { adminService, type UserWithDetails } from "~/lib/admin";

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState<"all" | "men" | "women" | "banned">(
    "all",
  );
  const [actioningUserId, setActioningUserId] = React.useState<string | null>(null);

  // Load users
  const loadUsers = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      let filters: any = {};
      if (selectedFilter === "men") filters.gender = "man";
      if (selectedFilter === "women") filters.gender = "woman";
      if (selectedFilter === "banned") filters.is_banned = true;

      const data = await adminService.getUsers(0, 100, filters);
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, [selectedFilter]);

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadUsers();
      return;
    }

    try {
      setIsLoading(true);
      const data = await adminService.searchUsers(searchQuery);
      setUsers(data);
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users");
    } finally {
      setIsLoading(false);
    }
  };

  // Ban user
  const handleBanUser = (targetUser: UserWithDetails) => {
    Alert.alert(
      "Ban User",
      `Are you sure you want to ban ${targetUser.name}? They will not be able to access the app.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban User",
          style: "destructive",
          onPress: () => {
            Alert.prompt(
              "Ban Reason",
              "Please provide a reason for banning this user:",
              async (reason) => {
                if (!reason || !user?.id) return;

                try {
                  setActioningUserId(targetUser.id);
                  await adminService.banUser(user.id, targetUser.id, reason);
                  Alert.alert("Success", "User has been banned");
                  loadUsers();
                } catch (error) {
                  console.error("Error banning user:", error);
                  Alert.alert("Error", "Failed to ban user");
                } finally {
                  setActioningUserId(null);
                }
              },
            );
          },
        },
      ],
    );
  };

  // Unban user
  const handleUnbanUser = (targetUser: UserWithDetails) => {
    Alert.alert("Unban User", `Are you sure you want to unban ${targetUser.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unban",
        onPress: async () => {
          if (!user?.id) return;

          try {
            setActioningUserId(targetUser.id);
            await adminService.unbanUser(user.id, targetUser.id);
            Alert.alert("Success", "User has been unbanned");
            loadUsers();
          } catch (error) {
            console.error("Error unbanning user:", error);
            Alert.alert("Error", "Failed to unban user");
          } finally {
            setActioningUserId(null);
          }
        },
      },
    ]);
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [users, searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.push("/admin/dashboard")} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">User Management</Text>
        </View>

        {/* Search Bar */}
        <View className="bg-input rounded-2xl px-4 py-3 flex-row items-center border border-border">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholder="Search by name or email..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            className="flex-1 text-foreground text-base"
          />
        </View>
      </View>

      {/* Filters */}
      <View className="px-6 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["all", "men", "women", "banned"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              className={`rounded-full px-4 py-2 border ${
                selectedFilter === filter ? "bg-primary border-primary" : "bg-card border-border"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedFilter === filter ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {filter === "all" && "All Users"}
                {filter === "men" && "Men"}
                {filter === "women" && "Women"}
                {filter === "banned" && "Banned"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Users List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading users...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pb-6">
            {filteredUsers.length === 0 ? (
              <View className="items-center justify-center py-12">
                <UsersIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <Text className="text-xl font-semibold text-foreground mb-2">No Users Found</Text>
                <Text className="text-muted-foreground text-center">
                  Try adjusting your filters or search criteria
                </Text>
              </View>
            ) : (
              filteredUsers.map((targetUser) => {
                const isActioning = actioningUserId === targetUser.id;

                return (
                  <View
                    key={targetUser.id}
                    className="bg-card rounded-2xl p-4 mb-3 border border-border"
                  >
                    <View className="flex-row items-center">
                      {/* Avatar */}
                      <Image
                        source={{
                          uri:
                            targetUser.photo_url || `https://i.pravatar.cc/100?u=${targetUser.id}`,
                        }}
                        className="w-14 h-14 rounded-full mr-4"
                      />

                      {/* User Info */}
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="text-lg font-semibold text-foreground">
                            {targetUser.name || "No name"}
                          </Text>
                          {targetUser.is_admin && (
                            <View className="bg-primary/20 rounded px-2 py-0.5">
                              <Text className="text-xs font-bold text-primary">ADMIN</Text>
                            </View>
                          )}
                          {targetUser.is_banned && (
                            <View className="bg-destructive/20 rounded px-2 py-0.5">
                              <Text className="text-xs font-bold text-destructive">BANNED</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm text-muted-foreground mb-1">
                          {targetUser.email}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-xs text-muted-foreground">
                            {targetUser.gender === "man" ? "👨 Man" : "👩 Woman"}
                          </Text>
                          <Text className="text-xs text-muted-foreground">•</Text>
                          <Text className="text-xs text-muted-foreground">
                            {targetUser.coins} coins
                          </Text>
                          <Text className="text-xs text-muted-foreground">•</Text>
                          <Text className="text-xs text-muted-foreground">
                            ${(targetUser.earnings / 100).toFixed(2)} earned
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      {isActioning ? (
                        <ActivityIndicator size="small" color="#7ed321" />
                      ) : (
                        <View className="gap-2">
                          {targetUser.is_banned ? (
                            <TouchableOpacity
                              onPress={() => handleUnbanUser(targetUser)}
                              className="bg-primary rounded-full px-3 py-2"
                            >
                              <Text className="text-xs font-semibold text-primary-foreground">
                                Unban
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            !targetUser.is_admin && (
                              <TouchableOpacity
                                onPress={() => handleBanUser(targetUser)}
                                className="bg-destructive/20 rounded-full px-3 py-2"
                              >
                                <Text className="text-xs font-semibold text-destructive">Ban</Text>
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      )}
                    </View>

                    {/* Banned Info */}
                    {targetUser.is_banned && targetUser.banned_reason && (
                      <View className="mt-3 pt-3 border-t border-border">
                        <Text className="text-xs text-muted-foreground mb-1">Ban Reason:</Text>
                        <Text className="text-sm text-destructive">{targetUser.banned_reason}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
