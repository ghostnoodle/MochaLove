import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, userService } from "~/lib/auth";
import type { UserGender } from "~/types";

// Auth context
interface AuthContextType {
  user: any | null;
  profile: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, gender: UserGender) => Promise<void>;
  signOut: () => Promise<void>;
  refetchProfile: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const queryClient = useQueryClient();

  // Get current user
  const {
    data: user,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      return user;
    },
    enabled: isInitialized,
    retry: false,
  });

  // Get user profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["user", "profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await userService.getProfile(user.id);
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Restore session on mount
  React.useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        await authService.restoreSession();
      } catch (error) {
        console.error("Failed to restore session:", error);
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    restoreSession();

    // Listen to auth state changes
    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      console.log("🟢 [AUTH STATE CHANGE]", event, "Session:", session ? "exists" : "null");

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        console.log("🟢 [AUTH STATE CHANGE] User signed in or token refreshed, refetching user");
        refetchUser();
      } else if (event === "SIGNED_OUT") {
        console.log("🟢 [AUTH STATE CHANGE] User signed out, clearing query client");
        queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [queryClient, refetchUser]);

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await authService.signIn(email, password);
    },
    onSuccess: () => {
      refetchUser();
    },
  });

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      gender,
    }: {
      email: string;
      password: string;
      gender: UserGender;
    }) => {
      return await authService.signUp(email, password, gender);
    },
    onSuccess: () => {
      refetchUser();
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      console.log("🟠 [AUTH HOOK] signOutMutation.mutationFn called");
      const result = await authService.signOut();
      console.log("🟠 [AUTH HOOK] authService.signOut() completed, result:", result);
      return result;
    },
    onSuccess: () => {
      console.log("🟠 [AUTH HOOK] signOutMutation.onSuccess called");
      console.log("🟠 [AUTH HOOK] Clearing query client...");
      queryClient.clear();
      console.log("🟠 [AUTH HOOK] Query client cleared");
    },
    onError: (error) => {
      console.error("🟠 [AUTH HOOK] ❌ signOutMutation.onError:", error);
    },
  });

  const signIn = async (email: string, password: string) => {
    await signInMutation.mutateAsync({ email, password });
  };

  const signUp = async (email: string, password: string, gender: UserGender) => {
    await signUpMutation.mutateAsync({ email, password, gender });
  };

  const signOut = async () => {
    console.log("🟠 [AUTH HOOK] signOut() called");
    try {
      await signOutMutation.mutateAsync();
      console.log("🟠 [AUTH HOOK] ✅ signOut() completed successfully");
    } catch (error) {
      console.error("🟠 [AUTH HOOK] ❌ signOut() error:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user: user || null,
    profile: profile || null,
    isLoading: !isInitialized || isUserLoading || isProfileLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    refetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
