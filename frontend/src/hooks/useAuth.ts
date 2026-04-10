import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { useAuthStore } from "../stores/authStore";

// --- useLogin: mutation for logging in ---
export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });
}

// --- useRegister: mutation for registering ---
export function useRegister() {
  const register = useAuthStore((s) => s.register);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      register(email, password),
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
