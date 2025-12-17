import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import { wsManager } from '@/lib/websocket';

interface User {
  id: string;
  email: string;
  isPremium?: boolean;
}

interface Profile {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  age?: number | null;
  bio?: string | null;
  region: string;
  timezone?: string | null;
  languages?: string[];
  micEnabled?: boolean;
  discordTag?: string | null;
  steamId?: string | null;
  riotId?: string | null;
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

const AUTH_STORAGE_KEY = '@teamup_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user && !isLoading) {
      wsManager.connect();
    } else if (!isLoading) {
      wsManager.disconnect();
    }
  }, [user, isLoading]);

  const checkSession = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/me', baseUrl);
      const response = await fetch(url, { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfileState(data.profile || null);
        await saveLocalCache(data.user, data.profile || null);
      } else {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
        setUser(null);
        setProfileState(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { user: storedUser, profile: storedProfile } = JSON.parse(stored);
        setUser(storedUser);
        setProfileState(storedProfile);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveLocalCache = async (userData: User | null, profileData: Profile | null) => {
    try {
      if (userData) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          user: userData,
          profile: profileData
        }));
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save auth cache:', error);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/login', baseUrl);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUser(data.user);
      setProfileState(data.profile || null);
      await saveLocalCache(data.user, data.profile || null);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/register', baseUrl);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      await saveLocalCache(data.user, null);
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/logout', baseUrl);
      await fetch(url, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setProfileState(null);
    await saveLocalCache(null, null);
  };

  const setProfile = (newProfile: Profile) => {
    setProfileState(newProfile);
    if (user) {
      saveLocalCache(user, newProfile);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/profile/${user.id}`, baseUrl);
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setProfileState(data.profile);
        await saveLocalCache(user, data.profile);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
