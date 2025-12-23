import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, AlertCircle } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";
import { cn } from "~/lib/utils";

const ISSUE_CATEGORIES = [
  { id: "bug", label: "Bug or Error", icon: "🐛" },
  { id: "account", label: "Account Issue", icon: "👤" },
  { id: "payment", label: "Payment Problem", icon: "💳" },
  { id: "feature", label: "Feature Request", icon: "✨" },
  { id: "inappropriate", label: "Inappropriate Content", icon: "🚫" },
  { id: "other", label: "Other", icon: "📝" },
];

export default function ReportIssueScreen() {
  const { user, profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      if (Platform.OS === "web") {
        window.alert("Category Required: Please select an issue category");
      } else {
        Alert.alert("Category Required", "Please select an issue category");
      }
      return;
    }

    if (!message.trim()) {
      if (Platform.OS === "web") {
        window.alert("Message Required: Please describe the issue");
      } else {
        Alert.alert("Message Required", "Please describe the issue");
      }
      return;
    }

    if (!user?.id) {
      if (Platform.OS === "web") {
        window.alert("Error: You must be logged in to report an issue");
      } else {
        Alert.alert("Error", "You must be logged in to report an issue");
      }
      return;
    }

    console.log("🚨 [REPORT] Submitting issue report...", {
      userId: user.id,
      category: selectedCategory,
      messageLength: message.length,
    });

    setIsSubmitting(true);

    try {
      console.log("📝 [REPORT] Preparing to insert report with data:", {
        reporter_id: user.id,
        reported_id: null,
        reason: selectedCategory,
        description: message.trim().substring(0, 50) + "...",
        status: "pending",
      });

      // Insert into reports table (admin will see this in admin dashboard)
      const { data, error } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          reported_id: null, // No specific user being reported (general issue)
          reason: selectedCategory,
          description: message.trim(),
          status: "pending",
        })
        .select();

      console.log("📊 [REPORT] Insert response:", { data, error });

      if (error) {
        console.error("❌ [REPORT] Error submitting report:", error);
        throw error;
      }

      console.log("✅ [REPORT] Issue report submitted successfully", data);

      if (Platform.OS === "web") {
        window.alert(
          "Report Submitted! ✅\n\nThank you for your feedback. Our team will review your report and take appropriate action.",
        );
        router.push("/profile/help");
      } else {
        Alert.alert(
          "Report Submitted! ✅",
          "Thank you for your feedback. Our team will review your report and take appropriate action.",
          [
            {
              text: "OK",
              onPress: () => router.push("/profile/help"),
            },
          ],
        );
      }
    } catch (error) {
      console.error("❌ [REPORT] Failed to submit report:", error);
      const errorMsg = "Failed to submit report. Please try again later.";
      if (Platform.OS === "web") {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity
          onPress={() => router.push("/profile/help")}
          className="mr-4"
          disabled={isSubmitting}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Report an Issue</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {/* Icon */}
          <View className="items-center mb-6">
            <View className="bg-destructive/20 rounded-full p-4 mb-3">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </View>
            <Text className="text-lg font-semibold text-foreground text-center">
              Help us improve your experience
            </Text>
            <Text className="text-sm text-muted-foreground text-center mt-2">
              Report any issues you're experiencing and our team will investigate
            </Text>
          </View>

          {/* Category Selection */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-foreground mb-3">
              What kind of issue are you experiencing?
            </Text>
            <View className="gap-2">
              {ISSUE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  disabled={isSubmitting}
                  className={cn(
                    "rounded-2xl p-4 border-2 flex-row items-center",
                    selectedCategory === category.id
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border",
                  )}
                  activeOpacity={0.7}
                >
                  <Text className="text-2xl mr-3">{category.icon}</Text>
                  <Text
                    className={cn(
                      "text-base font-medium",
                      selectedCategory === category.id ? "text-primary" : "text-foreground",
                    )}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Message Input */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-foreground mb-3">
              Describe the issue in detail
            </Text>
            <View className="bg-card rounded-2xl border border-border p-4">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Please describe what happened, what you expected, and any steps to reproduce the issue..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
                className="text-base text-foreground min-h-[150px]"
                editable={!isSubmitting}
              />
              <Text className="text-xs text-muted-foreground text-right mt-2">
                {message.length}/1000
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !selectedCategory || !message.trim()}
            className={cn(
              "rounded-2xl py-4 items-center",
              isSubmitting || !selectedCategory || !message.trim() ? "bg-primary/50" : "bg-primary",
            )}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-lg font-bold text-primary-foreground ml-2">
                  Submitting...
                </Text>
              </View>
            ) : (
              <Text className="text-lg font-bold text-primary-foreground">Submit Report</Text>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View className="mt-6 bg-muted rounded-2xl p-4">
            <Text className="text-sm text-muted-foreground leading-5">
              ℹ️ Your report will be sent to our moderation team. We review all reports within 24
              hours and take appropriate action. Thank you for helping us maintain a safe and
              positive community.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
