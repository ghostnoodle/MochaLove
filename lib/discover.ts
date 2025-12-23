import { supabase } from "./supabase";

export interface DiscoverUser {
  id: string;
  name: string;
  email: string;
  gender: "man" | "woman";
  bio: string | null;
  location: string | null;
  photo_url: string | null;
  created_at: string;
}

// Discover Service
export const discoverService = {
  /**
   * Get users of opposite gender for discovery
   */
  async getOppositeGenderUsers(
    currentUserId: string,
    currentUserGender: "man" | "woman",
    limit = 20,
  ): Promise<DiscoverUser[]> {
    const oppositeGender = currentUserGender === "man" ? "woman" : "man";

    console.log("🟡 [DISCOVER] getOppositeGenderUsers called");
    console.log("🟡 [DISCOVER] Current user ID:", currentUserId);
    console.log("🟡 [DISCOVER] Current user gender:", currentUserGender);
    console.log("🟡 [DISCOVER] Looking for gender:", oppositeGender);

    // First, get all users who have been liked by the current user
    console.log("🟡 [DISCOVER] Fetching already liked users...");
    const { data: alreadyLiked, error: likedError } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

    if (likedError) {
      console.error("🟡 [DISCOVER] ❌ Error fetching liked users:", likedError);
    }

    // Extract the IDs of users who have been liked
    const likedUserIds = new Set<string>();
    alreadyLiked?.forEach((match) => {
      if (match.user1_id === currentUserId) {
        likedUserIds.add(match.user2_id);
      } else {
        likedUserIds.add(match.user1_id);
      }
    });

    console.log("🟡 [DISCOVER] Already liked user IDs:", Array.from(likedUserIds));

    // Fetch users, excluding already liked ones
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, gender, bio, location, photo_url, created_at")
      .eq("gender", oppositeGender)
      .eq("profile_completed", true)
      .neq("id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(limit * 2); // Fetch more to account for filtering

    if (error) {
      console.error("🟡 [DISCOVER] ❌ Error fetching users:", error);
      throw error;
    }

    // Filter out already liked users
    const filteredUsers = (data || []).filter((user) => !likedUserIds.has(user.id)).slice(0, limit);

    console.log(
      "🟡 [DISCOVER] ✅ Found",
      filteredUsers.length,
      "new users (filtered out",
      likedUserIds.size,
      "already liked)",
    );
    console.log("🟡 [DISCOVER] Users:", filteredUsers);

    return filteredUsers as DiscoverUser[];
  },

  /**
   * Create a match (like) between two users
   */
  async createMatch(user1Id: string, user2Id: string): Promise<void> {
    console.log("🟡 [DISCOVER] Creating match between", user1Id, "and", user2Id);

    const { error } = await supabase.from("matches").insert({
      user1_id: user1Id,
      user2_id: user2Id,
    });

    if (error) {
      console.error("🟡 [DISCOVER] ❌ Error creating match:", error);
      throw error;
    }

    console.log("🟡 [DISCOVER] ✅ Match created successfully");
  },

  /**
   * Get a single user by ID
   */
  async getUserById(userId: string): Promise<DiscoverUser> {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, gender, bio, location, photo_url, created_at")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data as DiscoverUser;
  },

  /**
   * Calculate age from created_at (placeholder - you might want to add birthdate field)
   */
  calculateDisplayAge(createdAt: string): number {
    // For now, return a random age between 22-35
    // TODO: Add actual birthdate field to users table
    return Math.floor(Math.random() * (35 - 22 + 1)) + 22;
  },

  /**
   * Get interests (placeholder - you might want to add interests table)
   */
  getInterests(): string[] {
    // TODO: Implement interests system
    const allInterests = [
      "Coffee",
      "Travel",
      "Photography",
      "Music",
      "Art",
      "Hiking",
      "Cooking",
      "Reading",
      "Yoga",
      "Gaming",
      "Fitness",
      "Movies",
    ];
    // Return 2-4 random interests
    const count = Math.floor(Math.random() * 3) + 2;
    return allInterests.sort(() => 0.5 - Math.random()).slice(0, count);
  },
};
