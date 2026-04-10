import axios from "axios";
import { Mutex } from "async-mutex";

// Create a dedicated Axios instance (don't pollute the global axios)
const api = axios.create({
  baseURL: "http://localhost:5001/api",
  withCredentials: true, // CRITICAL: sends cookies (refresh token) with every request
});

// --- Mutex: prevents multiple simultaneous refresh attempts ---
// Scenario without mutex:
//   - 5 API calls fail with 401 at the same time
//   - All 5 try to refresh → 5 refresh requests
//   - First one succeeds and rotates the token
//   - Other 4 fail because the old refresh token is now revoked!
//
// With mutex:
//   - First 401 acquires the lock and refreshes
//   - Other 4 wait for the lock, then retry with the new access token
const refreshMutex = new Mutex();

// We store the access token in a simple module-level variable.
// This is NOT localStorage (which is vulnerable to XSS).
// It lives only in memory — lost on page refresh (that's where refresh token kicks in).
let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// --- Request Interceptor ---
// Runs BEFORE every request. Attaches the access token as a Bearer token.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// --- Response Interceptor ---
// Runs AFTER every response. If we get a 401, try to refresh the token.
api.interceptors.response.use(
  // Success — just pass through
  (response) => response,

  // Error — check if it's a 401 (expired token)
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh if:
    // 1. It's a 401 error
    // 2. We haven't already retried this request (prevent infinite loops)
    // 3. It's not the refresh endpoint itself (prevent infinite loops)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      originalRequest._retry = true;

      // Acquire the mutex — only one refresh at a time
      const release = await refreshMutex.acquire();
      try {
        // Try to get a new access token using the refresh token (in cookie)
        const { data } = await axios.post(
          "http://localhost:5001/api/auth/refresh",
          {},
          { withCredentials: true }
        );

        // Store the new access token
        accessToken = data.accessToken;

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — user needs to log in again
        accessToken = null;
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        // Always release the mutex, even if refresh failed
        release();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
