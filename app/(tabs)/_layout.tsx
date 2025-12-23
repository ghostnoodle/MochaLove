import * as React from "react";
import { Tabs, useRouter } from "expo-router";
import { Platform } from "react-native";
import { Heart, MessageCircle, User } from "~/lib/icons";
import { Store as StoreIcon, DollarSign } from "lucide-react-native";
import { iconWithClassName } from "~/lib/icons/iconWithClassName";
import { useAuth } from "~/hooks/useAuth";

// Register icons
iconWithClassName(StoreIcon);
iconWithClassName(DollarSign);

export default function TabsLayout() {
  const { profile } = useAuth();
  const router = useRouter();
  const isMan = profile?.gender === "man";

  // Check for payment success on mount and redirect to shop
  React.useEffect(() => {
    if (Platform.OS !== "web") return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");

    console.log("🔍 [TABS] Checking for payment redirect...");
    console.log("🔍 [TABS] Payment status:", paymentStatus);
    console.log("🔍 [TABS] Current URL:", window.location.href);

    if (paymentStatus === "success" || paymentStatus === "cancelled") {
      console.log("🔄 [TABS] Redirecting to shop tab...");
      router.replace("/(tabs)/shop");
    }
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7ed321", // Lime green from mocha theme
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",
        tabBarStyle: {
          backgroundColor: "#1a3a2e", // Dark green card color
          borderTopColor: "#2a4a3e",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Heart className="text-current" size={size} color={color} fill={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle className="text-current" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          href: isMan ? "/(tabs)/shop" : null, // Hide from women
          tabBarIcon: ({ color, size }) => (
            <StoreIcon className="text-current" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="balance"
        options={{
          title: "Balance",
          href: !isMan ? "/(tabs)/balance" : null, // Hide from men
          tabBarIcon: ({ color, size }) => (
            <DollarSign className="text-current" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User className="text-current" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
