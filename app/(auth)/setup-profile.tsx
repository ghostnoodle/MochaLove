import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { userService } from "~/lib/auth";

export default function SetupProfileScreen() {
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const userEmail = params.userEmail as string;

  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleComplete = async () => {
    console.log("=== Complete Profile Button Clicked ===");
    console.log("Name value:", name);
    console.log("User ID from params:", userId);
    console.log("User email from params:", userEmail);

    if (!name.trim()) {
      console.log("ERROR: Name is empty");
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (!userId) {
      console.log("ERROR: User ID not found in params");
      Alert.alert("Error", "User information missing. Please try signing up again.");
      return;
    }

    console.log("✓ Validation passed, updating profile for user:", userId);
    setIsLoading(true);

    try {
      // Setup user profile (uses RPC to bypass RLS for initial setup)
      console.log("→ Setting up profile via RPC...");
      console.log("→ Profile data:", {
        name: name.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
      });

      const result = await userService
        .setupProfile(userId, name.trim(), bio.trim() || null, location.trim() || null)
        .catch((err) => {
          console.error("→ Caught error in setupProfile:", err);
          throw err;
        });

      console.log("✓ Profile setup successful:", result);

      // Navigate to login screen with success message
      // Note: Alert.alert doesn't work on web, so we navigate directly
      console.log("→ Navigating to login screen...");

      // Show browser alert for web compatibility
      if (typeof window !== "undefined") {
        window.alert(
          "✅ Profile created successfully!\n\n📧 Please check your email and click the verification link.\n\nOnce verified, you can log in!",
        );
      }

      router.replace("/(auth)/login");
    } catch (error: any) {
      console.error("❌ Profile update error:", error);
      console.error("❌ Error message:", error?.message);
      console.error("❌ Error code:", error?.code);
      console.error("❌ Error hint:", error?.hint);
      console.error("❌ Error details:", error?.details);

      // Check if profile is already completed
      if (error.message?.includes("Profile already completed")) {
        if (typeof window !== "undefined") {
          window.alert(
            "✅ Your profile is already set up!\n\nPlease verify your email and log in.",
          );
        }
        router.replace("/(auth)/login");
        return;
      }

      // Show error for other issues
      if (typeof window !== "undefined") {
        window.alert(
          `❌ Failed to update profile: ${error.message || "Unknown error"}\n\nPlease check the console for details.`,
        );
      }
    } finally {
      console.log("→ Finally block - setting loading to false");
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Complete Your Profile",
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: "#FFFFFF",
          headerLeft: () => null, // Prevent going back
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-8 pt-6 pb-8">
          {/* Header */}
          <View className="items-center mb-6">
            <Text className="text-3xl font-bold text-foreground mb-2">Welcome to MochaLove!</Text>
            <Text className="text-base text-muted-foreground text-center">
              Let's set up your profile so others can get to know you
            </Text>
          </View>

          {/* Email Verification Notice */}
          <View className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
            <Text className="text-sm text-primary font-medium mb-1">📧 Verify Your Email</Text>
            <Text className="text-xs text-muted-foreground">
              We've sent a verification email to {userEmail}. You can set up your profile now and
              verify later before making purchases.
            </Text>
          </View>

          {/* Form */}
          <View className="mb-8">
            {/* Name (Required) */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">Your Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                autoCapitalize="words"
                autoCorrect={false}
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base"
              />
            </View>

            {/* Bio (Optional) */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">About You (Optional)</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a bit about yourself..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base min-h-[100px]"
              />
            </View>

            {/* Location (Optional) */}
            <View className="mb-0">
              <Text className="text-sm font-medium text-foreground mb-2">Location (Optional)</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. New York, NY"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                autoCapitalize="words"
                autoCorrect={false}
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base"
              />
            </View>
          </View>

          {/* Complete Button */}
          <TouchableOpacity
            onPress={handleComplete}
            disabled={isLoading}
            activeOpacity={0.8}
            className="w-full bg-primary rounded-2xl py-4 mb-4"
          >
            {isLoading ? (
              <ActivityIndicator color="#0d2818" />
            ) : (
              <Text className="text-center text-lg font-semibold text-primary-foreground">
                Complete Profile
              </Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-center text-muted-foreground">
            You can always update your profile later in settings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
