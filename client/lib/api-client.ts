import AsyncStorage from "@react-native-async-storage/async-storage";

// TODO: Update this to your backend URL
// For local development:
// - iOS Simulator: http://localhost:8000
// - Android Emulator: http://10.0.2.2:8000
// - Physical device: http://YOUR_IP:8000
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "@teamup_token";

export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
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

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorJson.message || errorText;
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
      user: any;
    }>("POST", "/auth/register", { email, password }, false);
    await setToken(response.token);
    return response;
  },

  async login(email: string, password: string) {
    const response = await apiRequest<{
      token: string;
      user: any;
    }>("POST", "/auth/login", { email, password }, false);
    await setToken(response.token);
    return response;
  },

  async getMe() {
    return apiRequest("GET", "/auth/me");
  },

  // Profile
  async updateProfile(profileData: any) {
    return apiRequest("PUT", "/me/profile", profileData);
  },

  async patchProfile(profileData: any) {
    return apiRequest("PATCH", "/me/profile", profileData);
  },

  // Feed
  async getFeed(params: {
    game: string;
    region?: string;
    language?: string;
    platform?: string;
    rank_min?: string;
    rank_max?: string;
    cursor?: string;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append("game", params.game);
    if (params.region) queryParams.append("region", params.region);
    if (params.language) queryParams.append("language", params.language);
    if (params.platform) queryParams.append("platform", params.platform);
    if (params.rank_min) queryParams.append("rank_min", params.rank_min);
    if (params.rank_max) queryParams.append("rank_max", params.rank_max);
    if (params.cursor) queryParams.append("cursor", params.cursor);
    if (params.limit) queryParams.append("limit", params.limit.toString());

    return apiRequest("GET", `/feed?${queryParams.toString()}`);
  },

  // Swipe
  async swipe(toUserId: string, type: "like" | "pass" | "superlike") {
    return apiRequest("POST", "/swipe", { to_user_id: toUserId, type });
  },

  // Matches
  async getMatches() {
    return apiRequest("GET", "/matches");
  },

  // Messages
  async getMessages(matchId: string, cursor?: string, limit?: number) {
    const queryParams = new URLSearchParams();
    if (cursor) queryParams.append("cursor", cursor);
    if (limit) queryParams.append("limit", limit.toString());
    const query = queryParams.toString();
    return apiRequest(
      "GET",
      `/matches/${matchId}/messages${query ? `?${query}` : ""}`,
    );
  },

  async sendMessage(matchId: string, text: string) {
    return apiRequest("POST", `/matches/${matchId}/messages`, { text });
  },

  // Moderation
  async blockUser(userId: string) {
    return apiRequest("POST", "/moderation/block", { user_id: userId });
  },

  async reportUser(userId: string, reason: string, details?: string) {
    return apiRequest("POST", "/moderation/report", {
      user_id: userId,
      reason,
      details,
    });
  },
};
