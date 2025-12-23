import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Coins, Sparkles, Crown, Zap, Tag, X } from "~/lib/icons";
import { cn } from "~/lib/utils";
import { useAuth } from "~/hooks/useAuth";
import type { CoinPackage } from "~/types";
import { paymentService } from "~/lib/payment-service";
import { promotionsService, type PromotionForUser, type AppliedPromotion } from "~/lib/promotions";
import { useStripePayment } from "~/lib/stripe-payment";
import { supabase } from "~/lib/supabase";

// Coin packages with exact pricing from requirements
const COIN_PACKAGES: CoinPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    price: 4.99,
    baseCoins: 50,
    bonusCoins: 0,
    totalCoins: 50,
    pricePerCoin: 0.1,
  },
  {
    id: "standard",
    name: "Standard Pack",
    price: 9.99,
    baseCoins: 120,
    bonusCoins: 20,
    totalCoins: 140,
    pricePerCoin: 0.071,
    badge: "Popular",
  },
  {
    id: "premium",
    name: "Premium Pack",
    price: 19.99,
    baseCoins: 300,
    bonusCoins: 60,
    totalCoins: 360,
    pricePerCoin: 0.056,
    badge: "Great Value",
  },
  {
    id: "mega",
    name: "Mega Pack",
    price: 49.99,
    baseCoins: 900,
    bonusCoins: 300,
    totalCoins: 1200,
    pricePerCoin: 0.041,
  },
  {
    id: "vip",
    name: "VIP Pack",
    price: 99.99,
    baseCoins: 2000,
    bonusCoins: 800,
    totalCoins: 2800,
    pricePerCoin: 0.036,
    isBestValue: true,
    badge: "Best Value",
  },
];

