import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft } from "~/lib/icons";

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Terms of Service</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        <Text className="text-sm text-muted-foreground mb-4">
          Last Updated: {new Date().toLocaleDateString()}
        </Text>

        <Section title="Agreement to Terms">
          <Text className="text-foreground leading-6">
            By accessing or using MochaLove, you agree to be bound by these Terms of Service. If you
            do not agree to these terms, please do not use our services.
          </Text>
        </Section>

        <Section title="Eligibility">
          <Text className="text-foreground leading-6">
            You must be at least 18 years old to use MochaLove. By using our services, you represent
            and warrant that you meet this age requirement and have the legal capacity to enter into
            these Terms.
          </Text>
        </Section>

        <Section title="Account Registration">
          <Text className="text-foreground leading-6 mb-3">To use MochaLove, you must:</Text>
          <BulletPoint text="Provide accurate and complete information" />
          <BulletPoint text="Maintain the security of your account credentials" />
          <BulletPoint text="Notify us immediately of any unauthorized access" />
          <BulletPoint text="Be responsible for all activities under your account" />
        </Section>

        <Section title="User Conduct">
          <Text className="text-foreground leading-6 mb-3">You agree NOT to:</Text>
          <BulletPoint text="Harass, abuse, or harm other users" />
          <BulletPoint text="Post false, misleading, or fraudulent content" />
          <BulletPoint text="Use the service for any illegal purpose" />
          <BulletPoint text="Impersonate another person or entity" />
          <BulletPoint text="Share sexually explicit content without consent" />
          <BulletPoint text="Spam or solicit money from other users" />
          <BulletPoint text="Attempt to hack or compromise platform security" />
        </Section>

        <Section title="Coin System & Payments">
          <Text className="text-foreground leading-6 mb-3">For Male Users:</Text>
          <BulletPoint text="Coins are virtual currency used to unlock features" />
          <BulletPoint text="All coin purchases are final and non-refundable" />
          <BulletPoint text="Coins have no cash value and cannot be exchanged for money" />
          <BulletPoint text="Unused coins do not expire but may be lost if account is deleted" />

          <Text className="text-foreground leading-6 mt-4 mb-3">For Female Users:</Text>
          <BulletPoint text="You can earn money through interactions on the platform" />
          <BulletPoint text="Minimum cash-out threshold is $50" />
          <BulletPoint text="Payments are processed within 3-5 business days" />
          <BulletPoint text="You are responsible for any applicable taxes on earnings" />
        </Section>

        <Section title="Content Ownership">
          <Text className="text-foreground leading-6">
            You retain ownership of content you post, but grant MochaLove a worldwide,
            non-exclusive, royalty-free license to use, display, and distribute your content in
            connection with our services.
          </Text>
        </Section>

        <Section title="Content Moderation">
          <Text className="text-foreground leading-6">
            We reserve the right to remove any content or suspend/terminate accounts that violate
            these Terms. This includes content that is offensive, illegal, or harmful to other
            users.
          </Text>
        </Section>

        <Section title="Disclaimers">
          <Text className="text-foreground leading-6 mb-3">
            MochaLove is provided "AS IS" without warranties of any kind. We do not:
          </Text>
          <BulletPoint text="Guarantee specific results or matches" />
          <BulletPoint text="Conduct criminal background checks on users" />
          <BulletPoint text="Verify the accuracy of user-provided information" />
          <BulletPoint text="Guarantee uninterrupted or error-free service" />
        </Section>

        <Section title="Limitation of Liability">
          <Text className="text-foreground leading-6">
            To the maximum extent permitted by law, MochaLove shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the
            service.
          </Text>
        </Section>

        <Section title="Account Termination">
          <Text className="text-foreground leading-6">
            You may delete your account at any time through the app settings. We reserve the right
            to suspend or terminate accounts that violate these Terms without notice or refund.
          </Text>
        </Section>

        <Section title="Changes to Terms">
          <Text className="text-foreground leading-6">
            We may modify these Terms at any time. Continued use of the service after changes
            constitutes acceptance of the new Terms.
          </Text>
        </Section>

        <Section title="Governing Law">
          <Text className="text-foreground leading-6">
            These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be
            resolved in the courts of [Your Jurisdiction].
          </Text>
        </Section>

        <Section title="Contact Information">
          <Text className="text-foreground leading-6">
            For questions about these Terms, please contact:
          </Text>
          <Text className="text-primary mt-2">legal@mochalove.com</Text>
        </Section>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-xl font-bold text-foreground mb-3">{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View className="flex-row mb-2">
      <Text className="text-primary mr-2">•</Text>
      <Text className="text-foreground flex-1 leading-6">{text}</Text>
    </View>
  );
}
