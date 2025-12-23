import { supabase } from "./supabase";

export interface AdminStats {
  total_users: number;
  active_users: number;
  banned_users: number;
  pending_profiles: number;
  total_men: number;
  total_women: number;
  pending_reports: number;
  total_transactions: number;
  total_revenue_cents: number;
  total_messages: number;
  total_matches: number;
  total_gifts_sent: number;
  active_conversations: number;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  reason: string | null;
  metadata: any;
  created_at: string;
}

export interface UserWithDetails {
  id: string;
  email: string;
  name: string;
  gender: string;
  coins: number;
  earnings: number;
  is_admin: boolean;
  is_moderator: boolean;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  profile_status: string;
  photo_url: string | null;
  created_at: string;
}

export interface ReportWithDetails {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

export interface RevenueAnalytics {
  date: string;
  revenue_cents: number;
  transaction_count: number;
}

export interface UserGrowthAnalytics {
  date: string;
  new_users: number;
  new_men: number;
  new_women: number;
}

// Admin Service
export const adminService = {
  /**
   * Check if current user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error) return false;
    return data?.is_admin === true;
  },

  /**
   * Get admin dashboard statistics
   */
  async getStats(): Promise<AdminStats> {
    const { data, error } = await supabase.rpc("get_admin_stats");

    if (error) throw error;
    return data as AdminStats;
  },

  /**
   * Get all users with pagination
   */
  async getUsers(
    page = 0,
    limit = 50,
    filters?: {
      gender?: "man" | "woman";
      status?: string;
      is_banned?: boolean;
    },
  ): Promise<UserWithDetails[]> {
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (filters?.gender) {
      query = query.eq("gender", filters.gender);
    }
    if (filters?.status) {
      query = query.eq("profile_status", filters.status);
    }
    if (filters?.is_banned !== undefined) {
      query = query.eq("is_banned", filters.is_banned);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as UserWithDetails[];
  },

  /**
   * Search users by name or email
   */
  async searchUsers(searchTerm: string): Promise<UserWithDetails[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(20);

    if (error) throw error;
    return data as UserWithDetails[];
  },

  /**
   * Ban a user
   */
  async banUser(adminId: string, userId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc("admin_ban_user", {
      admin_user_id: adminId,
      target_user_id: userId,
      ban_reason: reason,
    });

    if (error) throw error;
  },

  /**
   * Unban a user
   */
  async unbanUser(adminId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("admin_unban_user", {
      admin_user_id: adminId,
      target_user_id: userId,
    });

    if (error) throw error;
  },

  /**
   * Get all reports with pagination
   */
  async getReports(
    page = 0,
    limit = 50,
    status?: "pending" | "reviewed" | "actioned" | "dismissed",
  ): Promise<ReportWithDetails[]> {
    let query = supabase
      .from("reports")
      .select(
        `
        *,
        reporter:users!reports_reporter_id_fkey(name),
        reported:users!reports_reported_id_fkey(name)
      `,
      )
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((report: any) => ({
      ...report,
      reporter_name: report.reporter?.name || "Unknown",
      // If there's no reported user (general issue report), show "General Issue"
      reported_name: report.reported?.name || (report.reported_id ? "Unknown" : "General Issue"),
    }));
  },

  /**
   * Update report status
   */
  async updateReport(
    adminId: string,
    reportId: string,
    status: "reviewed" | "actioned" | "dismissed",
    notes: string,
  ): Promise<void> {
    console.log("📝 [ADMIN SERVICE] Calling admin_update_report RPC:", {
      admin_user_id: adminId,
      report_id: reportId,
      new_status: status,
      resolution_notes: notes,
    });

    const { data, error } = await supabase.rpc("admin_update_report", {
      admin_user_id: adminId,
      report_id: reportId,
      new_status: status,
      resolution_notes: notes,
    });

    console.log("📊 [ADMIN SERVICE] RPC response:", { data, error });

    if (error) {
      console.error("❌ [ADMIN SERVICE] RPC error:", error);
      throw error;
    }

    console.log("✅ [ADMIN SERVICE] Report updated successfully");
  },

  /**
   * Get admin action history
   */
  async getActionHistory(page = 0, limit = 50): Promise<AdminAction[]> {
    const { data, error } = await supabase
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (error) throw error;
    return data as AdminAction[];
  },

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(): Promise<RevenueAnalytics[]> {
    const { data, error } = await supabase.rpc("get_revenue_analytics");

    if (error) throw error;
    return data as RevenueAnalytics[];
  },

  /**
   * Get user growth analytics
   */
  async getUserGrowthAnalytics(): Promise<UserGrowthAnalytics[]> {
    const { data, error } = await supabase.rpc("get_user_growth_analytics");

    if (error) throw error;
    return data as UserGrowthAnalytics[];
  },

  /**
   * Update user profile status
   */
  async updateUserStatus(
    userId: string,
    status: "active" | "pending" | "suspended" | "deleted",
  ): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ profile_status: status })
      .eq("id", userId);

    if (error) throw error;
  },

  /**
   * Grant admin privileges
   */
  async grantAdmin(userId: string): Promise<void> {
    const { error } = await supabase.from("users").update({ is_admin: true }).eq("id", userId);

    if (error) throw error;
  },

  /**
   * Revoke admin privileges
   */
  async revokeAdmin(userId: string): Promise<void> {
    const { error } = await supabase.from("users").update({ is_admin: false }).eq("id", userId);

    if (error) throw error;
  },

  /**
   * Grant moderator privileges
   */
  async grantModerator(userId: string): Promise<void> {
    const { error } = await supabase.from("users").update({ is_moderator: true }).eq("id", userId);

    if (error) throw error;
  },

  /**
   * Revoke moderator privileges
   */
  async revokeModerator(userId: string): Promise<void> {
    const { error } = await supabase.from("users").update({ is_moderator: false }).eq("id", userId);

    if (error) throw error;
  },
};
