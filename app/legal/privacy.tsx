import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft } from "~/lib/icons";

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Privacy Policy</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        <Text className="text-sm text-muted-foreground mb-4">
          Last Updated: {new Date().toLocaleDateString()}
        </Text>

        <Section title="Introduction">
          <Text className="text-foreground leading-6">
            Welcome to MochaLove. We are committed to protecting your privacy and ensuring the
            security of your personal information. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our mobile application.
          </Text>
        </Section>

        <Section title="Information We Collect">
          <Text className="text-foreground leading-6 mb-3">
            We collect information that you provide directly to us, including:
          </Text>
          <BulletPoint text="Account information (email, name, date of birth, gender)" />
          <BulletPoint text="Profile information (photos, bio, interests, location)" />
          <BulletPoint text="Communication data (messages, interactions with other users)" />
          <BulletPoint text="Payment information (processed securely through our payment providers)" />
          <BulletPoint text="Device information and usage data" />
        </Section>

        <Section title="How We Use Your Information">
          <Text className="text-foreground leading-6 mb-3">We use your information to:</Text>
          <BulletPoint text="Provide, maintain, and improve our services" />
          <BulletPoint text="Create and manage your account" />
          <BulletPoint text="Facilitate connections between users" />
          <BulletPoint text="Process transactions and send notifications" />
          <BulletPoint text="Ensure safety and security on our platform" />
          <BulletPoint text="Comply with legal obligations" />
        </Section>

        <Section title="Information Sharing">
          <Text className="text-foreground leading-6">
            We do not sell your personal information. We may share your information with:
          </Text>
          <BulletPoint text="Other users (profile information visible to matches)" />
          <BulletPoint text="Service providers who assist in our operations" />
          <BulletPoint text="Law enforcement when required by law" />
          <BulletPoint text="In connection with a merger or acquisition" />
        </Section>

        <Section title="Data Security">
          <Text className="text-foreground leading-6">
            We implement appropriate security measures to protect your personal information.
            However, no method of transmission over the internet is 100% secure. While we strive to
            protect your data, we cannot guarantee absolute security.
          </Text>
        </Section>

        <Section title="Your Rights">
          <Text className="text-foreground leading-6 mb-3">You have the right to:</Text>
          <BulletPoint text="Access and update your personal information" />
          <BulletPoint text="Delete your account and associated data" />
          <BulletPoint text="Opt-out of marketing communications" />
          <BulletPoint text="Request a copy of your data" />
        </Section>

        <Section title="Children's Privacy">
          <Text className="text-foreground leading-6">
            Our services are not intended for users under 18 years of age. We do not knowingly
            collect personal information from children. If you believe we have collected information
            from a minor, please contact us immediately.
          </Text>
        </Section>

        <Section title="Changes to This Policy">
          <Text className="text-foreground leading-6">
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the "Last Updated" date.
          </Text>
        </Section>

        <Section title="Contact Us">
          <Text className="text-foreground leading-6">
            If you have any questions about this Privacy Policy, please contact us at:
          </Text>
          <Text className="text-primary mt-2">support@mochalove.com</Text>
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
