import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Heart, Users, Eye } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { favoritesService, profileViewsService, type FavoriteUser } from "~/lib/favorites";

type TabType = "favorites" | "liked_you" | "views";

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = React.useState<TabType>("liked_you");
  const [favorites, setFavorites] = React.useState<FavoriteUser[]>([]);
  const [likedYou, setLikedYou] = React.useState<FavoriteUser[]>([]);
  const [profileViews, setProfileViews] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [counts, setCounts] = React.useState({
    favorites: 0,
    likedYou: 0,
    views: 0,
  });

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const [favs, liked, views, favCount, likedCount, viewsCount] = await Promise.all([
        favoritesService.getFavorites(user.id),
        favoritesService.getWhoLikedYou(user.id),
        profileViewsService.getWhoViewedYou(user.id),
        favoritesService.getFavoritesCount(user.id),
        favoritesService.getWhoLikedYouCount(user.id),
        profileViewsService.getViewsCount(user.id),
      ]);

      setFavorites(favs);
      setLikedYou(liked);
      setProfileViews(views);
      setCounts({
        favorites: favCount,
        likedYou: likedCount,
        views: viewsCount,
      });
    } catch (error) {
      console.error("Error loading favorites data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleRemoveFavorite = async (favoritedUserId: string) => {
    if (!user?.id) return;

    Alert.alert("Remove Favorite", "Remove this user from your favorites?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await favoritesService.removeFavorite(user.id, favoritedUserId);
            setFavorites((prev) => prev.filter((f) => f.user_id !== favoritedUserId));
            setCounts((prev) => ({ ...prev, favorites: prev.favorites - 1 }));
          } catch (error) {
            console.error("Error removing favorite:", error);
            Alert.alert("Error", "Failed to remove favorite");
          }
        },
      },
    ]);
  };

  const handleAddFavorite = async (userId: string) => {
    if (!user?.id) return;

    try {
      await favoritesService.addFavorite(user.id, userId);
      // Reload data to update mutual matches
      loadData();
      Alert.alert("Success! 💚", "Added to favorites!");
    } catch (error) {
      console.error("Error adding favorite:", error);
      Alert.alert("Error", "Failed to add favorite");
    }
  };

  const getCurrentData = () => {
    switch (selectedTab) {
      case "favorites":
        return favorites;
      case "liked_you":
        return likedYou;
      case "views":
        return profileViews.map((v) => ({
          id: v.id,
          user_id: v.viewer_id,
          name: v.viewer_name,
          photo_url: v.viewer_photo_url,
          bio: v.viewer_bio,
          created_at: v.created_at,
        }));
      default:
        return [];
    }
  };

  const getEmptyMessage = () => {
    switch (selectedTab) {
      case "favorites":
        return {
          title: "No Favorites Yet",
          message: "Start swiping to add people to your favorites!",
        };
      case "liked_you":
        return {
          title: "No One Liked You Yet",
          message: "Keep your profile updated and you'll start getting likes!",
        };
      case "views":
        return {
          title: "No Profile Views",
          message: "When people view your profile, they'll appear here",
        };
      default:
        return { title: "", message: "" };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentData = getCurrentData();
  const emptyMessage = getEmptyMessage();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Favorites & Matches</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View className="px-6 py-4">
        <View className="flex-row bg-card rounded-2xl p-1 border border-border">
          <TouchableOpacity
            onPress={() => setSelectedTab("liked_you")}
            className={`flex-1 rounded-xl py-3 items-center ${
              selectedTab === "liked_you" ? "bg-primary" : "bg-transparent"
            }`}
          >
            <Heart
              className={`h-5 w-5 mb-1 ${
                selectedTab === "liked_you" ? "text-primary-foreground" : "text-foreground"
              }`}
            />
            <Text
              className={`text-xs font-semibold ${
                selectedTab === "liked_you" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              Liked You
            </Text>
            <Text
              className={`text-xs ${
                selectedTab === "liked_you" ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {counts.likedYou}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab("favorites")}
            className={`flex-1 rounded-xl py-3 items-center ${
              selectedTab === "favorites" ? "bg-primary" : "bg-transparent"
            }`}
          >
            <Users
              className={`h-5 w-5 mb-1 ${
                selectedTab === "favorites" ? "text-primary-foreground" : "text-foreground"
              }`}
            />
            <Text
              className={`text-xs font-semibold ${
                selectedTab === "favorites" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              My Favorites
            </Text>
            <Text
              className={`text-xs ${
                selectedTab === "favorites" ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {counts.favorites}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab("views")}
            className={`flex-1 rounded-xl py-3 items-center ${
              selectedTab === "views" ? "bg-primary" : "bg-transparent"
            }`}
          >
            <Eye
              className={`h-5 w-5 mb-1 ${
                selectedTab === "views" ? "text-primary-foreground" : "text-foreground"
              }`}
            />
            <Text
              className={`text-xs font-semibold ${
                selectedTab === "views" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              Viewed You
            </Text>
            <Text
              className={`text-xs ${
                selectedTab === "views" ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {counts.views}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        <View className="px-6 pb-6">
          {currentData.length === 0 ? (
            <View className="items-center justify-center py-12">
              {selectedTab === "liked_you" && (
                <Heart className="h-16 w-16 text-muted-foreground mb-4" />
              )}
              {selectedTab === "favorites" && (
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
              )}
              {selectedTab === "views" && <Eye className="h-16 w-16 text-muted-foreground mb-4" />}
              <Text className="text-xl font-semibold text-foreground mb-2">
                {emptyMessage.title}
              </Text>
              <Text className="text-muted-foreground text-center">{emptyMessage.message}</Text>
            </View>
          ) : (
            currentData.map((item) => (
              <View
                key={item.id}
                className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center"
              >
                {/* Profile Image */}
                <Image
                  source={{
                    uri: item.photo_url || `https://i.pravatar.cc/100?u=${item.user_id}`,
                  }}
                  className="w-16 h-16 rounded-full mr-4"
                />

                {/* User Info */}
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground mb-1">{item.name}</Text>
                  {item.bio && (
                    <Text className="text-sm text-muted-foreground mb-2" numberOfLines={2}>
                      {item.bio}
                    </Text>
                  )}
                  <Text className="text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View className="gap-2">
                  {selectedTab === "favorites" && (
                    <TouchableOpacity
                      onPress={() => handleRemoveFavorite(item.user_id)}
                      className="bg-destructive/20 rounded-full px-4 py-2"
                    >
                      <Text className="text-sm font-semibold text-destructive">Remove</Text>
                    </TouchableOpacity>
                  )}
                  {selectedTab === "liked_you" && (
                    <TouchableOpacity
                      onPress={() => handleAddFavorite(item.user_id)}
                      className="bg-primary rounded-full px-4 py-2"
                    >
                      <Text className="text-sm font-semibold text-primary-foreground">
                        Like Back
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedTab === "views" && (
                    <TouchableOpacity
                      onPress={() => handleAddFavorite(item.user_id)}
                      className="bg-primary/20 rounded-full px-4 py-2 border border-primary"
                    >
                      <Text className="text-sm font-semibold text-primary">Like</Text>
                    </TouchableOpacity>
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
