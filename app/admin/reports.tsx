import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, AlertCircle, Check, X } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { adminService, type ReportWithDetails } from "~/lib/admin";

export default function AdminReportsScreen() {
  const { user } = useAuth();
  const [reports, setReports] = React.useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedFilter, setSelectedFilter] = React.useState<
    "all" | "pending" | "reviewed" | "actioned" | "dismissed"
  >("pending");
  const [actioningReportId, setActioningReportId] = React.useState<string | null>(null);

  // Load reports
  const loadReports = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const filter = selectedFilter === "all" ? undefined : selectedFilter;
      const data = await adminService.getReports(0, 100, filter as any);
      console.log("📊 [ADMIN] Loaded reports:", data.length);
      setReports(data);
    } catch (error) {
      console.error("❌ [ADMIN] Error loading reports:", error);
      const errorMsg = "Failed to load reports";
      if (Platform.OS === "web") {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadReports();
  }, [selectedFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReports();
  };

  // Handle report action
  const handleReportAction = async (
    report: ReportWithDetails,
    action: "reviewed" | "actioned" | "dismissed",
  ) => {
    if (!user?.id) return;

    try {
      console.log("🔄 [ADMIN] Handling report action:", {
        reportId: report.id,
        action,
        currentStatus: report.status,
      });

      setActioningReportId(report.id);

      // Update report status without prompting for notes
      await adminService.updateReport(user.id, report.id, action, "");
      console.log("✅ [ADMIN] Report updated successfully");

      // Reload reports to remove from pending list
      console.log("🔄 [ADMIN] Reloading reports...");
      await loadReports();
      console.log("✅ [ADMIN] Reports reloaded");
    } catch (error) {
      console.error("❌ [ADMIN] Error updating report:", error);
      const errorMsg = "Failed to update report";
      if (Platform.OS === "web") {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setActioningReportId(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      // User report reasons
      inappropriate_content: "Inappropriate Content",
      harassment: "Harassment",
      spam: "Spam",
      fake_profile: "Fake Profile",
      underage: "Underage",
      // Issue report reasons (from report-issue screen)
      bug: "Bug or Error",
      account: "Account Issue",
      payment: "Payment Problem",
      feature: "Feature Request",
      inappropriate: "Inappropriate Content",
      other: "Other",
    };
    return labels[reason] || reason;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "text-yellow-500",
      reviewed: "text-blue-500",
      actioned: "text-primary",
      dismissed: "text-muted-foreground",
    };
    return colors[status] || "text-foreground";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.push("/admin/dashboard")} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Reports</Text>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["all", "pending", "reviewed", "actioned", "dismissed"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              className={`rounded-full px-4 py-2 border ${
                selectedFilter === filter ? "bg-primary border-primary" : "bg-card border-border"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedFilter === filter ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reports List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7ed321" />
          <Text className="text-foreground mt-4">Loading reports...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          <View className="px-6 pb-6">
            {reports.length === 0 ? (
              <View className="items-center justify-center py-12">
                <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <Text className="text-xl font-semibold text-foreground mb-2">No Reports</Text>
                <Text className="text-muted-foreground text-center">
                  {selectedFilter === "pending"
                    ? "All caught up! No pending reports."
                    : `No ${selectedFilter} reports found.`}
                </Text>
              </View>
            ) : (
              reports.map((report) => {
                const isActioning = actioningReportId === report.id;

                return (
                  <View
                    key={report.id}
                    className="bg-card rounded-2xl p-4 mb-3 border border-border"
                  >
                    {/* Header */}
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-1">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <Text className="text-base font-bold text-foreground">
                            {getReasonLabel(report.reason)}
                          </Text>
                        </View>
                        <Text className="text-sm text-muted-foreground">
                          {formatDate(report.created_at)}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-3 py-1 ${
                          report.status === "pending"
                            ? "bg-yellow-500/20"
                            : report.status === "actioned"
                              ? "bg-primary/20"
                              : report.status === "reviewed"
                                ? "bg-blue-500/20"
                                : "bg-muted"
                        }`}
                      >
                        <Text className={`text-xs font-bold ${getStatusColor(report.status)}`}>
                          {report.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Details */}
                    <View className="bg-background rounded-xl p-3 mb-3">
                      <View className="flex-row mb-2">
                        <Text className="text-sm text-muted-foreground w-24">Reporter:</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {report.reporter_name}
                        </Text>
                      </View>
                      <View className="flex-row mb-2">
                        <Text className="text-sm text-muted-foreground w-24">Reported:</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {report.reported_name}
                        </Text>
                      </View>
                      {report.description && (
                        <View className="mt-2 pt-2 border-t border-border">
                          <Text className="text-sm text-muted-foreground mb-1">Description:</Text>
                          <Text className="text-sm text-foreground">{report.description}</Text>
                        </View>
                      )}
                    </View>

                    {/* Resolution Notes (if reviewed) */}
                    {report.resolution_notes && (
                      <View className="bg-primary/10 rounded-xl p-3 mb-3">
                        <Text className="text-xs text-muted-foreground mb-1">
                          Resolution Notes:
                        </Text>
                        <Text className="text-sm text-foreground">{report.resolution_notes}</Text>
                        {report.reviewed_at && (
                          <Text className="text-xs text-muted-foreground mt-1">
                            Reviewed {formatDate(report.reviewed_at)}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Actions */}
                    {report.status === "pending" && (
                      <View className="flex-row gap-2">
                        {isActioning ? (
                          <View className="flex-1 items-center py-2">
                            <ActivityIndicator size="small" color="#7ed321" />
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              onPress={() => handleReportAction(report, "dismissed")}
                              className="flex-1 bg-muted rounded-xl py-3 items-center"
                            >
                              <View className="flex-row items-center">
                                <X className="h-4 w-4 text-foreground mr-2" />
                                <Text className="text-sm font-semibold text-foreground">
                                  Dismiss
                                </Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleReportAction(report, "actioned")}
                              className="flex-1 bg-primary rounded-xl py-3 items-center"
                            >
                              <View className="flex-row items-center">
                                <Check className="h-4 w-4 text-primary-foreground mr-2" />
                                <Text className="text-sm font-semibold text-primary-foreground">
                                  Done
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
