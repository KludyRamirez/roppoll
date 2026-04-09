import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { useAuthStore } from "../stores/authStore";

// --- useMe: fetch current user (protected endpoint) ---
// This uses TanStack Query's useQuery — it caches the result,
// handles loading/error states, and re-fetches when needed.
export function useMe() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["me"],              // Cache key — used to identify this query
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      return data;
    },
    enabled: !!user,               // Only run this query if user is logged in
    staleTime: 5 * 60 * 1000,     // Consider data fresh for 5 minutes
  });
}

// --- useLogin: mutation for logging in ---
// useMutation is for operations that CHANGE data (POST, PUT, DELETE).
// It gives us isPending, isError, error, mutate/mutateAsync.
export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: () => {
      // After login, invalidate the "me" query so it re-fetches with the new token
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// --- useRegister: mutation for registering ---
export function useRegister() {
  const register = useAuthStore((s) => s.register);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      register(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// --- useForgotPassword: request a password reset email ---
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post("/auth/forgot-password", { email });
      return data;
    },
  });
}

// --- useResetPassword: set a new password using the reset token ---
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => {
      const { data } = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });
      return data;
    },
  });
}

// --- useLogout: mutation for logging out ---
export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      // Clear all cached queries — user is logged out, cached data is invalid
      queryClient.clear();
    },
  });
}
