import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5001";

export function getBaseUrl(): string {
  return API_BASE_URL;
}

const TOKEN_KEY = "@teamup_token";
const REFRESH_TOKEN_KEY = "@teamup_refresh_token";

export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      await setToken(data.token);
      await setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiRequest<T>(
  method: string,
  endpoint: string,
  data?: unknown,
  requireAuth: boolean = true,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const token = await getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const options: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies for cross-origin requests
  };

  let response = await fetch(url, options);

  if (response.status === 401 && requireAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
      }
      response = await fetch(url, { ...options, headers });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage =
        errorJson.error || errorJson.detail || errorJson.message || errorText;
    } catch {
      // Keep original error text
    }
    throw new Error(`${response.status}: ${errorMessage}`);
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }
  return {} as T;
}

export const api = {
  // Auth
  async register(email: string, password: string) {
    const response = await apiRequest<{
      token: string;
      refreshToken: string;
      user: any;
    }>("POST", "/api/auth/register", { email, password }, false);
    await setToken(response.token);
    await setRefreshToken(response.refreshToken);
    return response;
  },

  async login(email: string, password: string) {
    const response = await apiRequest<{
      token: string;
      refreshToken: string;
      user: any;
    }>("POST", "/api/auth/login", { email, password }, false);
    await setToken(response.token);
    await setRefreshToken(response.refreshToken);
    return response;
  },

  async logout() {
    const refreshToken = await getRefreshToken();
    await apiRequest("POST", "/api/auth/logout", { refreshToken });
    await removeToken();
  },

  async getMe() {
    return apiRequest("GET", "/api/auth/me");
  },

  // Profile
  async getProfile(userId: string) {
    return apiRequest("GET", `/api/profile/${userId}`);
  },

  async createProfile(profileData: any) {
    return apiRequest("POST", "/api/profile", profileData);
  },

  async updateProfile(userId: string, profileData: any) {
    return apiRequest("PUT", `/api/profile/${userId}`, profileData);
  },

  // Games
  async getGames() {
    return apiRequest("GET", "/api/games");
  },

  async getUserGames(userId: string) {
    return apiRequest("GET", `/api/user-games/${userId}`);
  },

  async setUserGames(userId: string, games: any[]) {
    return apiRequest("POST", `/api/user-games/${userId}`, { games });
  },

  // Availability
  async getAvailability(userId: string) {
    return apiRequest("GET", `/api/availability/${userId}`);
  },

  async setAvailability(userId: string, windows: any[]) {
    return apiRequest("POST", `/api/availability/${userId}`, { windows });
  },

  // Feed
  async getFeed(params: Record<string, string>) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    const qs = queryParams.toString();
    return apiRequest("GET", `/api/feed${qs ? `?${qs}` : ""}`);
  },

  // Swipe
  async swipe(toUserId: string, swipeType: "like" | "skip" | "super") {
    return apiRequest("POST", "/api/swipe", { toUserId, swipeType });
  },

  async getSwipeStatus() {
    return apiRequest("GET", "/api/swipe-status");
  },

  // Matches
  async getMatches() {
    return apiRequest("GET", "/api/matches");
  },

  // Messages
  async getMessages(matchId: string) {
    return apiRequest("GET", `/api/messages/${matchId}`);
  },

  async sendMessage(matchId: string, content: string) {
    return apiRequest("POST", "/api/messages", { matchId, content });
  },

  // Moderation
  async blockUser(blockedUserId: string) {
    return apiRequest("POST", "/api/block", { blockedUserId });
  },

  async reportUser(reportedUserId: string, reason: string, details?: string) {
    return apiRequest("POST", "/api/report", {
      reportedUserId,
      reason,
      details,
    });
  },

  // Available now
  async setAvailableNow(durationMinutes: number) {
    return apiRequest("POST", "/api/available-now", { durationMinutes });
  },

  async clearAvailableNow() {
    return apiRequest("DELETE", "/api/available-now");
  },

  // Push token
  async setPushToken(token: string) {
    return apiRequest("POST", "/api/push-token", { token });
  },

  async removePushToken() {
    return apiRequest("DELETE", "/api/push-token");
  },

  // Heartbeat
  async heartbeat() {
    return apiRequest("POST", "/api/heartbeat");
  },

  // Reviews
  async createReview(data: {
    reviewedUserId: string;
    matchId?: string;
    rating: number;
    tags?: string[];
    comment?: string;
  }) {
    return apiRequest("POST", "/api/reviews", data);
  },

  async getReviews(userId: string) {
    return apiRequest<{ reviews: any[]; hasReviewed: boolean }>(
      "GET",
      `/api/reviews/${userId}`,
    );
  },

  async getReviewStats(userId: string) {
    return apiRequest<{
      averageRating: number;
      totalReviews: number;
      tagCounts: Record<string, number>;
    }>("GET", `/api/reviews/stats/${userId}`);
  },
};
