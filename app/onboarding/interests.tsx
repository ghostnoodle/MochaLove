import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Check } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { profileService, type InterestCategory } from "~/lib/profile";

export default function OnboardingInterestsScreen() {
  const { user, profile } = useAuth();
  const [interests, setInterests] = React.useState<InterestCategory[]>([]);
  const [selectedInterests, setSelectedInterests] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Load interests
  React.useEffect(() => {
    const loadInterests = async () => {
      try {
        setIsLoading(true);
        const data = await profileService.getInterestCategories();
        setInterests(data);
      } catch (error) {
        console.error("Error loading interests:", error);
        Alert.alert("Error", "Failed to load interests");
      } finally {
        setIsLoading(false);
      }
    };

    loadInterests();
  }, []);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(interestId)) {
        newSet.delete(interestId);
      } else {
        newSet.add(interestId);
      }
      return newSet;
    });
  };

  const handleContinue = async () => {
    if (selectedInterests.size === 0) {
      Alert.alert("Select Interests", "Please select at least one interest to continue");
      return;
    }

    if (!user?.id) return;

    try {
      setIsSaving(true);
      await profileService.setInterests(user.id, Array.from(selectedInterests));
      router.push("/onboarding/profile-setup");
    } catch (error) {
      console.error("Error saving interests:", error);
      Alert.alert("Error", "Failed to save interests. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading interests...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text className="text-2xl font-bold text-foreground mb-2">Choose Your Interests</Text>
          <Text className="text-sm text-muted-foreground mb-2">
            Select at least 3 interests to help us find better matches for you
          </Text>
          <View className="h-1 bg-border rounded-full overflow-hidden">
            <View
              className="h-full bg-primary"
              style={{ width: `${Math.min((selectedInterests.size / 3) * 100, 100)}%` }}
            />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {/* Selected Count */}
          <View className="bg-primary/20 rounded-2xl p-4 mb-4 border border-primary">
            <Text className="text-sm font-semibold text-primary text-center">
              {selectedInterests.size} interest{selectedInterests.size !== 1 ? "s" : ""} selected
              {selectedInterests.size < 3 && ` (select ${3 - selectedInterests.size} more)`}
            </Text>
          </View>

          {/* Interests Grid */}
          <View className="flex-row flex-wrap gap-3">
            {interests.map((interest) => {
              const isSelected = selectedInterests.has(interest.id);

              return (
                <TouchableOpacity
                  key={interest.id}
                  onPress={() => toggleInterest(interest.id)}
                  className={`flex-row items-center rounded-2xl px-4 py-3 border ${
                    isSelected ? "bg-primary border-primary" : "bg-card border-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className="text-2xl mr-2">{interest.icon}</Text>
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {interest.name}
                  </Text>
                  {isSelected && <Check className="h-4 w-4 text-primary-foreground ml-2" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View className="px-6 py-4 border-t border-border">
        <TouchableOpacity
          onPress={handleContinue}
          disabled={selectedInterests.size === 0 || isSaving}
          className={`rounded-2xl py-4 items-center ${
            selectedInterests.size === 0 ? "bg-muted" : "bg-primary"
          }`}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text
              className={`text-lg font-bold ${
                selectedInterests.size === 0 ? "text-muted-foreground" : "text-primary-foreground"
              }`}
            >
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
