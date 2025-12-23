import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Camera, User } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { profileService } from "~/lib/profile";
import Animated, { FadeInUp } from "react-native-reanimated";

const LOOKING_FOR_OPTIONS = [
  { value: "friendship", label: "Friendship", icon: "👥" },
  { value: "dating", label: "Dating", icon: "💕" },
  { value: "relationship", label: "Relationship", icon: "❤️" },
  { value: "anything", label: "Open to Anything", icon: "✨" },
] as const;

export default function OnboardingProfileSetupScreen() {
  const { user } = useAuth();
  const [bio, setBio] = React.useState("");
  const [age, setAge] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [lookingFor, setLookingFor] = React.useState<
    "friendship" | "dating" | "relationship" | "anything"
  >("dating");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleComplete = async () => {
    // Validate inputs
    if (!bio.trim()) {
      Alert.alert("Bio Required", "Please add a bio to tell others about yourself");
      return;
    }

    if (!age || parseInt(age) < 18 || parseInt(age) > 100) {
      Alert.alert("Valid Age Required", "Please enter your age (18-100)");
      return;
    }

    if (!location.trim()) {
      Alert.alert("Location Required", "Please add your location");
      return;
    }

    if (!user?.id) return;

    try {
      setIsSaving(true);
      await profileService.updateProfile(user.id, {
        bio: bio.trim(),
        age: parseInt(age),
        location: location.trim(),
        looking_for: lookingFor,
      });

      // Navigate to main app
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip}>
            <Text className="text-sm text-muted-foreground">Skip</Text>
          </TouchableOpacity>
        </View>
        <View className="mt-2">
          <Text className="text-2xl font-bold text-foreground mb-2">Complete Your Profile</Text>
          <Text className="text-sm text-muted-foreground">Tell others a bit about yourself</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {/* Profile Photo Placeholder */}
          <Animated.View entering={FadeInUp.delay(100)} className="items-center mb-6">
            <View className="w-32 h-32 bg-muted rounded-full items-center justify-center border-4 border-primary/20 mb-3">
              <User className="h-16 w-16 text-muted-foreground" />
            </View>
            <TouchableOpacity className="flex-row items-center bg-primary rounded-full px-4 py-2">
              <Camera className="h-4 w-4 text-primary-foreground mr-2" />
              <Text className="text-sm font-semibold text-primary-foreground">Add Photo Later</Text>
            </TouchableOpacity>
            <Text className="text-xs text-muted-foreground mt-2">
              You can add a photo from your profile
            </Text>
          </Animated.View>

          {/* Bio */}
          <Animated.View entering={FadeInUp.delay(200)} className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">About You *</Text>
            <View className="bg-card border border-border rounded-2xl p-4">
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Write a short bio about yourself..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                className="text-base text-foreground min-h-[100px]"
              />
              <Text className="text-xs text-muted-foreground text-right mt-2">
                {bio.length}/500
              </Text>
            </View>
          </Animated.View>

          {/* Age */}
          <Animated.View entering={FadeInUp.delay(300)} className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Age *</Text>
            <View className="bg-card border border-border rounded-2xl p-4">
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Enter your age"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
                className="text-base text-foreground"
              />
            </View>
          </Animated.View>

          {/* Location */}
          <Animated.View entering={FadeInUp.delay(400)} className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Location *</Text>
            <View className="bg-card border border-border rounded-2xl p-4">
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. New York, NY"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                className="text-base text-foreground"
              />
            </View>
          </Animated.View>

          {/* Looking For */}
          <Animated.View entering={FadeInUp.delay(500)} className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">I'm Looking For</Text>
            <View className="flex-row flex-wrap gap-3">
              {LOOKING_FOR_OPTIONS.map((option) => {
                const isSelected = lookingFor === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setLookingFor(option.value)}
                    className={`flex-row items-center rounded-2xl px-4 py-3 border ${
                      isSelected ? "bg-primary border-primary" : "bg-card border-border"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className="text-2xl mr-2">{option.icon}</Text>
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Info Card */}
          <Animated.View
            entering={FadeInUp.delay(600)}
            className="bg-primary/10 rounded-2xl p-4 border border-primary/20"
          >
            <Text className="text-sm text-primary text-center">
              💡 Don't worry, you can always edit your profile later from the Profile tab
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View className="px-6 py-4 border-t border-border">
        <TouchableOpacity
          onPress={handleComplete}
          disabled={isSaving}
          className="rounded-2xl py-4 items-center bg-primary"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-lg font-bold text-primary-foreground">Complete Profile</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} className="mt-3 py-2 items-center">
          <Text className="text-sm text-muted-foreground">I'll do this later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
