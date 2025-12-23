import * as React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Coins, X } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { giftService } from "~/lib/gifts";
import { messageService } from "~/lib/conversations";
import { supabase } from "~/lib/supabase";
import { cn } from "~/lib/utils";

export default function GiftConfirmScreen() {
  const { giftId, giftName, giftIcon, giftCoins, receiverId, receiverName, conversationId } =
    useLocalSearchParams<{
      giftId: string;
      giftName: string;
      giftIcon: string;
      giftCoins: string;
      receiverId: string;
      receiverName?: string;
      conversationId?: string;
    }>();

  const { user, profile, refetchProfile } = useAuth();
  const [isPurchasing, setIsPurchasing] = React.useState(false);

  const coinBalance = profile?.coins || 0;
  const coins = parseInt(giftCoins || "0", 10);
  const newBalance = coinBalance - coins;

  // Log all values on mount for debugging
  React.useEffect(() => {
    console.log("🎁 [CONFIRM] Screen mounted with values:", {
      giftId,
      giftName,
      giftIcon,
      giftCoins,
      coins,
      receiverId,
      receiverName,
      conversationId,
      userId: user?.id,
      profileCoins: profile?.coins,
      coinBalance,
      newBalance,
    });
  }, []);

  const handleConfirmPurchase = async () => {
    console.log("🎁 [CONFIRM] Confirm button clicked");
    console.log("🎁 [CONFIRM] Current state:", {
      userId: user?.id,
      receiverId,
      giftId,
      coins,
      coinBalance,
      newBalance,
      isPurchasing,
    });

    // Validation
    if (!user?.id || !receiverId || !giftId) {
      console.error("❌ [CONFIRM] Missing required information");
      const errorMsg = "Missing required information. Please try again.";
      if (Platform.OS === "web") {
        window.alert(errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
      return;
    }

    // Check if user has enough coins
    if (coinBalance < coins) {
      console.error("❌ [CONFIRM] Insufficient coins:", { coinBalance, coins });
      const errorMsg = `You need ${coins} coins but only have ${coinBalance} coins.`;
      if (Platform.OS === "web") {
        window.alert(errorMsg);
      } else {
        Alert.alert("Insufficient Coins", errorMsg);
      }
      return;
    }

    console.log("🎁 [CONFIRM] Validation passed, processing purchase...");
    setIsPurchasing(true);

    try {
      // Send the gift and deduct coins
      console.log("🎁 [CONFIRM] Calling giftService.sendGift...");
      const giftTransaction = await giftService.sendGift({
        giftId,
        senderId: user.id,
        receiverId,
        coinsSpent: coins,
        conversationId,
      });

      console.log("✅ [CONFIRM] Gift sent successfully! Transaction ID:", giftTransaction.id);

      // Send gift message to chat if conversationId exists
      if (conversationId) {
        console.log("💬 [CONFIRM] Sending gift message to chat...");
        try {
          const giftMessage = await messageService.send({
            conversationId,
            fromUserId: user.id,
            toUserId: receiverId,
            content: `🎁 Sent ${giftIcon} ${giftName} (${coins} coins) [giftTxId:${giftTransaction.id}]`,
          });

          console.log("✅ [CONFIRM] Gift message sent to chat");

          // Update gift transaction with message ID
          const { error: updateError } = await supabase
            .from("gift_transactions")
            .update({ message_id: giftMessage.id })
            .eq("id", giftTransaction.id);

          if (updateError) {
            console.error("⚠️ [CONFIRM] Failed to link message to gift:", updateError);
          } else {
            console.log("✅ [CONFIRM] Gift transaction linked to message");
          }
        } catch (messageError) {
          console.error("⚠️ [CONFIRM] Failed to send gift message to chat:", messageError);
          // Don't fail the whole transaction if message send fails
        }
      }

      // Refresh profile to update coin balance
      console.log("🔄 [CONFIRM] Refreshing profile...");
      await refetchProfile();
      console.log("✅ [CONFIRM] Profile refreshed");

      // Show success message and navigate back to chat
      const successMsg = `You sent ${giftIcon} ${giftName} to ${receiverName}!`;
      console.log("🎉 [CONFIRM]", successMsg);

      if (Platform.OS === "web") {
        // On web, use native alert and navigate immediately
        window.alert(`Gift Sent! 🎉\n\n${successMsg}`);
        console.log("🎁 [CONFIRM] Navigating back to chat...");
        // Go back twice to dismiss both confirm and shop screens
        router.back(); // Back from confirm screen
        setTimeout(() => {
          router.back(); // Back from shop screen to chat
        }, 100);
      } else {
        // On native, use Alert with callback
        Alert.alert(
          "Gift Sent! 🎉",
          successMsg,
          [
            {
              text: "OK",
              onPress: () => {
                console.log("🎁 [CONFIRM] Navigating back to chat...");
                // Go back twice to dismiss both confirm and shop screens
                router.back();
                setTimeout(() => {
                  router.back();
                }, 100);
              },
            },
          ],
          { cancelable: false },
        );
      }
    } catch (error) {
      console.error("❌ [CONFIRM] Error sending gift:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to send gift. Please try again.";

      if (Platform.OS === "web") {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCancel = () => {
    console.log("🎁 [CONFIRM] Purchase cancelled");
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-border flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Confirm Purchase</Text>
          <TouchableOpacity onPress={handleCancel} disabled={isPurchasing}>
            <X className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-8 justify-center">
          {/* Gift Display */}
          <View className="bg-card rounded-3xl p-8 border-2 border-primary mb-6 items-center">
            <Text className="text-8xl mb-4">{giftIcon}</Text>
            <Text className="text-2xl font-bold text-foreground mb-2">{giftName}</Text>
            <View className="flex-row items-center bg-primary/20 rounded-full px-4 py-2">
              <Coins className="h-5 w-5 text-primary mr-2" />
              <Text className="text-xl font-bold text-primary">{coins} coins</Text>
            </View>
          </View>

          {/* Recipient Info */}
          <View className="bg-muted rounded-2xl p-4 mb-6">
            <Text className="text-sm text-muted-foreground text-center mb-1">Sending to</Text>
            <Text className="text-lg font-bold text-foreground text-center">
              {receiverName || "User"}
            </Text>
          </View>

          {/* Balance Info */}
          <View
            className={cn(
              "rounded-2xl p-4 border-2 mb-8",
              coinBalance < coins
                ? "bg-destructive/10 border-destructive"
                : "bg-card border-border",
            )}
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-muted-foreground">Current Balance</Text>
              <View className="flex-row items-center">
                <Coins className="h-4 w-4 text-foreground mr-1" />
                <Text className="text-base font-semibold text-foreground">{coinBalance}</Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-muted-foreground">Gift Cost</Text>
              <View className="flex-row items-center">
                <Coins className="h-4 w-4 text-destructive mr-1" />
                <Text className="text-base font-semibold text-destructive">-{coins}</Text>
              </View>
            </View>
            <View className="h-px bg-border my-2" />
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-bold text-foreground">New Balance</Text>
              <View className="flex-row items-center">
                <Coins
                  className={cn(
                    "h-5 w-5 mr-1",
                    newBalance < 0 ? "text-destructive" : "text-primary",
                  )}
                />
                <Text
                  className={cn(
                    "text-xl font-bold",
                    newBalance < 0 ? "text-destructive" : "text-primary",
                  )}
                >
                  {newBalance}
                </Text>
              </View>
            </View>

            {/* Insufficient Coins Warning */}
            {coinBalance < coins && (
              <View className="mt-3 bg-destructive/20 rounded-xl p-3">
                <Text className="text-sm font-semibold text-destructive text-center">
                  ⚠️ You need {coins - coinBalance} more coins
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    console.log("🎁 [CONFIRM] Navigating to shop");
                    router.push("/(tabs)/shop");
                  }}
                  className="mt-2 bg-primary rounded-lg py-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-sm font-bold text-primary-foreground text-center">
                    Get More Coins
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => {
                console.log("🎁 [CONFIRM] Confirm button onPress triggered");
                handleConfirmPurchase();
              }}
              disabled={isPurchasing || coinBalance < coins}
              activeOpacity={0.7}
              className={cn(
                "rounded-2xl py-4 items-center",
                isPurchasing || coinBalance < coins ? "bg-primary/50" : "bg-primary",
              )}
              style={
                {
                  cursor: "pointer",
                  userSelect: "none",
                } as any
              }
            >
              {isPurchasing ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="text-lg font-bold text-primary-foreground ml-2">
                    Sending Gift...
                  </Text>
                </View>
              ) : coinBalance < coins ? (
                <Text className="text-lg font-bold text-primary-foreground">
                  ⚠️ Insufficient Coins
                </Text>
              ) : (
                <Text className="text-lg font-bold text-primary-foreground">
                  ✓ Confirm Purchase
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                console.log("🎁 [CONFIRM] Cancel button onPress triggered");
                handleCancel();
              }}
              disabled={isPurchasing}
              activeOpacity={0.7}
              className={cn(
                "rounded-2xl py-4 items-center border-2 border-border",
                isPurchasing ? "opacity-50" : "bg-background",
              )}
              style={
                {
                  cursor: "pointer",
                  userSelect: "none",
                } as any
              }
            >
              <Text className="text-lg font-semibold text-foreground">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
