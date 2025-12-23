import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import {
  ChevronLeft,
  HelpCircle,
  MessageCircle,
  Mail,
  FileText,
  Shield,
  AlertCircle,
  ChevronRight,
} from "~/lib/icons";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I earn coins?",
    answer:
      "Men can purchase coins through the Shop tab or earn them through daily check-in bonuses. Coins are used to unlock features like messaging and video calls.",
  },
  {
    question: "How do I cash out my earnings?",
    answer:
      "Women can cash out their earnings by going to Profile > Cash Out. The minimum cashout is $50. Funds are typically transferred within 3-5 business days.",
  },
  {
    question: "How does matching work?",
    answer:
      "Swipe right to like, left to pass. When both users like each other, it's a match! You can then start messaging if you have enough coins (for men).",
  },
  {
    question: "What happens if I run out of coins?",
    answer:
      "You can purchase more coins anytime through the Shop tab. We offer various coin packages to suit your needs.",
  },
  {
    question: "Is my information secure?",
    answer:
      "Yes! We use industry-standard encryption and security measures to protect your data. We never share your personal information with third parties without your consent.",
  },
  {
    question: "How do I report inappropriate behavior?",
    answer:
      "You can report users directly from their profile or in conversations. Our team reviews all reports within 24 hours and takes appropriate action.",
  },
];

export default function HelpScreen() {
  const [expandedFAQ, setExpandedFAQ] = React.useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleContactSupport = () => {
    router.push("/profile/contact-support");
  };

  const handleReportIssue = () => {
    router.push("/profile/report-issue");
  };

  const handleSendFeedback = () => {
    router.push("/profile/contact-support");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/profile")}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Help & Support</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-bold text-foreground mb-4">Quick Actions</Text>

          <TouchableOpacity
            onPress={handleContactSupport}
            className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-primary/20 rounded-full p-3 mr-4">
                <MessageCircle className="h-6 w-6 text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Contact Support</Text>
                <Text className="text-sm text-muted-foreground mt-1">Get help from our team</Text>
              </View>
            </View>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReportIssue}
            className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-destructive/20 rounded-full p-3 mr-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Report an Issue</Text>
                <Text className="text-sm text-muted-foreground mt-1">Tell us what went wrong</Text>
              </View>
            </View>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendFeedback}
            className="bg-card rounded-2xl p-4 border border-border flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-blue-500/20 rounded-full p-3 mr-4">
                <Mail className="h-6 w-6 text-blue-500" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Send Feedback</Text>
                <Text className="text-sm text-muted-foreground mt-1">Help us improve the app</Text>
              </View>
            </View>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View className="px-6 py-4">
          <View className="flex-row items-center mb-4">
            <HelpCircle className="h-5 w-5 text-primary mr-2" />
            <Text className="text-lg font-bold text-foreground">Frequently Asked Questions</Text>
          </View>

          <View className="bg-card rounded-2xl border border-border overflow-hidden">
            {faqs.map((faq, index) => (
              <View key={index}>
                <TouchableOpacity
                  onPress={() => toggleFAQ(index)}
                  className={`p-4 ${
                    index < faqs.length - 1 || expandedFAQ === index ? "border-b border-border" : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-medium text-foreground flex-1 pr-4">
                      {faq.question}
                    </Text>
                    <ChevronRight
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedFAQ === index ? "rotate-90" : ""
                      }`}
                    />
                  </View>
                </TouchableOpacity>
                {expandedFAQ === index && (
                  <View className="px-4 pb-4 border-b border-border">
                    <Text className="text-sm text-muted-foreground leading-6">{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Resources */}
        <View className="px-6 py-4 mb-8">
          <Text className="text-lg font-bold text-foreground mb-4">Resources</Text>

          <TouchableOpacity
            onPress={() => router.push("/legal/terms")}
            className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <FileText className="h-5 w-5 text-muted-foreground mr-3" />
              <Text className="text-base text-foreground">Terms of Service</Text>
            </View>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/legal/privacy")}
            className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Shield className="h-5 w-5 text-muted-foreground mr-3" />
              <Text className="text-base text-foreground">Privacy Policy</Text>
            </View>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert("Feature Coming Soon", "Community Guidelines will be available soon!")
            }
            className="bg-card rounded-2xl p-4 border border-border flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <HelpCircle className="h-5 w-5 text-muted-foreground mr-3" />
              <Text className="text-base text-foreground">Community Guidelines</Text>
            </View>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
