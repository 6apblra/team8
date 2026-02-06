import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, getToken, removeToken } from '@/lib/api-client';
import { wsManager } from '@/lib/websocket';

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  region: string;
  language?: string | null;
  languages?: string[];
  platforms: string[];
  playstyle?: string | null;
  mic: boolean;
  micEnabled?: boolean;
  discordTag?: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

      const profileData = await api.getMe() as Profile | null;
      if (profileData) {
        setUser({ id: profileData.user_id, email: '' }); // Email not in profile response
        setProfileState(profileData);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      await removeToken();
      setUser(null);
      setProfileState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.login(email, password);
      await refreshProfile();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.register(email, password);
      // After registration, user needs to create profile
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    await removeToken();
    wsManager.disconnect();
    setUser(null);
    setProfileState(null);
  };

  const setProfile = (newProfile: Profile) => {
    setProfileState(newProfile);
  };

  const refreshProfile = async () => {
    try {
      const profileData = await api.getMe() as Profile | null;
      if (profileData) {
        setUser({ id: profileData.user_id, email: '' });
        setProfileState(profileData);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
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
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
