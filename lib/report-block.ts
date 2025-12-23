import { supabase } from "~/lib/supabase";

export type ReportReason =
  | "inappropriate_content"
  | "harassment"
  | "spam"
  | "fake_profile"
  | "underage"
  | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "harassment", label: "Harassment or Bullying" },
  { value: "spam", label: "Spam or Scam" },
  { value: "fake_profile", label: "Fake Profile" },
  { value: "underage", label: "Underage User" },
  { value: "other", label: "Other" },
];

export const reportBlockService = {
  /**
   * Report a user
   */
  async reportUser(params: {
    reporterId: string;
    reportedId: string;
    reason: ReportReason;
    description?: string;
  }) {
    const { error } = await supabase.from("reports").insert({
      reporter_id: params.reporterId,
      reported_id: params.reportedId,
      reason: params.reason,
      description: params.description || null,
    });

    if (error) throw error;
    return { success: true };
  },

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });

    if (error) throw error;
    return { success: true };
  },

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Check if user is blocked
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  },

  /**
   * Get all blocked users
   */
  async getBlockedUsers(userId: string) {
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", userId);

    if (error) throw error;
    return data.map((row) => row.blocked_id);
  },
};
