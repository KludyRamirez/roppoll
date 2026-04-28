import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useLogin } from "../hooks/useAuth";
import { useAuthStore } from "../stores/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const user = useAuthStore((s) => s.user);
  const login = useLogin();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px]">

        <div className="text-center mb-8">
          <Link to="/" className="text-[22px] font-semibold text-[var(--text)] no-underline">
            PropL.
          </Link>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8">
          <h1 className="text-[20px] font-semibold text-[var(--text)] mb-1">Welcome back</h1>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-muted)] font-[var(--sans)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-[13px] font-medium text-[var(--text)]">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-muted)] font-[var(--sans)]"
              />
            </div>

            {login.isError && (
              <p className="text-[var(--red)] text-[13px]">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(login.error as any)?.response?.data?.message || "Login failed"}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-2.5 mt-1 bg-[var(--text)] text-[var(--bg-card)] rounded-md text-[14px] font-semibold font-[var(--sans)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {login.isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[13px] text-[var(--text-muted)]">
          Don't have an account?{" "}
          <Link to="/register" className="text-[var(--text)] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
