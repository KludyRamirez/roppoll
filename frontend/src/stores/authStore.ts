import { create } from "zustand";
import api, { setAccessToken } from "../lib/axios";

// Type for the user object returned by the API
interface User {
  id: number;
  email: string;
}

// Shape of our Zustand store
interface AuthState {
  user: User | null;
  isLoading: boolean; // true while we're checking if the user is logged in on page load

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>; // Called on page load to restore session
}

// create() makes a hook. Components call useAuthStore() to access this state.
// When state changes, only components using that specific piece re-render.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Start as true — we check for existing session on mount

  login: async (email, password) => {
    // POST /api/auth/login → get access token + refresh token cookie
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken); // Store in memory (not localStorage!)
    set({ user: data.user });
  },

  register: async (email, password) => {
    const { data } = await api.post("/auth/register", { email, password });
    setAccessToken(data.accessToken);
    set({ user: data.user });
  },

  logout: async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    set({ user: null });
  },

  // Called once on app startup (page load/refresh).
  // Tries to use the refresh token cookie to get a new access token.
  // If it works → user is still logged in. If not → user needs to log in.
  refreshAuth: async () => {
    try {
      const { data } = await api.post("/auth/refresh");
      setAccessToken(data.accessToken);
      set({ user: data.user, isLoading: false });
    } catch {
      // No valid refresh token — user is not logged in
      setAccessToken(null);
      set({ user: null, isLoading: false });
    }
  },
}));
