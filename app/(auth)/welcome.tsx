import * as React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Coffee } from "~/lib/icons";

export default function WelcomeScreen() {
  const handleLogin = () => {
    // TODO: Implement login navigation
    router.push("/(auth)/login");
  };

  const handleSignUp = () => {
    // TODO: Implement sign up navigation
    router.push("/(auth)/signup");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-8 justify-center items-center">
        {/* Logo */}
        <View className="items-center mb-12">
          <View className="bg-primary/20 rounded-3xl p-6 mb-6">
            <Coffee className="h-16 w-16 text-primary" strokeWidth={2.5} />
          </View>

          <Text className="text-5xl font-bold text-foreground mb-2">MochaLove</Text>
          <Text className="text-lg text-muted-foreground">MochaFrogs</Text>
        </View>

        {/* Tagline */}
        <View className="mb-16">
          <Text className="text-center text-base text-foreground/80 leading-6 px-4">
            Where conversations brew and
          </Text>
          <Text className="text-center text-base text-foreground/80 leading-6 px-4">
            connections percolate. Meet new people,
          </Text>
          <Text className="text-center text-base text-foreground/80 leading-6 px-4">
            chat, video call, and send gifts.
          </Text>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          activeOpacity={0.8}
          className="w-full bg-primary rounded-2xl py-4 mb-4"
        >
          <Text className="text-center text-lg font-semibold text-primary-foreground">Log In</Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <TouchableOpacity onPress={handleSignUp} activeOpacity={0.7}>
          <Text className="text-sm text-muted-foreground">
            I don't have an account, <Text className="text-primary font-semibold">sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
