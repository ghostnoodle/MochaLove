import * as React from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, Bell, Lock, Globe, Eye, Shield, Trash2 } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";

export default function SettingsScreen() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [matchNotifications, setMatchNotifications] = React.useState(true);
  const [messageNotifications, setMessageNotifications] = React.useState(true);
  const [privateMode, setPrivateMode] = React.useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert("Feature Coming Soon", "Account deletion will be available soon."),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Settings</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View className="px-6 py-4">
          <View className="flex-row items-center mb-4">
            <Bell className="h-5 w-5 text-primary mr-2" />
            <Text className="text-lg font-bold text-foreground">Notifications</Text>
          </View>

          <View className="bg-card rounded-2xl border border-border overflow-hidden">
            <View className="p-4 flex-row items-center justify-between border-b border-border">
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Push Notifications</Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  Receive notifications on this device
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#767577", true: "#7ed321" }}
                thumbColor="#ffffff"
              />
            </View>

            <View className="p-4 flex-row items-center justify-between border-b border-border">
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">New Matches</Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  Get notified when you have a new match
                </Text>
              </View>
              <Switch
                value={matchNotifications}
                onValueChange={setMatchNotifications}
                trackColor={{ false: "#767577", true: "#7ed321" }}
                thumbColor="#ffffff"
                disabled={!notifications}
              />
            </View>

            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">New Messages</Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  Get notified when you receive messages
                </Text>
              </View>
              <Switch
                value={messageNotifications}
                onValueChange={setMessageNotifications}
                trackColor={{ false: "#767577", true: "#7ed321" }}
                thumbColor="#ffffff"
                disabled={!notifications}
              />
            </View>
          </View>
        </View>

        {/* Privacy Section */}
        <View className="px-6 py-4">
          <View className="flex-row items-center mb-4">
            <Lock className="h-5 w-5 text-primary mr-2" />
            <Text className="text-lg font-bold text-foreground">Privacy</Text>
          </View>

          <View className="bg-card rounded-2xl border border-border overflow-hidden">
            <View className="p-4 flex-row items-center justify-between border-b border-border">
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Private Mode</Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  Only show your profile to people you like
                </Text>
              </View>
              <Switch
                value={privateMode}
                onValueChange={setPrivateMode}
                trackColor={{ false: "#767577", true: "#7ed321" }}
                thumbColor="#ffffff"
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push("/profile/blocked-users")}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Blocked Users</Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  Manage your blocked users list
                </Text>
              </View>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View className="px-6 py-4">
          <View className="flex-row items-center mb-4">
            <Shield className="h-5 w-5 text-primary mr-2" />
            <Text className="text-lg font-bold text-foreground">Account</Text>
          </View>

          <View className="bg-card rounded-2xl border border-border overflow-hidden">
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Feature Coming Soon", "Change password will be available soon.")
              }
              className="p-4 flex-row items-center justify-between border-b border-border"
            >
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Change Password</Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  Update your account password
                </Text>
              </View>
              <Lock className="h-5 w-5 text-muted-foreground" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert("Feature Coming Soon", "Language settings will be available soon.")
              }
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Language</Text>
                <Text className="text-sm text-muted-foreground mt-1">English</Text>
              </View>
              <Globe className="h-5 w-5 text-muted-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View className="px-6 py-4 mb-8">
          <View className="flex-row items-center mb-4">
            <Trash2 className="h-5 w-5 text-destructive mr-2" />
            <Text className="text-lg font-bold text-foreground">Danger Zone</Text>
          </View>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            className="bg-destructive/20 rounded-2xl p-4 border border-destructive"
          >
            <Text className="text-base font-medium text-destructive">Delete Account</Text>
            <Text className="text-sm text-destructive/70 mt-1">
              Permanently delete your account and all data
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
