import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api, getToken, removeToken } from "@/lib/api-client";
import { wsManager } from "@/lib/websocket";

interface User {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  bio?: string | null;
  region: string;
  languages?: string[];
  micEnabled?: boolean;
  discordTag?: string | null;
  age?: number | null;
  timezone?: string | null;
  steamId?: string | null;
  riotId?: string | null;
  toxicityRating?: number;
  lastSeenAt?: string | null;
  isAvailableNow?: boolean;
  availableUntil?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user && !isLoading) {
      getToken().then((token) => {
        if (token) {
          wsManager.connect(token);
        }
      });
    } else if (!isLoading) {
      wsManager.disconnect();
    }
  }, [user, isLoading]);

  const checkSession = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setProfileState(null);
        setIsLoading(false);
        return;
      }

      const response = (await api.getMe()) as {
        user: { id: string; email: string; isPremium?: boolean };
        profile: Profile | null;
        hasProfile: boolean;
      };
      if (response?.user) {
        setUser({ id: response.user.id, email: response.user.email });
        setProfileState(response.profile);
      }
    } catch (error) {
      console.error("Session check failed:", error);
      await removeToken();
      setUser(null);
      setProfileState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.login(email, password);
      await refreshProfile();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.register(email, password);
      // Set user from registration response
      if (response?.user) {
        setUser({ id: response.user.id, email: response.user.email });
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      await removeToken();
    }
    wsManager.disconnect();
    setUser(null);
    setProfileState(null);
  };

  const setProfile = (newProfile: Profile) => {
    setProfileState(newProfile);
  };

  const refreshProfile = async () => {
    try {
      const response = (await api.getMe()) as {
        user: { id: string; email: string; isPremium?: boolean };
        profile: Profile | null;
        hasProfile: boolean;
      };
      if (response?.user) {
        setUser({ id: response.user.id, email: response.user.email });
        setProfileState(response.profile);
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    hasProfile: !!profile,
    login,
    register,
    logout,
    setProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
