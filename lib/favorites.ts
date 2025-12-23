import { supabase } from "./supabase";

export interface FavoriteUser {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface ProfileView {
  id: string;
  viewer_id: string;
  viewed_user_id: string;
  created_at: string;
}

// Favorites Service
export const favoritesService = {
  /**
   * Add a user to favorites
   */
  async addFavorite(userId: string, favoritedUserId: string): Promise<void> {
    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      favorited_user_id: favoritedUserId,
    });

    if (error) throw error;

    // Check if this creates a mutual match
    const isMutual = await this.isMutualFavorite(userId, favoritedUserId);

    if (isMutual) {
      // Create a match if one doesn't exist
      await supabase
        .from("matches")
        .insert({
          user1_id: userId,
          user2_id: favoritedUserId,
        })
        .onConflict("user1_id,user2_id")
        .ignore();
    }
  },

  /**
   * Remove a user from favorites
   */
  async removeFavorite(userId: string, favoritedUserId: string): Promise<void> {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("favorited_user_id", favoritedUserId);

    if (error) throw error;
  },

  /**
   * Get all favorites for a user
   */
  async getFavorites(userId: string): Promise<FavoriteUser[]> {
    const { data, error } = await supabase
      .from("favorites")
      .select(
        `
        id,
        favorited_user_id,
        created_at,
        user:users!favorites_favorited_user_id_fkey(id, name, photo_url, bio)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user?.id || "",
      name: item.user?.name || "User",
      photo_url: item.user?.photo_url || null,
      bio: item.user?.bio || null,
      created_at: item.created_at,
    }));
  },

  /**
   * Check if a user is favorited
   */
  async isFavorited(userId: string, favoritedUserId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("favorited_user_id", favoritedUserId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned
    return !!data;
  },

  /**
   * Check if two users are mutual favorites
   */
  async isMutualFavorite(user1Id: string, user2Id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_mutual_favorite", {
      user1_id: user1Id,
      user2_id: user2Id,
    });

    if (error) throw error;
    return data as boolean;
  },

  /**
   * Get mutual favorites (matches)
   */
  async getMutualFavorites(userId: string): Promise<FavoriteUser[]> {
    const { data, error } = await supabase.rpc("get_mutual_favorites", {
      user_id_param: userId,
    });

    if (error) throw error;
    return data as FavoriteUser[];
  },

  /**
   * Get "who liked you" - users who favorited you but you haven't favorited back
   */
  async getWhoLikedYou(userId: string): Promise<FavoriteUser[]> {
    const { data, error } = await supabase.rpc("get_who_liked_you", {
      user_id_param: userId,
    });

    if (error) throw error;
    return data as FavoriteUser[];
  },

  /**
   * Get favorites count
   */
  async getFavoritesCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get who liked you count
   */
  async getWhoLikedYouCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("favorited_user_id", userId);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Subscribe to new favorites (when someone likes you)
   */
  subscribeToNewFavorites(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`favorites:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "favorites",
          filter: `favorited_user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },
};

// Profile Views Service
export const profileViewsService = {
  /**
   * Record a profile view
   */
  async recordView(viewerId: string, viewedUserId: string): Promise<void> {
    // Don't record if viewing own profile
    if (viewerId === viewedUserId) return;

    const { error } = await supabase
      .from("profile_views")
      .insert({
        viewer_id: viewerId,
        viewed_user_id: viewedUserId,
      })
      .onConflict("viewer_id,viewed_user_id,created_at")
      .ignore(); // Ignore if already viewed today

    if (error && error.code !== "23505") throw error; // 23505 = unique constraint violation
  },

  /**
   * Get who viewed your profile
   */
  async getWhoViewedYou(
    userId: string,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      viewer_id: string;
      viewer_name: string;
      viewer_photo_url: string | null;
      viewer_bio: string | null;
      created_at: string;
    }>
  > {
    const { data, error } = await supabase
      .from("profile_views")
      .select(
        `
        id,
        viewer_id,
        created_at,
        viewer:users!profile_views_viewer_id_fkey(name, photo_url, bio)
      `,
      )
      .eq("viewed_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      viewer_id: item.viewer_id,
      viewer_name: item.viewer?.name || "User",
      viewer_photo_url: item.viewer?.photo_url || null,
      viewer_bio: item.viewer?.bio || null,
      created_at: item.created_at,
    }));
  },

  /**
   * Get profile views count
   */
  async getViewsCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("profile_views")
      .select("*", { count: "exact", head: true })
      .eq("viewed_user_id", userId);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Subscribe to new profile views
   */
  subscribeToNewViews(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`profile_views:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profile_views",
          filter: `viewed_user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },
};
