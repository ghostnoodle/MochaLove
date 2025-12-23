import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import type { UserGender } from "~/types";

const SESSION_KEY = "mocha_love_session";

// Auth Service
export const authService = {
  // Sign up with email, password, and gender
  async signUp(email: string, password: string, gender: UserGender) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          gender,
        },
      },
    });

    if (error) throw error;

    // Store session
    if (data.session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
    }

    return data;
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Store session
    if (data.session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
    }

    return data;
  },

  // Sign out
  async signOut() {
    console.log("🔵 [AUTH SERVICE] signOut() called");
    console.log("🔵 [AUTH SERVICE] Calling supabase.auth.signOut()...");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("🔵 [AUTH SERVICE] ❌ Supabase signOut error:", error);
      throw error;
    }

    console.log("🔵 [AUTH SERVICE] ✅ Supabase signOut successful");
    console.log("🔵 [AUTH SERVICE] Clearing AsyncStorage session key:", SESSION_KEY);

    // Clear stored session
    await AsyncStorage.removeItem(SESSION_KEY);

    console.log("🔵 [AUTH SERVICE] ✅ AsyncStorage cleared");
    console.log("🔵 [AUTH SERVICE] signOut() completed");
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Get current user
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  // Restore session from AsyncStorage
  async restoreSession() {
    try {
      const sessionString = await AsyncStorage.getItem(SESSION_KEY);
      if (!sessionString) return null;

      const session = JSON.parse(sessionString);

      // Set the session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        // Session is invalid, clear it
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
      }

      return data.session;
    } catch (error) {
      console.error("Error restoring session:", error);
      return null;
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      // Update stored session
      if (session) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem(SESSION_KEY);
      }

      callback(event, session);
    });
  },
};

// User data service
export const userService = {
  // Get user profile
  async getProfile(userId: string) {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

    if (error) throw error;
    return data;
  },

  // Initial profile setup (bypasses RLS for first-time setup)
  async setupProfile(userId: string, name: string, bio: string | null, location: string | null) {
    const { data, error } = await supabase.rpc("setup_user_profile", {
      user_id: userId,
      user_name: name,
      user_bio: bio,
      user_location: location,
    });

    if (error) throw error;
    return data;
  },

  // Update user profile (requires authentication)
  async updateProfile(userId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Claim new user bonus
  async claimNewUserBonus(userId: string) {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("gender, new_user_bonus_claimed")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    if (user.new_user_bonus_claimed) {
      throw new Error("New user bonus already claimed");
    }

    const bonusAmount = user.gender === "man" ? 50 : 0;

    // Get current coins
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("coins")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    // Update user coins and mark bonus as claimed
    const { error: updateError } = await supabase
      .from("users")
      .update({
        coins: (currentUser?.coins || 0) + bonusAmount,
        new_user_bonus_claimed: true,
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    // Create transaction record
    if (bonusAmount > 0) {
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "new_user_bonus",
        amount: bonusAmount,
        description: "Welcome bonus!",
      });
    }

    return bonusAmount;
  },

  // Get user balance (coins or earnings)
  async getBalance(userId: string) {
    const { data, error } = await supabase
      .from("users")
      .select("coins, earnings, gender")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },
};
