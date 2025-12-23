import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Camera, Save } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

export default function EditProfileScreen() {
  const { profile, refetchProfile } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  // Form state
  const [name, setName] = React.useState(profile?.name || "");
  const [bio, setBio] = React.useState(profile?.bio || "");
  const [age, setAge] = React.useState(profile?.age?.toString() || "");
  const [location, setLocation] = React.useState(profile?.location || "");
  const [interests, setInterests] = React.useState(profile?.interests?.join(", ") || "");
  const [photoUrl, setPhotoUrl] = React.useState(profile?.photo_url || "");

  const handleSave = async () => {
    if (!profile?.id) return;

    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (age && (parseInt(age) < 18 || parseInt(age) > 120)) {
      Alert.alert("Error", "Please enter a valid age (18-120)");
      return;
    }

    setIsSaving(true);

    try {
      // Convert interests string to array
      const interestsArray = interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const { error } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          age: age ? parseInt(age) : null,
          location: location.trim() || null,
          interests: interestsArray.length > 0 ? interestsArray : null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Refresh profile data
      await refetchProfile();

      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!profile?.id) return null;

    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create file name
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw error;
    }
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      // Request permissions
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          `Please grant ${useCamera ? "camera" : "photo library"} permissions to upload photos.`,
        );
        return;
      }

      // Launch picker
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingPhoto(true);

        // Upload photo
        const publicUrl = await uploadPhoto(result.assets[0].uri);

        if (publicUrl) {
          // Update profile in database
          const { error } = await supabase
            .from("users")
            .update({ photo_url: publicUrl })
            .eq("id", profile.id);

          if (error) throw error;

          // Update local state
          setPhotoUrl(publicUrl);
          await refetchProfile();

          Alert.alert("Success", "Profile photo updated!");
        }
      }
    } catch (error) {
      console.error("Error picking/uploading image:", error);
      Alert.alert("Error", "Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert("Change Photo", "Choose an option", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Take Photo",
        onPress: () => pickImage(true),
      },
      {
        text: "Choose from Gallery",
        onPress: () => pickImage(false),
      },
    ]);
  };

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#7ed321" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-border">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Edit Profile</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className="bg-primary rounded-xl px-4 py-2 flex-row items-center"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save className="h-5 w-5 text-primary-foreground mr-2" />
              <Text className="text-primary-foreground font-semibold">Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View className="items-center py-6">
          <View className="relative">
            <Image
              source={{
                uri: photoUrl || "https://i.pravatar.cc/200?img=12",
              }}
              className="w-32 h-32 rounded-full"
            />
            {isUploadingPhoto && (
              <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                <ActivityIndicator size="large" color="#7ed321" />
              </View>
            )}
            <TouchableOpacity
              onPress={handleChangePhoto}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 bg-primary rounded-full p-3 border-4 border-background"
            >
              <Camera className="h-5 w-5 text-primary-foreground" />
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-muted-foreground mt-3">
            {isUploadingPhoto ? "Uploading..." : "Tap to change photo"}
          </Text>
        </View>

        {/* Form Fields */}
        <View className="px-6 pb-6 gap-y-4">
          {/* Name */}
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">
              Name <Text className="text-destructive">*</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              className="bg-card rounded-xl p-4 text-foreground border border-border"
            />
          </View>

          {/* Bio */}
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-card rounded-xl p-4 text-foreground border border-border min-h-[100px]"
            />
          </View>

          {/* Age */}
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">Age</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={3}
              className="bg-card rounded-xl p-4 text-foreground border border-border"
            />
          </View>

          {/* Location */}
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              placeholderTextColor="#999"
              className="bg-card rounded-xl p-4 text-foreground border border-border"
            />
          </View>

          {/* Interests */}
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">Interests</Text>
            <TextInput
              value={interests}
              onChangeText={setInterests}
              placeholder="Travel, Music, Sports (comma separated)"
              placeholderTextColor="#999"
              multiline
              className="bg-card rounded-xl p-4 text-foreground border border-border"
            />
            <Text className="text-xs text-muted-foreground mt-2">
              Separate interests with commas
            </Text>
          </View>

          {/* Info Box */}
          <View className="bg-primary/20 rounded-xl p-4 border border-primary/30 mt-2">
            <Text className="text-sm text-primary">
              💡 Your profile information helps others get to know you better and increases your
              chances of making meaningful connections.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
