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
import { Stack, router } from "expo-router";
import { Coffee } from "~/lib/icons";
import { cn } from "~/lib/utils";
import type { UserGender } from "~/types";
import { authService } from "~/lib/auth";

export default function SignupScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [gender, setGender] = React.useState<UserGender | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !gender) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Starting signup...");
      // Use authService directly to get user data
      const { user } = await authService.signUp(email.trim().toLowerCase(), password, gender);

      console.log("Signup successful, user:", user);

      if (!user) {
        throw new Error("Failed to create user account");
      }

      // Redirect to profile setup with user ID
      // Note: User can set up profile before confirming email
      router.replace({
        pathname: "/(auth)/setup-profile",
        params: { userId: user.id, userEmail: user.email },
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert("Sign Up Failed", error.message || "Could not create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Sign Up",
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: "#FFFFFF",
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-8 pt-6 pb-8">
          {/* Logo */}
          <View className="items-center mb-8">
            <View className="bg-primary/20 rounded-3xl p-4 mb-4">
              <Coffee className="h-12 w-12 text-primary" strokeWidth={2.5} />
            </View>
            <Text className="text-3xl font-bold text-foreground">Join MochaLove</Text>
            <Text className="text-sm text-muted-foreground mt-2 text-center">
              Create an account to start meeting people
            </Text>
          </View>

          {/* Gender Selection */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-foreground mb-3">I am a</Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setGender("man")}
                activeOpacity={0.7}
                className={cn(
                  "flex-1 py-3 rounded-xl border-2",
                  gender === "man" ? "bg-primary/20 border-primary" : "bg-input border-border",
                )}
              >
                <Text
                  className={cn(
                    "text-center font-semibold",
                    gender === "man" ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  Man
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setGender("woman")}
                activeOpacity={0.7}
                className={cn(
                  "flex-1 py-3 rounded-xl border-2",
                  gender === "woman" ? "bg-primary/20 border-primary" : "bg-input border-border",
                )}
              >
                <Text
                  className={cn(
                    "text-center font-semibold",
                    gender === "woman" ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  Woman
                </Text>
              </TouchableOpacity>
            </View>
            {gender && (
              <Text className="text-xs text-muted-foreground mt-2">
                {gender === "man"
                  ? "💰 You'll use coins to send messages and gifts"
                  : "💵 You'll earn money when you receive messages and gifts"}
              </Text>
            )}
          </View>

          {/* Form */}
          <View className="mb-8">
            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base"
              />
            </View>

            <View className="mb-0">
              <Text className="text-sm font-medium text-foreground mb-2">Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base"
              />
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.8}
            className="w-full bg-primary rounded-2xl py-4 mb-4"
          >
            {isLoading ? (
              <ActivityIndicator color="#0d2818" />
            ) : (
              <Text className="text-center text-lg font-semibold text-primary-foreground">
                Sign Up
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text className="text-xs text-center text-muted-foreground mb-6 px-4">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </Text>

          {/* Login Link */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.7}
            className="self-center"
          >
            <Text className="text-sm text-muted-foreground">
              Already have an account? <Text className="text-primary font-semibold">Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