export default function ShopScreen() {
  const { profile, refetchProfile, user } = useAuth();
  const { processPayment } = useStripePayment();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [activePromotions, setActivePromotions] = React.useState<PromotionForUser[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = React.useState(true);
  const [promoCode, setPromoCode] = React.useState("");
  const [appliedPromotion, setAppliedPromotion] = React.useState<PromotionForUser | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<{ [key: string]: string }>({});
  const [localCoinBalance, setLocalCoinBalance] = React.useState(0);

  // Use real coin balance from profile or local state
  const coinBalance = localCoinBalance || profile?.coins || 0;

  // Update local coin balance when profile changes
  React.useEffect(() => {
    if (profile?.coins !== undefined) {
      setLocalCoinBalance(profile.coins);
    }
  }, [profile?.coins]);

  // Load active promotions
  React.useEffect(() => {
    const loadPromotions = async () => {
      if (!profile?.id) return;

      try {
        setIsLoadingPromotions(true);
        const promotions = await promotionsService.getActivePromotionsForUser(profile.id);
        setActivePromotions(promotions);
      } catch (error) {
        console.error("Error loading promotions:", error);
      } finally {
        setIsLoadingPromotions(false);
      }
    };

    loadPromotions();
  }, [profile?.id]);

  // Update countdown timers every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: { [key: string]: string } = {};
      activePromotions.forEach((promo) => {
        newTimeRemaining[promo.id] = promotionsService.formatTimeRemaining(promo.end_date);
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [activePromotions]);

  // Subscribe to real-time coin balance updates
  React.useEffect(() => {
    if (!user?.id) return;

    console.log("🔔 [SHOP] Setting up real-time coin balance subscription");

    const subscription = supabase
      .channel(`user-coins-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔔 [SHOP] Real-time coin balance update:", payload);
          if (payload.new && "coins" in payload.new) {
            const newCoins = payload.new.coins as number;
            console.log("💰 [SHOP] Updating local coin balance:", newCoins);
            setLocalCoinBalance(newCoins);

            // Also refresh the profile to keep everything in sync
            refetchProfile();
          }
        },
      )
      .subscribe();

    return () => {
      console.log("🔔 [SHOP] Cleaning up real-time subscription");
      subscription.unsubscribe();
    };
  }, [user?.id, refetchProfile]);

  // Check for payment success when returning from Stripe
  React.useEffect(() => {
    const checkPaymentSuccess = async () => {
      console.log("🔍 [SHOP] Checking for payment success...");
      console.log("🔍 [SHOP] Platform:", Platform.OS);
      console.log(
        "🔍 [SHOP] Current URL:",
        typeof window !== "undefined" ? window.location.href : "N/A",
      );

      // Only run on web platform
      if (Platform.OS !== "web") return;

      try {
        // Check if we have payment=success in URL
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get("payment");

        console.log("🔍 [SHOP] URL params:", Object.fromEntries(urlParams.entries()));
        console.log("🔍 [SHOP] Payment status:", paymentStatus);

        if (paymentStatus === "success") {
          console.log("🎉 Payment success detected! Refreshing profile...");

          // Clear the URL parameter
          window.history.replaceState({}, "", window.location.pathname);

          // First, try to get purchase details from URL parameters
          let coinsParam = urlParams.get("coins");
          let packageIdParam = urlParams.get("packageId");
          let sessionIdParam = urlParams.get("session_id");

          // If URL parameters are missing, try to retrieve from sessionStorage
          if (!coinsParam || !packageIdParam) {
            console.log("⚠️ [SHOP] URL parameters missing, checking sessionStorage...");
            const storedPurchase = sessionStorage.getItem("pendingCoinPurchase");

            if (storedPurchase) {
              try {
                const purchaseData = JSON.parse(storedPurchase);
                console.log("💾 [SHOP] Retrieved pending purchase from storage:", purchaseData);

                // Only use if it's from the correct user and within the last 10 minutes
                const isRecent = Date.now() - purchaseData.timestamp < 10 * 60 * 1000;
                const isCorrectUser = purchaseData.userId === user?.id;

                if (isRecent && isCorrectUser) {
                  coinsParam = purchaseData.coins.toString();
                  packageIdParam = purchaseData.packageId;
                  console.log("✅ [SHOP] Using stored purchase data");
                } else {
                  console.log("❌ [SHOP] Stored purchase is stale or for different user");
                }

                // Clear the stored data after using it
                sessionStorage.removeItem("pendingCoinPurchase");
              } catch (e) {
                console.error("❌ [SHOP] Error parsing stored purchase:", e);
              }
            } else {
              console.log("⚠️ [SHOP] No stored purchase found in sessionStorage");
            }
          }

          console.log("📦 Purchase details:", { coinsParam, packageIdParam, sessionIdParam });

          // Poll for updated balance (webhook might take a moment to process)
          let attempts = 0;
          const maxAttempts = 10;
          const pollInterval = 1000; // 1 second

          const previousCoins = coinBalance;
          console.log("💰 Previous coin balance:", previousCoins);

          // Show a loading message
          Alert.alert(
            "Processing Payment...",
            "Your payment was successful! We're updating your coin balance.",
            [{ text: "OK" }],
          );

          const pollForUpdate = async () => {
            attempts++;
            console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);

            // Refetch profile and get the latest data
            const result = await refetchProfile();
            const newCoins = result.data?.coins || coinBalance;

            console.log("💰 Current coin balance:", newCoins);
            console.log("💰 Previous coin balance:", previousCoins);
            console.log("💰 Profile data:", result.data);

            // Also check the transactions table to see if payment was recorded
            if (user?.id) {
              try {
                const { data: recentTransactions } = await supabase
                  .from("transactions")
                  .select("*")
                  .eq("user_id", user.id)
                  .eq("type", "coin_purchase")
                  .order("created_at", { ascending: false })
                  .limit(1);

                console.log("💰 Recent coin purchase transactions:", recentTransactions);
              } catch (err) {
                console.error("Error checking transactions:", err);
              }
            }

            if (newCoins > previousCoins) {
              console.log("✅ Coin balance updated!");
              Alert.alert(
                "Purchase Successful! 🎉",
                `Your coins have been added to your account!\n\nNew Balance: ${newCoins.toLocaleString()} coins`,
                [{ text: "Awesome!" }],
              );
              return true;
            }

            if (attempts < maxAttempts) {
              setTimeout(pollForUpdate, pollInterval);
            } else {
              console.log("⚠️ Max polling attempts reached");
              console.error(
                "❌ PAYMENT ISSUE: Coins not updated after payment. Webhook likely not working.",
              );
              console.log("🔧 Attempting manual coin addition as fallback...");

              // FALLBACK: Manually add coins if webhook didn't work
              if (user?.id && coinsParam) {
                try {
                  const coinsToAdd = parseInt(coinsParam);
                  console.log(`🔧 Manually adding ${coinsToAdd} coins to user ${user.id}`);

                  // Direct database update (same method as test button that works!)
                  const currentCoins = coinBalance || 0;
                  const { data, error: updateError } = await supabase
                    .from("users")
                    .update({ coins: currentCoins + coinsToAdd })
                    .eq("id", user.id)
                    .select();

                  if (updateError) {
                    console.error("❌ Manual coin addition failed:", updateError);
                    Alert.alert(
                      "Payment Successful!",
                      "Your payment was processed. If you don't see your coins yet, please refresh the app.\n\nIf issues persist, contact support.",
                      [{ text: "OK" }],
                    );
                  } else {
                    console.log("✅ Manual coin addition successful!", data);

                    // Also create transaction record
                    await supabase.from("transactions").insert({
                      user_id: user.id,
                      type: "coin_purchase",
                      amount: coinsToAdd,
                      description: `Purchased ${coinsToAdd} coins`,
                      metadata: {
                        package_id: packageIdParam || "unknown",
                        amount_cents: parseInt(urlParams.get("amount") || "0"),
                        payment_intent_id: sessionIdParam || "manual_" + Date.now(),
                      },
                    });

                    // Refresh profile to get new balance
                    await refetchProfile();
                    Alert.alert(
                      "Purchase Successful! 🎉",
                      `Your coins have been added!\n\n${coinsToAdd.toLocaleString()} coins added to your account.\n\nNew balance: ${(currentCoins + coinsToAdd).toLocaleString()} coins`,
                      [{ text: "Awesome!" }],
                    );
                  }
                } catch (err) {
                  console.error("❌ Error in manual coin addition:", err);
                  Alert.alert(
                    "Payment Successful!",
                    "Your payment was processed. Please refresh the app to see your coins.",
                    [{ text: "OK" }],
                  );
                }
              } else {
                Alert.alert(
                  "Payment Successful!",
                  "Your payment was processed. If you don't see your coins yet, please refresh the app.",
                  [{ text: "OK" }],
                );
              }
            }
          };

          // Start polling after a short delay to allow webhook to process
          setTimeout(pollForUpdate, 1500);
        } else if (paymentStatus === "cancelled") {
          console.log("❌ Payment cancelled");

          // Clear the URL parameter
          window.history.replaceState({}, "", window.location.pathname);

          // Also clear any pending purchase from storage
          sessionStorage.removeItem("pendingCoinPurchase");

          Alert.alert("Payment Cancelled", "Your payment was cancelled. No charges were made.", [
            { text: "OK" },
          ]);
        } else {
          // No payment parameter in URL, but check if there's a pending purchase
          // This handles the case where Stripe redirects back without parameters
          const storedPurchase = sessionStorage.getItem("pendingCoinPurchase");

          if (storedPurchase) {
            try {
              const purchaseData = JSON.parse(storedPurchase);
              console.log("🔍 [SHOP] Found pending purchase without URL parameter:", purchaseData);

              // Check if it's recent (within last 5 minutes) and for current user
              const isRecent = Date.now() - purchaseData.timestamp < 5 * 60 * 1000;
              const isCorrectUser = purchaseData.userId === user?.id;

              if (isRecent && isCorrectUser) {
                console.log("⚠️ [SHOP] User returned from payment without URL parameters!");
                console.log(
                  "💡 [SHOP] Checking if coins were added via webhook or need fallback...",
                );

                // Wait a moment for webhook to process
                setTimeout(async () => {
                  const previousCoins = coinBalance;
                  await refetchProfile();
                  const currentCoinsResult = await refetchProfile();
                  const currentCoins = currentCoinsResult.data?.coins || coinBalance;

                  if (currentCoins > previousCoins) {
                    // Webhook worked! Just show success
                    console.log("✅ [SHOP] Webhook added coins successfully");
                    sessionStorage.removeItem("pendingCoinPurchase");

                    Alert.alert(
                      "Purchase Successful! 🎉",
                      `Your coins have been added!\n\nNew Balance: ${currentCoins.toLocaleString()} coins`,
                      [{ text: "Awesome!" }],
                    );
                  } else {
                    // Webhook didn't work, use fallback
                    console.log("⚠️ [SHOP] Webhook didn't add coins, using fallback...");

                    const coinsToAdd = purchaseData.coins;
                    const { data, error: updateError } = await supabase
                      .from("users")
                      .update({ coins: currentCoins + coinsToAdd })
                      .eq("id", user.id)
                      .select();

                    if (!updateError) {
                      // Also create transaction record
                      await supabase.from("transactions").insert({
                        user_id: user.id,
                        type: "coin_purchase",
                        amount: coinsToAdd,
                        description: `Purchased ${coinsToAdd} coins`,
                        metadata: {
                          package_id: purchaseData.packageId,
                          amount_cents: purchaseData.amount,
                          payment_intent_id: "fallback_" + Date.now(),
                          source: "sessionStorage_fallback",
                        },
                      });

                      sessionStorage.removeItem("pendingCoinPurchase");
                      await refetchProfile();

                      Alert.alert(
                        "Purchase Successful! 🎉",
                        `Your coins have been added!\n\n${coinsToAdd.toLocaleString()} coins added to your account.`,
                        [{ text: "Awesome!" }],
                      );
                    }
                  }
                }, 2000); // Wait 2 seconds for webhook
              }
            } catch (e) {
              console.error("❌ [SHOP] Error processing pending purchase:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error checking payment success:", error);
      }
    };

    checkPaymentSuccess();
  }, [refetchProfile, coinBalance, profile, user]);

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim() || !profile?.id) return;

    try {
      const validation = await promotionsService.validatePromotionCode(
        promoCode.trim().toUpperCase(),
        profile.id,
      );

      if (validation.valid && validation.promotion_id) {
        // Find the full promotion details
        const promo = activePromotions.find((p) => p.id === validation.promotion_id);
        if (promo) {
          setAppliedPromotion(promo);
          Alert.alert("Success!", `${promo.title} applied successfully!`);
          setPromoCode("");
        }
      } else {
        Alert.alert("Invalid Code", validation.error || "This promo code is not valid");
      }
    } catch (error) {
      console.error("Error applying promo code:", error);
      Alert.alert("Error", "Failed to apply promo code");
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    Alert.alert("Removed", "Promotion code removed");
  };

  const handleSelectPromotion = (promo: PromotionForUser) => {
    if (promo.can_use) {
      setAppliedPromotion(promo);
      Alert.alert("Applied!", `${promo.title} has been applied to your purchase`);
    } else {
      Alert.alert("Unavailable", "This promotion cannot be used at this time");
    }
  };

  const calculateFinalPrice = (pkg: CoinPackage): AppliedPromotion | null => {
    if (!appliedPromotion) return null;

    return promotionsService.calculatePromotionBenefit(
      appliedPromotion,
      Math.round(pkg.price * 100), // Convert to cents
      pkg.baseCoins,
    );
  };

  const handlePurchase = async (pkg: CoinPackage) => {
    console.log("💳 [SHOP] ========================================");
    console.log("💳 [SHOP] handlePurchase called for:", pkg.name);
    console.log("💳 [SHOP] Package details:", pkg);
    console.log("💳 [SHOP] Current coin balance:", coinBalance);

    if (!profile?.id) {
      console.log("❌ [SHOP] No profile ID found");
      Alert.alert("Error", "Please log in to purchase coins");
      return;
    }

    console.log("✅ [SHOP] Profile ID found:", profile.id);
    console.log("✅ [SHOP] User email:", profile.email);
    setIsProcessing(true);

    try {
      // Calculate final pricing with promotions
      const finalPrice = calculateFinalPrice(pkg);
      const amount = finalPrice ? finalPrice.discountedAmountCents / 100 : pkg.price;
      const coins = finalPrice ? finalPrice.totalCoins : pkg.totalCoins;

      // Store purchase details in sessionStorage BEFORE redirecting to Stripe
      // This way we can retrieve it when the user returns, even without URL parameters
      if (Platform.OS === "web") {
        const pendingPurchase = {
          packageId: pkg.id,
          coins: coins,
          amount: Math.round(amount * 100), // Store as cents
          timestamp: Date.now(),
          userId: profile.id,
        };

        console.log("💾 [SHOP] Storing pending purchase in sessionStorage:", pendingPurchase);
        sessionStorage.setItem("pendingCoinPurchase", JSON.stringify(pendingPurchase));
      }

      // Process payment with Stripe
      const result = await processPayment({
        packageId: pkg.id,
        amount,
        coins,
        userId: profile.id,
        userName: profile.full_name,
        userEmail: profile.email,
        onSuccess: async () => {
          // Refresh profile to get updated balance
          await refetchProfile();

          // Show success message
          Alert.alert(
            "Purchase Successful! 🎉",
            `You've received ${coins.toLocaleString()} coins!\n\nNew Balance: ${(coinBalance + coins).toLocaleString()} coins`,
            [{ text: "Awesome!" }],
          );

          // Clear applied promotion
          setAppliedPromotion(null);
        },
      });

      // Handle cancellation or error (already handled in processPayment)
      if (result.cancelled || result.error) {
        // No additional action needed
      }
    } catch (error) {
      console.error("Purchase error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const getPackageIcon = (pkg: CoinPackage) => {
    if (pkg.isBestValue) return Crown;
    if (pkg.bonusCoins >= 300) return Zap;
    if (pkg.bonusCoins > 0) return Sparkles;
    return Coins;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section with green theme */}
        <View className="bg-card px-6 py-8 border-b border-border">
          <View className="items-center">
            <View className="bg-primary/20 rounded-full p-4 mb-4">
              <Coins className="h-12 w-12 text-primary" />
            </View>
            <Text className="text-3xl font-bold text-foreground mb-2">Your Balance</Text>
            <View className="flex-row items-center bg-background rounded-2xl px-6 py-3 border border-border">
              <Coins className="h-6 w-6 text-primary mr-2" />
              <Text className="text-4xl font-bold text-primary">
                {coinBalance.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Active Promotions Banner */}
        {!isLoadingPromotions && activePromotions.length > 0 && (
          <View className="px-6 mt-6">
            <Text className="text-lg font-bold text-foreground mb-3">🎉 Active Promotions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
              {activePromotions.map((promo) => (
                <TouchableOpacity
                  key={promo.id}
                  onPress={() => handleSelectPromotion(promo)}
                  disabled={!promo.can_use}
                  className={cn(
                    "mr-3 rounded-2xl p-4 border-2 min-w-[280px]",
                    appliedPromotion?.id === promo.id
                      ? "bg-primary/20 border-primary"
                      : promo.can_use
                        ? "bg-card border-primary/50"
                        : "bg-muted border-border opacity-50",
                  )}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-2xl">
                      {promo.promotion_type === "bonus_coins"
                        ? "🎁"
                        : promo.promotion_type === "discount_percentage"
                          ? "💰"
                          : "⭐"}
                    </Text>
                    <View className="bg-primary/20 rounded-full px-3 py-1">
                      <Text className="text-xs font-bold text-primary">
                        {timeRemaining[promo.id] || "Calculating..."}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-lg font-bold text-foreground mb-1">{promo.title}</Text>
                  {promo.description && (
                    <Text className="text-sm text-muted-foreground mb-2">{promo.description}</Text>
                  )}
                  <View className="flex-row items-center">
                    <Tag className="h-4 w-4 text-primary mr-1" />
                    <Text className="text-xs font-mono font-bold text-primary">{promo.code}</Text>
                  </View>
                  {appliedPromotion?.id === promo.id && (
                    <View className="mt-2 bg-primary rounded-full py-1">
                      <Text className="text-xs font-bold text-primary-foreground text-center">
                        ✓ APPLIED
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Promo Code Input */}
        <View className="px-6 mt-6">
          {appliedPromotion ? (
            <View className="bg-primary/20 rounded-2xl p-4 border-2 border-primary">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-primary mb-1">
                    {appliedPromotion.title}
                  </Text>
                  <View className="flex-row items-center">
                    <Tag className="h-3 w-3 text-primary mr-1" />
                    <Text className="text-xs font-mono text-primary">{appliedPromotion.code}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleRemovePromotion}
                  className="bg-primary/20 rounded-full p-2"
                >
                  <X className="h-5 w-5 text-primary" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="bg-card rounded-2xl p-4 border border-border">
              <Text className="text-sm font-semibold text-foreground mb-2">Have a promo code?</Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-1 bg-background border border-border rounded-xl px-4 py-2">
                  <TextInput
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="Enter code"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    className="text-base text-foreground"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleApplyPromoCode}
                  disabled={!promoCode.trim()}
                  className={cn(
                    "rounded-xl px-5 py-3",
                    promoCode.trim() ? "bg-primary" : "bg-muted",
                  )}
                >
                  <Text
                    className={cn(
                      "font-semibold",
                      promoCode.trim() ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Info Banner */}
        <View className="mx-6 mt-6 bg-primary/10 rounded-2xl p-4 border border-primary/30">
          <Text className="text-sm text-foreground text-center">
            💬 Send messages, start video calls, and send gifts to connect with amazing people
          </Text>
        </View>

        {/* Packages Section */}
        <View className="px-6 py-6">
          <Text className="text-2xl font-bold text-foreground mb-6">Choose Your Package</Text>

          {COIN_PACKAGES.map((pkg) => {
            const IconComponent = getPackageIcon(pkg);
            const isLarge = pkg.price >= 49.99;
            const finalPrice = calculateFinalPrice(pkg);
            const hasPromotion = !!finalPrice;

            return (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => {
                  console.log(`📦 Package pressed: ${pkg.name} ($${pkg.price})`);
                  handlePurchase(pkg);
                }}
                activeOpacity={0.7}
                disabled={isProcessing}
                className={cn(
                  "mb-4 rounded-3xl overflow-hidden border-2",
                  hasPromotion
                    ? "bg-primary/10 border-primary"
                    : pkg.isBestValue
                      ? "bg-primary/20 border-primary"
                      : "bg-card border-border",
                  isProcessing && "opacity-50",
                )}
                style={
                  {
                    // Ensure touch events work on mobile browsers
                    cursor: "pointer",
                    userSelect: "none",
                  } as any
                }
              >
                {/* Badge */}
                {(pkg.badge || hasPromotion) && (
                  <View
                    className={cn(
                      "absolute top-3 right-3 px-3 py-1 rounded-full z-10",
                      hasPromotion
                        ? "bg-primary"
                        : pkg.isBestValue
                          ? "bg-primary"
                          : "bg-primary/80",
                    )}
                  >
                    <Text className="text-xs font-bold text-primary-foreground">
                      {hasPromotion ? "🎉 PROMO" : pkg.badge}
                    </Text>
                  </View>
                )}

                <View className="p-5">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center flex-1">
                      <View
                        className={cn(
                          "rounded-2xl p-3 mr-4",
                          hasPromotion || pkg.isBestValue ? "bg-primary/30" : "bg-primary/10",
                        )}
                      >
                        <IconComponent
                          className={cn(
                            "h-8 w-8",
                            hasPromotion || pkg.isBestValue ? "text-primary" : "text-primary",
                          )}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className={cn("text-xl font-bold mb-1", "text-foreground")}>
                          {pkg.name}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          ${pkg.pricePerCoin.toFixed(3)} per coin
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Coins Display */}
                  <View className="flex-row items-end justify-between mb-3">
                    <View>
                      <View className="flex-row items-center mb-1">
                        <Coins className="h-5 w-5 mr-1 text-primary" />
                        <Text className="text-3xl font-bold text-foreground">
                          {hasPromotion
                            ? finalPrice.totalCoins.toLocaleString()
                            : pkg.totalCoins.toLocaleString()}
                        </Text>
                        <Text className="text-lg ml-2 text-muted-foreground">coins</Text>
                      </View>
                      {hasPromotion && finalPrice.bonusCoins > 0 ? (
                        <View className="flex-row items-center">
                          <Sparkles className="h-4 w-4 mr-1 text-primary" />
                          <Text className="text-sm font-semibold text-primary">
                            +{finalPrice.bonusCoins} promo bonus!
                          </Text>
                        </View>
                      ) : (
                        pkg.bonusCoins > 0 && (
                          <View className="flex-row items-center">
                            <Sparkles className="h-4 w-4 mr-1 text-primary" />
                            <Text className="text-sm font-semibold text-primary">
                              +{pkg.bonusCoins} bonus coins!
                            </Text>
                          </View>
                        )
                      )}
                    </View>

                    {/* Price Button */}
                    <View>
                      {hasPromotion && (
                        <Text className="text-sm text-muted-foreground line-through text-right mb-1">
                          ${pkg.price.toFixed(2)}
                        </Text>
                      )}
                      <View className="bg-primary px-6 py-3 rounded-2xl">
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text className="text-2xl font-bold text-primary-foreground">
                            $
                            {hasPromotion
                              ? (finalPrice.discountedAmountCents / 100).toFixed(2)
                              : pkg.price.toFixed(2)}
                          </Text>
                        )}
                      </View>
                      {hasPromotion && (
                        <Text className="text-xs text-primary text-right mt-1 font-semibold">
                          Save $
                          {(
                            (finalPrice.originalAmountCents - finalPrice.discountedAmountCents) /
                            100
                          ).toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Purchase Hint */}
                  <Text className="text-xs text-center mt-2 text-muted-foreground">
                    {hasPromotion
                      ? `🎉 ${appliedPromotion?.title} applied!`
                      : isLarge
                        ? "🔥 Best for power users"
                        : "Perfect for getting started"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Footer */}
        <View className="px-6 pb-8">
          <View className="bg-muted rounded-2xl p-4">
            <Text className="text-sm text-foreground text-center mb-2 font-semibold">
              ℹ️ What can you do with coins?
            </Text>
            <View className="space-y-1">
              <Text className="text-xs text-muted-foreground text-center">
                💬 Send a message • 10 coins
              </Text>
              <Text className="text-xs text-muted-foreground text-center">
                📹 Video call (per minute) • 50 coins
              </Text>
              <Text className="text-xs text-muted-foreground text-center">
                🌹 Send a rose gift • 100 coins
              </Text>
              <Text className="text-xs text-muted-foreground text-center">
                💎 Send a diamond gift • 500 coins
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
