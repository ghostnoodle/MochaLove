import { Redirect } from "expo-router";
import { useAuth } from "~/hooks/useAuth";
import { View, ActivityIndicator } from "react-native";
import * as React from "react";

export default function Index() {
  const { isAuthenticated, isLoading, profile } = useAuth();

  // Log auth state changes
  React.useEffect(() => {
    console.log("🟣 [INDEX] Auth state changed:");
    console.log("🟣 [INDEX] - isLoading:", isLoading);
    console.log("🟣 [INDEX] - isAuthenticated:", isAuthenticated);
    console.log("🟣 [INDEX] - profile:", profile?.name || "null");
    console.log("🟣 [INDEX] - profile_completed:", profile?.profile_completed);
  }, [isAuthenticated, isLoading, profile]);

  // Show loading while checking authentication
  if (isLoading) {
    console.log("🟣 [INDEX] Showing loading screen");
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#7ed321" />
      </View>
    );
  }

  // Not authenticated - go to welcome
  if (!isAuthenticated) {
    console.log("🟣 [INDEX] Not authenticated, redirecting to welcome");
    return <Redirect href="/(auth)/welcome" />;
  }

  // Authenticated but profile not completed - go to profile setup
  if (!profile?.profile_completed) {
    console.log("🟣 [INDEX] Profile not completed, redirecting to setup-profile");
    return <Redirect href="/(auth)/setup-profile" />;
  }

  // Authenticated and profile completed - go to main app
  console.log("🟣 [INDEX] Authenticated and profile completed, redirecting to tabs");
  return <Redirect href="/(tabs)" />;
}
