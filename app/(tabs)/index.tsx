import * as React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, X, Coins } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { discoverService, type DiscoverUser } from "~/lib/discover";

export default function DiscoverScreen() {
  const { user, profile } = useAuth();
  const [users, setUsers] = React.useState<DiscoverUser[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Use actual coin balance from profile
  const coinBalance = profile?.coins || 0;

  // Load users on mount
  React.useEffect(() => {
    if (!user?.id || !profile?.gender) return;

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await discoverService.getOppositeGenderUsers(user.id, profile.gender);
        setUsers(data);
      } catch (err) {
        console.error("Error loading users:", err);
        setError("Failed to load users. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [user?.id, profile?.gender]);

  const currentUser = users[currentUserIndex];

  const handleLike = async () => {
    if (!user?.id || !currentUser) return;

    console.log("❤️ [LIKE] Liking user:", currentUser.name);

    try {
      // Create match in database
      await discoverService.createMatch(user.id, currentUser.id);
      console.log("❤️ [LIKE] Match created successfully");

      // Remove this user from the local list
      const newUsers = users.filter((u) => u.id !== currentUser.id);
      setUsers(newUsers);

      // Reset to first user if we're at the end
      if (currentUserIndex >= newUsers.length) {
        setCurrentUserIndex(0);
      }
    } catch (error) {
      console.error("❤️ [LIKE] Error creating match:", error);
      // Still proceed to next user even if match creation fails
      nextUser();
    }
  };

  const handlePass = () => {
    console.log("👎 [PASS] Passing on user:", currentUser?.name);
    nextUser();
  };

  const nextUser = () => {
    if (currentUserIndex < users.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
    } else {
      // Loop back to start if at the end
      setCurrentUserIndex(0);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Finding people for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-foreground mb-2">Oops!</Text>
          <Text className="text-muted-foreground text-center mb-4">{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              setCurrentUserIndex(0);
            }}
            className="bg-primary rounded-2xl px-6 py-3"
          >
            <Text className="text-primary-foreground font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No users available
  if (!currentUser || users.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-foreground mb-2">No More Profiles</Text>
          <Text className="text-muted-foreground text-center">
            Check back later for new people to connect with!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate display data
  const displayAge = discoverService.calculateDisplayAge(currentUser.created_at);
  const displayInterests = discoverService.getInterests();
  const displayPhoto = currentUser.photo_url || `https://i.pravatar.cc/400?u=${currentUser.id}`;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header with coin balance */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-2xl font-bold text-foreground">Discover</Text>
        <View className="flex-row items-center bg-card rounded-full px-4 py-2 border border-border">
          <Coins className="h-5 w-5 text-primary mr-2" />
          <Text className="text-lg font-semibold text-foreground">{coinBalance}</Text>
        </View>
      </View>

      {/* Card */}
      <View className="flex-1 px-6 pb-6">
        <View className="flex-1 bg-card rounded-3xl overflow-hidden border border-border">
          {/* Photo */}
          <View className="flex-1 bg-muted">
            <Image source={{ uri: displayPhoto }} className="w-full h-full" resizeMode="cover" />

            {/* Gradient overlay */}
            <View
              className="absolute bottom-0 left-0 right-0 h-48"
              style={{
                backgroundColor: "transparent",
              }}
            />
          </View>

          {/* Info */}
          <View className="p-6 bg-card">
            <View className="mb-4">
              <View className="flex-row items-baseline mb-2">
                <Text className="text-3xl font-bold text-foreground mr-3">
                  {currentUser.name || "Anonymous"}
                </Text>
                <Text className="text-2xl text-muted-foreground">{displayAge}</Text>
              </View>
              <Text className="text-base text-muted-foreground mb-3">
                📍 {currentUser.location || "Location not set"}
              </Text>
              <Text className="text-base text-foreground leading-6">
                {currentUser.bio || "No bio yet"}
              </Text>
            </View>

            {/* Interests */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {displayInterests.map((interest) => (
                <View key={interest} className="bg-primary/20 rounded-full px-4 py-2">
                  <Text className="text-sm font-medium text-primary">{interest}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View className="flex-row items-center justify-center space-x-4">
              <TouchableOpacity
                onPress={handlePass}
                activeOpacity={0.7}
                className="bg-destructive/20 rounded-full p-5 border-2 border-destructive"
              >
                <X className="h-8 w-8 text-destructive" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLike}
                activeOpacity={0.7}
                className="bg-primary/20 rounded-full p-6 border-2 border-primary"
              >
                <Heart className="h-10 w-10 text-primary" fill="#7ed321" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-center text-muted-foreground mt-4">
              💬 Send a message for 10 coins after matching
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
