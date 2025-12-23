import * as React from "react";
import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Mail, Copy } from "~/lib/icons";
import * as Clipboard from "expo-clipboard";

const SUPPORT_EMAIL = "mochamochafrogs@gmail.com";

export default function ContactSupportScreen() {
  const handleCopyEmail = async () => {
    try {
      await Clipboard.setStringAsync(SUPPORT_EMAIL);
      if (Platform.OS === "web") {
        window.alert("Copied! Email address copied to clipboard");
      } else {
        Alert.alert("Copied!", "Email address copied to clipboard");
      }
    } catch (error) {
      console.error("Failed to copy email:", error);
      const errorMsg = "Failed to copy email address";
      if (Platform.OS === "web") {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert("Error", errorMsg);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity
          onPress={() => {
            console.log("🔙 [NAV] Contact Support back button pressed, navigating to help");
            router.push("/profile/help");
          }}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Contact Support</Text>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 py-8">
        {/* Icon */}
        <View className="items-center mb-8">
          <View className="bg-primary/20 rounded-full p-6 mb-4">
            <Mail className="h-16 w-16 text-primary" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">Get in Touch</Text>
          <Text className="text-base text-muted-foreground text-center">
            We're here to help! Send us an email and we'll get back to you as soon as possible.
          </Text>
        </View>

        {/* Email Display */}
        <View className="bg-card rounded-2xl p-6 border border-border mb-6">
          <Text className="text-sm text-muted-foreground mb-4 text-center">Contact us at:</Text>
          <View className="flex-row items-center justify-center mb-6">
            <Text className="text-lg font-bold text-primary">{SUPPORT_EMAIL}</Text>
          </View>

          {/* Copy Button */}
          <TouchableOpacity
            onPress={handleCopyEmail}
            className="bg-primary rounded-2xl py-4 items-center"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Copy className="h-5 w-5 text-primary-foreground mr-2" />
              <Text className="text-lg font-bold text-primary-foreground">Copy Email Address</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View className="bg-muted rounded-2xl p-4">
          <Text className="text-sm font-semibold text-foreground mb-2">
            💡 Tips for Contacting Support
          </Text>
          <Text className="text-sm text-muted-foreground leading-5 mb-2">
            • Include as much detail as possible about your issue
          </Text>
          <Text className="text-sm text-muted-foreground leading-5 mb-2">
            • Mention your account email address
          </Text>
          <Text className="text-sm text-muted-foreground leading-5 mb-2">
            • Include screenshots if applicable
          </Text>
          <Text className="text-sm text-muted-foreground leading-5">
            • We typically respond within 24-48 hours
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
