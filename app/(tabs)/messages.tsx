import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MessageCircle, Search, Coins, Heart } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { conversationService } from "~/lib/conversations";
import { userService } from "~/lib/auth";
import { supabase } from "~/lib/supabase";
import type { Conversation } from "~/types";

interface Match {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  created_at: string;
}

interface ConversationWithUser extends Conversation {
  otherUser?: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}

export default function MessagesScreen() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = React.useState<ConversationWithUser[]>([]);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showMatches, setShowMatches] = React.useState(false);

  // Use actual coin balance from profile
  const coinBalance = profile?.coins || 0;

  // Load matches
  React.useEffect(() => {
    if (!user?.id) return;

    const loadMatches = async () => {
      try {
        setIsLoadingMatches(true);
        console.log("💕 [MATCHES] Loading matches for user:", user.id);

        // Get all matches for this user
        const { data: matchesData, error } = await supabase
          .from("matches")
          .select("*")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (error) throw error;

        console.log("💕 [MATCHES] Found", matchesData?.length || 0, "matches");

        // Get the other user's details for each match
        const matchesWithUsers = await Promise.all(
          (matchesData || []).map(async (match) => {
            const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
            try {
              const otherUser = await userService.getProfile(otherUserId);
              return {
                id: match.id,
                user_id: otherUserId,
                name: otherUser.name || "User",
                photo_url: otherUser.photo_url,
                created_at: match.created_at,
              };
            } catch (err) {
              console.error("Error fetching user", otherUserId, err);
              return null;
            }
          }),
        );

        setMatches(matchesWithUsers.filter((m) => m !== null) as Match[]);
        console.log("💕 [MATCHES] Loaded", matchesWithUsers.length, "match profiles");
      } catch (error) {
        console.error("Error loading matches:", error);
      } finally {
        setIsLoadingMatches(false);
      }
    };

    loadMatches();
  }, [user?.id]);

  // Load conversations
  React.useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const data = await conversationService.getUserConversations(user.id);

        // Fetch other user details for each conversation
        const conversationsWithUsers = await Promise.all(
          data.map(async (conv) => {
            const otherUserId = conversationService.getOtherUserId(conv, user.id);
            try {
              const otherUserProfile = await userService.getProfile(otherUserId);
              return {
                ...conv,
                otherUser: {
                  id: otherUserProfile.id,
                  name: otherUserProfile.name || "User",
                  photo_url: otherUserProfile.photo_url,
                },
              };
            } catch (err) {
              console.error(`Error fetching user ${otherUserId}:`, err);
              return {
                ...conv,
                otherUser: {
                  id: otherUserId,
                  name: "User",
                  photo_url: null,
                },
              };
            }
          }),
        );

        setConversations(conversationsWithUsers);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    // Subscribe to conversation updates
    const subscription = conversationService.subscribeToConversations(user.id, () => {
      loadConversations();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Filter conversations by search
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((conv) =>
      conv.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [conversations, searchQuery]);

  const handleConversationPress = (conversationId: string) => {
    console.log("💬 [MESSAGES] Opening chat:", conversationId);
    router.push(`/chat/${conversationId}`);
  };

  const handleMatchPress = async (match: Match) => {
    if (!user?.id) return;

    console.log("💕 [MATCHES] Starting conversation with:", match.name);

    try {
      // Get or create conversation
      const conversationId = await conversationService.getOrCreate(user.id, match.user_id);
      console.log("💕 [MATCHES] Conversation ID:", conversationId);

      // Navigate to chat screen
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      Alert.alert("Error", "Failed to start conversation. Please try again.");
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground">Messages</Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setShowMatches(!showMatches)}
              className="bg-primary/20 rounded-full px-4 py-2 border border-primary flex-row items-center"
            >
              <Heart className="h-5 w-5 text-primary mr-2" fill="#7ed321" />
              <Text className="text-sm font-semibold text-primary">{matches.length} Matches</Text>
            </TouchableOpacity>
            <View className="flex-row items-center bg-card rounded-full px-4 py-2 border border-border">
              <Coins className="h-5 w-5 text-primary mr-2" />
              <Text className="text-lg font-semibold text-foreground">{coinBalance}</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        {!showMatches && (
          <View className="bg-input rounded-2xl px-4 py-3 flex-row items-center border border-border">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search conversations..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              className="flex-1 text-foreground text-base"
            />
          </View>
        )}
      </View>

      {/* Matches Section */}
      {showMatches && (
        <View className="flex-1">
          <View className="px-6 pb-4">
            <Text className="text-lg font-semibold text-foreground mb-2">
              💕 Your Matches ({matches.length})
            </Text>
            <Text className="text-sm text-muted-foreground mb-4">
              Tap on a match to start a conversation for 10 coins
            </Text>
          </View>

          {isLoadingMatches ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#7ed321" />
              <Text className="text-foreground mt-4">Loading matches...</Text>
            </View>
          ) : matches.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Heart className="h-16 w-16 text-muted-foreground mb-4" />
              <Text className="text-xl font-semibold text-foreground mb-2">No Matches Yet</Text>
              <Text className="text-muted-foreground text-center">
                Start swiping in the Discover tab to find matches!
              </Text>
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-6 pb-6">
                {matches.map((match) => {
                  const photoUrl =
                    match.photo_url || `https://i.pravatar.cc/100?u=${match.user_id}`;

                  return (
                    <TouchableOpacity
                      key={match.id}
                      onPress={() => handleMatchPress(match)}
                      activeOpacity={0.7}
                      className="flex-row items-center bg-card rounded-2xl p-4 mb-3 border border-border"
                    >
                      {/* Avatar with heart badge */}
                      <View className="relative mr-4">
                        <Image source={{ uri: photoUrl }} className="w-16 h-16 rounded-full" />
                        <View className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full items-center justify-center border-2 border-card">
                          <Heart className="h-3 w-3 text-primary-foreground" fill="#1a3a2e" />
                        </View>
                      </View>

                      {/* Content */}
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-foreground mb-1">
                          {match.name}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          Matched {formatTimestamp(match.created_at)}
                        </Text>
                      </View>

                      {/* Start chat indicator */}
                      <View className="bg-primary/20 rounded-full px-3 py-1.5">
                        <Text className="text-xs font-semibold text-primary">Chat</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* Conversations List */}
      {!showMatches &&
        (filteredConversations.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <Text className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? "No Results" : "No Messages Yet"}
            </Text>
            <Text className="text-muted-foreground text-center">
              {searchQuery
                ? "Try a different search term"
                : "Start matching with people to begin conversations!"}
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-6 pb-6">
              {filteredConversations.map((conversation) => {
                const unreadCount = user?.id
                  ? conversationService.getUnreadCount(conversation, user.id)
                  : 0;
                const photoUrl =
                  conversation.otherUser?.photo_url ||
                  `https://i.pravatar.cc/100?u=${conversation.otherUser?.id}`;

                return (
                  <TouchableOpacity
                    key={conversation.id}
                    onPress={() => handleConversationPress(conversation.id)}
                    activeOpacity={0.7}
                    className="flex-row items-center bg-card rounded-2xl p-4 mb-3 border border-border"
                  >
                    {/* Avatar */}
                    <View className="relative mr-4">
                      <Image source={{ uri: photoUrl }} className="w-14 h-14 rounded-full" />
                      {unreadCount > 0 && (
                        <View className="absolute top-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-card items-center justify-center">
                          <Text className="text-[10px] font-bold text-primary-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-lg font-semibold text-foreground">
                          {conversation.otherUser?.name || "User"}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {formatTimestamp(conversation.last_message_at)}
                        </Text>
                      </View>
                      <Text
                        className={`text-sm ${
                          unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                        numberOfLines={1}
                      >
                        {conversation.last_message || "Start a conversation..."}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        ))}
    </SafeAreaView>
  );
}
