import * as React from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { ArrowLeft, Send, Coins } from "lucide-react-native";
import { iconWithClassName } from "~/lib/icons/iconWithClassName";
import { useAuth } from "~/hooks/useAuth";
import {
  conversationService,
  messageService,
  reactionService,
  typingService,
} from "~/lib/conversations";
import { userService } from "~/lib/auth";
import { supabase } from "~/lib/supabase";
import { giftService } from "~/lib/gifts";
import type { Message, MessageReaction, ReactionType } from "~/types";
import { Check, CheckCheck, SmilePlus, Image as ImageIcon, Mic, Gift } from "~/lib/icons";

// Register icons
iconWithClassName(ArrowLeft);
iconWithClassName(Send);
iconWithClassName(Coins);

interface MessageWithUser extends Message {
  isFromMe: boolean;
  reactions?: MessageReaction[];
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user, profile, refetchProfile } = useAuth();
  const [messages, setMessages] = React.useState<MessageWithUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [messageText, setMessageText] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [otherUser, setOtherUser] = React.useState<{
    id: string;
    name: string;
    photo_url: string | null;
  } | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = React.useState(false);
  const [reactions, setReactions] = React.useState<Record<string, MessageReaction[]>>({});
  const [selectedMessageForReaction, setSelectedMessageForReaction] = React.useState<string | null>(
    null,
  );
  const flatListRef = React.useRef<FlatList>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const isMan = profile?.gender === "man";
  const coinBalance = profile?.coins || 0;
  const MESSAGE_COST = 10; // Coins men pay per message
  const COIN_TO_DOLLAR_RATE = 0.05; // $0.05 per coin for earnings
  const MESSAGE_EARNINGS = (MESSAGE_COST / 2) * COIN_TO_DOLLAR_RATE; // Women get half the coins = $0.25

  // Refetch profile when screen comes back into focus (e.g., after sending a gift)
  useFocusEffect(
    React.useCallback(() => {
      console.log("💬 [CHAT] Screen focused, refreshing profile...");
      refetchProfile();
    }, [refetchProfile]),
  );

  // Load conversation and other user info
  React.useEffect(() => {
    if (!conversationId || !user?.id) return;

    const loadConversation = async () => {
      try {
        // Get conversation details
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single();

        if (convError) throw convError;

        // Get other user ID
        const otherUserId = convData.user1_id === user.id ? convData.user2_id : convData.user1_id;

        // Fetch other user's profile
        const otherUserProfile = await userService.getProfile(otherUserId);
        setOtherUser({
          id: otherUserProfile.id,
          name: otherUserProfile.name || "User",
          photo_url: otherUserProfile.photo_url,
        });

        console.log("💬 [CHAT] Loaded conversation with:", otherUserProfile.name);
      } catch (error) {
        console.error("Error loading conversation:", error);
        Alert.alert("Error", "Failed to load conversation");
      }
    };

    loadConversation();
  }, [conversationId, user?.id]);

  // Load messages
  React.useEffect(() => {
    if (!conversationId || !user?.id) return;

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const data = await messageService.getByConversationId(conversationId);

        const messagesWithUser: MessageWithUser[] = data.map((msg) => ({
          ...msg,
          isFromMe: msg.from_user_id === user.id,
        }));

        // Keep messages in ascending order (oldest first, newest last/bottom)
        setMessages(messagesWithUser);
        console.log("💬 [CHAT] Loaded", messagesWithUser.length, "messages");

        // Mark as read
        await conversationService.markAsRead(conversationId, user.id);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = messageService.subscribeToMessages(conversationId, (payload) => {
      console.log("💬 [CHAT] Real-time message received:", payload);
      if (payload.eventType === "INSERT") {
        const newMessage: MessageWithUser = {
          ...payload.new,
          isFromMe: payload.new.from_user_id === user.id,
        };

        // Check if message already exists (from optimistic update)
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          if (exists) {
            console.log("💬 [CHAT] Message already exists, skipping duplicate");
            return prev;
          }
          console.log("💬 [CHAT] Adding new message from real-time subscription");
          return [...prev, newMessage];
        });

        // Mark as read if not from me
        if (!newMessage.isFromMe) {
          conversationService.markAsRead(conversationId, user.id);
        }

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, user?.id]);

  const handleSend = async () => {
    if (!messageText.trim() || !user?.id || !otherUser?.id || isSending) return;

    console.log("💬 [CHAT] handleSend called");
    console.log("💬 [CHAT] User gender:", profile?.gender, "isMan:", isMan);

    // Check if man has enough coins
    if (isMan && coinBalance < MESSAGE_COST) {
      Alert.alert(
        "Insufficient Coins",
        `You need ${MESSAGE_COST} coins to send a message. Visit the Shop to purchase more coins.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Shop", onPress: () => router.push("/(tabs)/shop") },
        ],
      );
      return;
    }

    try {
      setIsSending(true);
      const content = messageText.trim();
      setMessageText(""); // Clear input immediately for better UX

      // Create optimistic message for instant UI update
      const optimisticMessage: MessageWithUser = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversation_id: conversationId,
        from_user_id: user.id,
        to_user_id: otherUser.id,
        content,
        photo_url: null,
        photo_gift_required: 0,
        photo_unlocked: true,
        is_read: false,
        created_at: new Date().toISOString(),
        isFromMe: true,
      };

      // Add message to local state immediately (optimistic update)
      setMessages((prev) => [...prev, optimisticMessage]);
      console.log("💬 [CHAT] Added optimistic message to UI");

      // Scroll to bottom immediately
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      console.log("💬 [CHAT] Sending message to database:", content);

      // Send message to database
      const sentMessage = await messageService.send({
        conversationId,
        fromUserId: user.id,
        toUserId: otherUser.id,
        content,
      });

      // Replace optimistic message with real message from database
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id ? { ...sentMessage, isFromMe: true } : msg,
        ),
      );

      console.log("💬 [CHAT] Message sent successfully, replaced optimistic message");

      // Handle payments based on sender gender
      if (isMan) {
        // Men pay coins to send messages
        const { error: coinError } = await supabase
          .from("users")
          .update({ coins: coinBalance - MESSAGE_COST })
          .eq("id", user.id);

        if (coinError) {
          console.error("Error deducting coins:", coinError);
        } else {
          console.log(`💰 [CHAT] Deducted ${MESSAGE_COST} coins from man`);

          // Record transaction
          await supabase.from("transactions").insert({
            user_id: user.id,
            type: "message_sent",
            amount: -MESSAGE_COST,
            description: `Sent message to ${otherUser.name}`,
            metadata: {
              conversation_id: conversationId,
              recipient_user_id: otherUser.id,
              coins_spent: MESSAGE_COST,
            },
          });

          // Women earn half the coins as money (in cents)
          const earningsInCents = Math.round((MESSAGE_COST / 2) * COIN_TO_DOLLAR_RATE * 100);

          // Get current earnings
          const { data: receiverData, error: receiverFetchError } = await supabase
            .from("users")
            .select("earnings")
            .eq("id", otherUser.id)
            .single();

          if (!receiverFetchError && receiverData) {
            // Update earnings
            const newEarnings = (receiverData.earnings || 0) + earningsInCents;
            const { error: earningsError } = await supabase
              .from("users")
              .update({ earnings: newEarnings })
              .eq("id", otherUser.id);

            if (!earningsError) {
              console.log(
                `💰 [CHAT] Added ${earningsInCents} cents to woman's earnings. New total: ${newEarnings}`,
              );

              // Record transaction for woman's earnings
              await supabase.from("transactions").insert({
                user_id: otherUser.id,
                type: "message_received",
                amount: earningsInCents,
                description: `Earned from message from ${profile?.name || "User"}`,
                metadata: {
                  conversation_id: conversationId,
                  sender_user_id: user.id,
                  coins_equivalent: MESSAGE_COST / 2,
                },
              });
            }
          }
        }
      }

      // Auto-claim any pending gifts when woman replies (no button needed!)
      if (!isMan && user?.id) {
        console.log("🎁 [CHAT] Checking for pending gifts to auto-claim...");

        try {
          // Get all pending gifts for this user
          const pendingGifts = await giftService.getPendingGifts(user.id);
          console.log("🎁 [CHAT] Found pending gifts:", pendingGifts.length);

          if (pendingGifts.length > 0) {
            // Claim all pending gifts in this conversation
            for (const gift of pendingGifts) {
              console.log("🎁 [CHAT] Claiming gift:", gift.id);

              const claimResult = await giftService.claimGift({
                giftTransactionId: gift.id,
                replyMessageId: sentMessage.id,
                receiverId: user.id,
              });

              console.log("🎁 [CHAT] Claim result:", claimResult);

              if (claimResult.success) {
                const earningsDollars = (claimResult.earningsCents || 0) / 100;
                console.log("✅ [CHAT] Gift claimed! Earnings:", earningsDollars);

                // Show toast notification
                Alert.alert(
                  "Gift Claimed! 🎉",
                  `You earned $${earningsDollars.toFixed(2)} by replying!`,
                  [{ text: "Awesome!" }],
                );
              }
            }

            // Refresh profile to show updated earnings
            console.log("🔄 [CHAT] Refetching profile after claiming gifts...");
            await refetchProfile();
            console.log("✅ [CHAT] Profile refetched!");
          }
        } catch (claimError) {
          console.error("❌ [CHAT] Error auto-claiming gifts:", claimError);
          // Don't show error to user - gifts will remain pending
        }
      }

      console.log("💬 [CHAT] Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      setMessageText(content); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const GiftMessageItem = ({ item }: { item: MessageWithUser }) => {
    const [giftStatus, setGiftStatus] = React.useState<"pending" | "claimed" | "expired" | null>(
      null,
    );
    const [isCheckingGift, setIsCheckingGift] = React.useState(false);

    // Extract gift transaction ID from message content
    // Format: "🎁 Sent {icon} {name} ({coins} coins) [giftTxId:{id}]"
    const giftTxIdMatch = item.content?.match(/\[giftTxId:([^\]]+)\]/);
    const giftTransactionId = giftTxIdMatch ? giftTxIdMatch[1] : null;

    // Check gift status on mount and when message changes
    React.useEffect(() => {
      if (giftTransactionId && !item.isFromMe) {
        checkGiftStatus();
      }
    }, [giftTransactionId, item.id]);

    const checkGiftStatus = async () => {
      try {
        setIsCheckingGift(true);
        const gift = await giftService.getGiftByMessageId(item.id);
        if (gift) {
          setGiftStatus(gift.status as any);
        }
      } catch (error) {
        console.error("Error checking gift status:", error);
      } finally {
        setIsCheckingGift(false);
      }
    };

    const canClaimGift = !item.isFromMe && giftStatus === "pending";
    const isGiftClaimed = giftStatus === "claimed";
    const isGiftExpired = giftStatus === "expired";

    // Clean message content (remove giftTxId)
    const displayContent = item.content?.replace(/\[giftTxId:[^\]]+\]/, "").trim();

    return (
      <View className="max-w-[85%]">
        <View
          className={`rounded-2xl px-4 py-3 ${
            item.isFromMe
              ? "bg-primary/20 border-2 border-primary rounded-tr-sm"
              : canClaimGift
                ? "bg-yellow-500/20 border-2 border-yellow-500 rounded-tl-sm"
                : isGiftClaimed
                  ? "bg-green-500/20 border-2 border-green-500 rounded-tl-sm"
                  : isGiftExpired
                    ? "bg-gray-500/20 border-2 border-gray-500 rounded-tl-sm"
                    : "bg-primary/10 border-2 border-primary rounded-tl-sm"
          }`}
        >
          <Text className="text-base text-primary font-bold">{displayContent}</Text>

          {/* Gift Status Indicators */}
          {!item.isFromMe && (
            <View className="mt-2">
              {isGiftClaimed && (
                <Text className="text-xs text-green-600 font-semibold">✓ Claimed!</Text>
              )}
              {isGiftExpired && (
                <Text className="text-xs text-gray-500 font-semibold">⏰ Expired</Text>
              )}
              {canClaimGift && (
                <Text className="text-xs text-yellow-600 font-semibold">
                  💬 Send any message to claim!
                </Text>
              )}
            </View>
          )}

          <Text className="text-xs mt-1 text-primary/70">{formatTimestamp(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: MessageWithUser }) => {
    // Check if this is a gift message
    const isGiftMessage = item.content?.startsWith("🎁");

    return (
      <View className={`mb-3 flex-row ${item.isFromMe ? "justify-end" : "justify-start"}`}>
        {!item.isFromMe && otherUser?.photo_url && (
          <Image source={{ uri: otherUser.photo_url }} className="w-8 h-8 rounded-full mr-2" />
        )}

        {isGiftMessage ? (
          <GiftMessageItem item={item} />
        ) : (
          <View
            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              item.isFromMe
                ? "bg-primary rounded-tr-sm"
                : "bg-card border border-border rounded-tl-sm"
            }`}
          >
            <Text
              className={`text-base ${item.isFromMe ? "text-primary-foreground" : "text-foreground"}`}
            >
              {item.content}
            </Text>
            <Text
              className={`text-xs mt-1 ${
                item.isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {formatTimestamp(item.created_at)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          {otherUser?.photo_url && (
            <Image source={{ uri: otherUser.photo_url }} className="w-10 h-10 rounded-full mr-3" />
          )}
          <Text className="text-xl font-bold text-foreground flex-1">
            {otherUser?.name || "Chat"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {/* Gift Button */}
          {isMan && otherUser && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/gifts/shop",
                  params: {
                    receiverId: otherUser.id,
                    receiverName: otherUser.name,
                    conversationId,
                  },
                })
              }
              className="bg-primary/20 rounded-full p-2 border border-primary"
            >
              <Gift className="h-5 w-5 text-primary" />
            </TouchableOpacity>
          )}
          {/* Coin Balance */}
          {isMan && (
            <View className="flex-row items-center bg-card rounded-full px-3 py-1.5 border border-border">
              <Coins className="h-4 w-4 text-primary mr-1" />
              <Text className="text-sm font-semibold text-foreground">{coinBalance}</Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Messages List */}
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-xl font-semibold text-foreground mb-2">
              Start the conversation!
            </Text>
            <Text className="text-muted-foreground text-center">
              {isMan ? `Send a message for ${MESSAGE_COST} coins` : "Say hello and start chatting"}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerClassName="px-6 py-4"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input Area */}
        <View className="px-6 py-4 border-t border-border">
          <View className="flex-row items-center bg-input rounded-2xl px-4 py-2 border border-border">
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder={
                isMan
                  ? `Message (${MESSAGE_COST} coins)`
                  : `Reply to collect ${MESSAGE_COST / 2} coins...`
              }
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              className="flex-1 text-foreground text-base py-2"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
              className={`ml-3 p-2 rounded-full ${
                messageText.trim() && !isSending ? "bg-primary" : "bg-muted"
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#1a3a2e" />
              ) : (
                <Send
                  className={
                    messageText.trim() ? "text-primary-foreground" : "text-muted-foreground"
                  }
                  size={20}
                />
              )}
            </TouchableOpacity>
          </View>
          {isMan ? (
            <Text className="text-xs text-muted-foreground text-center mt-2">
              Each message costs {MESSAGE_COST} coins • Balance: {coinBalance} coins
            </Text>
          ) : (
            <Text className="text-xs text-primary text-center mt-2">
              💰 Collect {MESSAGE_COST / 2} coins by replying to messages • Free to send
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
