import * as React from "react";
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Coffee } from "~/lib/icons";
import { authService, userService } from "~/lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async () => {
    console.log("=== Login Button Clicked ===");
    console.log("Email:", email);
    console.log("Password length:", password.length);

    if (!email || !password) {
      console.log("ERROR: Missing email or password");
      if (typeof window !== "undefined") {
        window.alert("❌ Please fill in all fields");
      }
      return;
    }

    setIsLoading(true);
    console.log("→ Starting login process...");

    try {
      // Sign in the user using authService directly to get user data
      console.log("→ Calling authService.signIn...");
      const result = await authService.signIn(email.trim().toLowerCase(), password);
      console.log("→ SignIn result:", result);
      console.log("→ Result type:", typeof result);
      console.log("→ Result keys:", result ? Object.keys(result) : "null");

      if (!result) {
        throw new Error("Sign in returned no data");
      }

      const { user } = result;
      console.log("✓ Sign in successful, user:", user);
      console.log("✓ User ID:", user?.id);

      if (!user) {
        throw new Error("Failed to get user data");
      }

      // Fetch user profile to check completion status
      console.log("→ Fetching user profile...");
      const profile = await userService.getProfile(user.id);
      console.log("✓ Profile fetched:", profile);

      // Route based on profile completion
      if (profile?.profile_completed) {
        console.log("→ Profile completed, navigating to profile screen");
        router.replace("/(tabs)/profile");
      } else {
        console.log("→ Profile not completed, navigating to setup screen");
        router.replace({
          pathname: "/(auth)/setup-profile",
          params: { userId: user.id, userEmail: user.email },
        });
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      console.error("❌ Error message:", error?.message);
      console.error("❌ Error code:", error?.code);

      if (typeof window !== "undefined") {
        window.alert(`❌ Login Failed: ${error.message || "Invalid email or password"}`);
      }
    } finally {
      console.log("→ Login process finished");
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Log In",
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: "#FFFFFF",
        }}
      />

      <View className="flex-1 justify-center">
        <View className="px-8">
          {/* Logo */}
          <View className="items-center mb-12">
            <View className="bg-primary/20 rounded-3xl p-4 mb-4">
              <Coffee className="h-12 w-12 text-primary" strokeWidth={2.5} />
            </View>
            <Text className="text-3xl font-bold text-foreground">Welcome Back</Text>
            <Text className="text-sm text-muted-foreground mt-2">
              Log in to continue your journey
            </Text>
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

            <View className="mb-0">
              <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base"
              />
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
            className="w-full bg-primary rounded-2xl py-4 mb-4"
          >
            {isLoading ? (
              <ActivityIndicator color="#0d2818" />
            ) : (
              <Text className="text-center text-lg font-semibold text-primary-foreground">
                Log In
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity className="self-center mb-6" activeOpacity={0.7}>
            <Text className="text-sm text-muted-foreground">Forgot your password?</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.7}
            className="self-center"
          >
            <Text className="text-sm text-muted-foreground">
              Don't have an account? <Text className="text-primary font-semibold">Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
