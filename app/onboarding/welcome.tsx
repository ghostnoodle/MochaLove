import * as React from "react";
import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Heart, MessageCircle, Gift, Sparkles } from "~/lib/icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-6 justify-between py-12">
        {/* Logo and Title */}
        <Animated.View entering={FadeInUp.delay(200)} className="items-center mt-8">
          <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-6">
            <Text className="text-5xl">☕</Text>
          </View>
          <Text className="text-4xl font-bold text-foreground mb-2">Welcome to</Text>
          <Text className="text-4xl font-bold text-primary mb-4">MochaLove</Text>
          <Text className="text-base text-muted-foreground text-center">
            Where meaningful connections begin over coffee
          </Text>
        </Animated.View>

        {/* Features */}
        <View className="gap-4">
          <Animated.View
            entering={FadeInDown.delay(400)}
            className="flex-row items-center bg-card rounded-2xl p-4 border border-border"
          >
            <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center mr-4">
              <Heart className="h-6 w-6 text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground mb-1">Find Your Match</Text>
              <Text className="text-sm text-muted-foreground">
                Swipe and connect with people who share your interests
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(600)}
            className="flex-row items-center bg-card rounded-2xl p-4 border border-border"
          >
            <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center mr-4">
              <MessageCircle className="h-6 w-6 text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground mb-1">Chat & Connect</Text>
              <Text className="text-sm text-muted-foreground">
                Send messages and get to know each other better
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(800)}
            className="flex-row items-center bg-card rounded-2xl p-4 border border-border"
          >
            <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center mr-4">
              <Gift className="h-6 w-6 text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground mb-1">Send Gifts</Text>
              <Text className="text-sm text-muted-foreground">
                Show appreciation with virtual gifts
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(1000)}
            className="flex-row items-center bg-card rounded-2xl p-4 border border-border"
          >
            <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center mr-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground mb-1">Earn & Enjoy</Text>
              <Text className="text-sm text-muted-foreground">
                Women earn real money from conversations
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(1200)} className="gap-3">
          <TouchableOpacity
            onPress={() => router.push("/onboarding/interests")}
            className="bg-primary rounded-2xl py-4 items-center"
          >
            <Text className="text-lg font-bold text-primary-foreground">Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/(tabs)")} className="py-3 items-center">
            <Text className="text-sm text-muted-foreground">Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
