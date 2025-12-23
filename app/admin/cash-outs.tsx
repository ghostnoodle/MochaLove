import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { ChevronLeft, DollarSign, CheckCircle, XCircle, Clock, Search } from "~/lib/icons";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";
import { stripeConnectService } from "~/lib/stripe-connect";

interface CashOutRequest {
  id: string;
  user_id: string;
  amount_cents: number;
  status: "pending" | "approved" | "processing" | "completed" | "failed" | "rejected";
  payment_method: string;
  stripe_payout_id: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  user_email: string;
  user_name: string;
  user_total_earnings: number;
}

export default function AdminCashOutsScreen() {
  const { profile } = useAuth();
  const [requests, setRequests] = React.useState<CashOutRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("pending");

  React.useEffect(() => {
    if (profile?.role !== "admin") {
      Alert.alert("Access Denied", "You must be an admin to view this page");
      router.back();
      return;
    }
    loadCashOutRequests();
  }, [profile?.role, statusFilter]);

  const loadCashOutRequests = async () => {
    try {
      setIsLoading(true);

      const query = supabase
        .from("cash_out_requests")
        .select(
          `
          *,
          users!user_id (
            email,
            display_name,
            earnings
          )
        `,
        )
        .order("created_at", { ascending: false });

      // Apply status filter
      if (statusFilter !== "all") {
        query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = (data || []).map((item) => ({
        id: item.id,
        user_id: item.user_id,
        amount_cents: item.amount_cents,
        status: item.status,
        payment_method: item.payment_method,
        stripe_payout_id: item.stripe_payout_id,
        failure_reason: item.failure_reason,
        admin_notes: item.admin_notes,
        created_at: item.created_at,
        user_email: item.users?.email || "Unknown",
        user_name: item.users?.display_name || "Unknown",
        user_total_earnings: item.users?.earnings || 0,
      }));

      setRequests(transformedData);
    } catch (error) {
      console.error("Error loading cash-out requests:", error);
      Alert.alert("Error", "Failed to load cash-out requests");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (request: CashOutRequest) => {
    Alert.alert(
      "Approve Cash-Out Request",
      `Approve ${request.user_name}'s request for $${(request.amount_cents / 100).toFixed(2)}?\n\nThis will initiate a payout to their connected bank account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve & Process",
          style: "default",
          onPress: async () => {
            await processPayout(request);
          },
        },
      ],
    );
  };

  const processPayout = async (request: CashOutRequest) => {
    try {
      // Update status to approved first
      const { error: updateError } = await supabase
        .from("cash_out_requests")
        .update({
          status: "approved",
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Process the payout via Edge Function
      const { payoutId } = await stripeConnectService.processPayout({
        userId: request.user_id,
        amountCents: request.amount_cents,
        cashOutRequestId: request.id,
      });

      Alert.alert(
        "Payout Initiated ✅",
        `Payout ${payoutId} has been successfully initiated. Funds will be transferred to the user's bank account within 2-5 business days.`,
      );

      // Reload requests
      loadCashOutRequests();
    } catch (error) {
      console.error("Error processing payout:", error);
      Alert.alert("Error", `Failed to process payout: ${error.message}`);

      // Revert status back to pending
      await supabase.from("cash_out_requests").update({ status: "pending" }).eq("id", request.id);
    }
  };

  const handleReject = async (request: CashOutRequest) => {
    Alert.prompt(
      "Reject Cash-Out Request",
      "Please provide a reason for rejection:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async (reason) => {
            try {
              const { error } = await supabase
                .from("cash_out_requests")
                .update({
                  status: "rejected",
                  admin_notes: reason || "Rejected by admin",
                  approved_by: profile?.id,
                })
                .eq("id", request.id);

              if (error) throw error;

              // Refund user's earnings
              const { error: refundError } = await supabase
                .from("users")
                .update({
                  earnings: request.user_total_earnings + request.amount_cents,
                })
                .eq("id", request.user_id);

              if (refundError) throw refundError;

              Alert.alert(
                "Request Rejected",
                "The cash-out request has been rejected and funds returned to the user.",
              );
              loadCashOutRequests();
            } catch (error) {
              console.error("Error rejecting request:", error);
              Alert.alert("Error", "Failed to reject request");
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.user_name.toLowerCase().includes(query) ||
      request.user_email.toLowerCase().includes(query) ||
      request.id.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100";
      case "approved":
        return "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100";
      case "processing":
        return "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100";
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100";
      case "failed":
        return "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100";
      case "rejected":
        return "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground">Cash-Out Management</Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-card rounded-xl px-4 py-2 border border-border mb-3">
          <Search className="h-5 w-5 text-muted-foreground mr-2" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by user or request ID..."
            placeholderTextColor="#999"
            className="flex-1 text-foreground"
          />
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {["pending", "approved", "processing", "completed", "failed", "rejected", "all"].map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl ${
                    statusFilter === status ? "bg-primary" : "bg-card border border-border"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      statusFilter === status ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333EA" />
          <Text className="mt-4 text-muted-foreground">Loading requests...</Text>
        </View>
      ) : filteredRequests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Clock className="h-16 w-16 text-muted-foreground mb-4" />
          <Text className="text-lg font-bold text-foreground mb-2">No Requests Found</Text>
          <Text className="text-muted-foreground text-center">
            {searchQuery
              ? "No requests match your search"
              : `No ${statusFilter === "all" ? "" : statusFilter} cash-out requests`}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={loadCashOutRequests} />
          }
        >
          <View className="p-6 gap-4">
            {filteredRequests.map((request) => (
              <View key={request.id} className="bg-card rounded-2xl p-4 border border-border">
                {/* User Info */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">{request.user_name}</Text>
                    <Text className="text-sm text-muted-foreground">{request.user_email}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(request.status)}`}>
                    <Text className="text-xs font-medium capitalize">{request.status}</Text>
                  </View>
                </View>

                {/* Amount */}
                <View className="flex-row items-center mb-3">
                  <DollarSign className="h-5 w-5 text-primary mr-1" />
                  <Text className="text-2xl font-bold text-foreground">
                    {(request.amount_cents / 100).toFixed(2)}
                  </Text>
                </View>

                {/* Details */}
                <View className="bg-background rounded-xl p-3 mb-3">
                  <Text className="text-xs text-muted-foreground mb-1">Request Date</Text>
                  <Text className="text-sm text-foreground mb-2">
                    {new Date(request.created_at).toLocaleString()}
                  </Text>
                  <Text className="text-xs text-muted-foreground mb-1">User Balance</Text>
                  <Text className="text-sm text-foreground">
                    ${(request.user_total_earnings / 100).toFixed(2)}
                  </Text>
                </View>

                {/* Admin Actions */}
                {request.status === "pending" && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleApprove(request)}
                      className="flex-1 bg-green-600 rounded-xl py-3 flex-row items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 text-white mr-2" />
                      <Text className="text-white font-semibold">Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReject(request)}
                      className="flex-1 bg-red-600 rounded-xl py-3 flex-row items-center justify-center"
                    >
                      <XCircle className="h-5 w-5 text-white mr-2" />
                      <Text className="text-white font-semibold">Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Failure Reason */}
                {request.failure_reason && (
                  <View className="mt-3 bg-red-50 dark:bg-red-950 rounded-xl p-3 border border-red-200 dark:border-red-800">
                    <Text className="text-xs font-medium text-red-900 dark:text-red-100 mb-1">
                      Failure Reason
                    </Text>
                    <Text className="text-sm text-red-700 dark:text-red-300">
                      {request.failure_reason}
                    </Text>
                  </View>
                )}

                {/* Payout ID */}
                {request.stripe_payout_id && (
                  <Text className="text-xs text-muted-foreground mt-2">
                    Payout ID: {request.stripe_payout_id}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
