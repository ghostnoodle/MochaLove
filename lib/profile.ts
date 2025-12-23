import { supabase } from "./supabase";

export interface InterestCategory {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface UserInterest {
  interest_id: string;
  interest_name: string;
  interest_icon: string;
}

export interface ProfileUpdateData {
  name?: string;
  bio?: string;
  location?: string;
  age?: number;
  height_cm?: number;
  looking_for?: "friendship" | "dating" | "relationship" | "anything";
}

// Profile Service
export const profileService = {
  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<void> {
    const { error } = await supabase.from("users").update(data).eq("id", userId);

    if (error) throw error;
  },

  /**
   * Get all available interest categories
   */
  async getInterestCategories(): Promise<InterestCategory[]> {
    const { data, error } = await supabase
      .from("interest_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data as InterestCategory[];
  },

  /**
   * Get user's selected interests
   */
  async getUserInterests(userId: string): Promise<UserInterest[]> {
    const { data, error } = await supabase.rpc("get_user_interests", {
      user_id_param: userId,
    });

    if (error) throw error;
    return data as UserInterest[];
  },

  /**
   * Add an interest to user's profile
   */
  async addInterest(userId: string, interestId: string): Promise<void> {
    const { error } = await supabase.rpc("add_user_interest", {
      user_id_param: userId,
      interest_id_param: interestId,
    });

    if (error) throw error;
  },

  /**
   * Remove an interest from user's profile
   */
  async removeInterest(userId: string, interestId: string): Promise<void> {
    const { error } = await supabase.rpc("remove_user_interest", {
      user_id_param: userId,
      interest_id_param: interestId,
    });

    if (error) throw error;
  },

  /**
   * Set user interests (replace all)
   */
  async setInterests(userId: string, interestIds: string[]): Promise<void> {
    // First, remove all existing interests
    await supabase.from("user_interests").delete().eq("user_id", userId);

    // Then add the new interests
    if (interestIds.length > 0) {
      const { error } = await supabase.from("user_interests").insert(
        interestIds.map((interestId) => ({
          user_id: userId,
          interest_id: interestId,
        })),
      );

      if (error) throw error;
    }
  },

  /**
   * Find users with common interests
   */
  async findUsersWithCommonInterests(
    userId: string,
    limit = 20,
  ): Promise<
    Array<{
      user_id: string;
      name: string;
      photo_url: string | null;
      bio: string | null;
      common_interests_count: number;
    }>
  > {
    const { data, error } = await supabase.rpc("find_users_with_common_interests", {
      user_id_param: userId,
      limit_param: limit,
    });

    if (error) throw error;
    return data as any[];
  },

  /**
   * Get profile completion percentage
   */
  async getProfileCompletionPercentage(userId: string): Promise<number> {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

    if (error) throw error;

    const fields = [data.name, data.bio, data.location, data.photo_url, data.age, data.looking_for];

    // Get interests count
    const { count } = await supabase
      .from("user_interests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const hasInterests = (count || 0) > 0;

    const completedFields = fields.filter((field) => field !== null && field !== "").length;
    const totalFields = fields.length + 1; // +1 for interests

    const percentage = Math.round(((completedFields + (hasInterests ? 1 : 0)) / totalFields) * 100);

    return percentage;
  },
};
