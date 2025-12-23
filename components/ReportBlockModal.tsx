import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { X, AlertCircle, Shield } from "~/lib/icons";
import { reportBlockService, REPORT_REASONS, type ReportReason } from "~/lib/report-block";
import { useAuth } from "~/hooks/useAuth";

interface ReportBlockModalProps {
  visible: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  onSuccess?: () => void;
}

export function ReportBlockModal({
  visible,
  onClose,
  targetUserId,
  targetUserName,
  onSuccess,
}: ReportBlockModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = React.useState<ReportReason | null>(null);
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleReport = async () => {
    if (!user?.id || !selectedReason) {
      Alert.alert("Error", "Please select a reason for reporting");
      return;
    }

    setIsSubmitting(true);

    try {
      await reportBlockService.reportUser({
        reporterId: user.id,
        reportedId: targetUserId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      Alert.alert(
        "Report Submitted",
        "Thank you for your report. We'll review it and take appropriate action.",
        [
          {
            text: "OK",
            onPress: () => {
              onClose();
              onSuccess?.();
            },
          },
        ],
      );

      // Reset form
      setSelectedReason(null);
      setDescription("");
    } catch (error) {
      console.error("Error reporting user:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!user?.id) return;

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${targetUserName}? They won't be able to contact you or see your profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await reportBlockService.blockUser(user.id, targetUserId);
              Alert.alert("User Blocked", `You have blocked ${targetUserName}`, [
                {
                  text: "OK",
                  onPress: () => {
                    onClose();
                    onSuccess?.();
                  },
                },
              ]);
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert("Error", "Failed to block user. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
            <Text className="text-xl font-bold text-foreground">Report or Block User</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X className="h-6 w-6 text-foreground" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
            {/* Block Button */}
            <TouchableOpacity
              onPress={handleBlock}
              disabled={isSubmitting}
              className="bg-destructive/20 rounded-2xl p-4 mb-6 border border-destructive flex-row items-center"
            >
              <Shield className="h-6 w-6 text-destructive mr-3" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-destructive">
                  Block {targetUserName}
                </Text>
                <Text className="text-sm text-destructive/70 mt-1">
                  They won't be able to contact you
                </Text>
              </View>
            </TouchableOpacity>

            {/* Report Section */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <AlertCircle className="h-5 w-5 text-primary mr-2" />
                <Text className="text-lg font-bold text-foreground">Report {targetUserName}</Text>
              </View>

              <Text className="text-sm text-muted-foreground mb-4">
                Select a reason for reporting this user:
              </Text>

              {/* Reason Selection */}
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  onPress={() => setSelectedReason(reason.value)}
                  className={`bg-card rounded-xl p-4 mb-2 border ${
                    selectedReason === reason.value
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                >
                  <Text
                    className={`text-base font-medium ${
                      selectedReason === reason.value ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Description (optional) */}
              {selectedReason && (
                <View className="mt-4">
                  <Text className="text-sm font-medium text-foreground mb-2">
                    Additional Details (Optional)
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Provide more details about this report..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="bg-card rounded-xl p-4 text-foreground border border-border min-h-[100px]"
                  />
                </View>
              )}
            </View>

            {/* Submit Button */}
            {selectedReason && (
              <TouchableOpacity
                onPress={handleReport}
                disabled={isSubmitting}
                className="bg-primary rounded-2xl py-4 mb-6"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-center font-bold text-primary-foreground text-lg">
                    Submit Report
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Info Box */}
            <View className="bg-primary/20 rounded-xl p-4 border border-primary/30 mb-4">
              <Text className="text-sm text-primary">
                ℹ️ All reports are reviewed by our moderation team. False reports may result in
                action on your account.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
