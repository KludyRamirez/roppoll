import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useRegister } from "../hooks/useAuth";
import { useAuthStore } from "../stores/authStore";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const user = useAuthStore((s) => s.user);
  const register = useRegister();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    register.mutate({ email, password });
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
          <h1 className="text-[20px] font-semibold text-[var(--text)] mb-1">Create an account</h1>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">Start posting and voting on polls</p>

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
              <label htmlFor="password" className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-muted)] font-[var(--sans)]"
              />
            </div>

            {register.isError && (
              <p className="text-[var(--red)] text-[13px]">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(register.error as any)?.response?.data?.message || "Registration failed"}
              </p>
            )}

            <button
              type="submit"
              disabled={register.isPending}
              className="w-full py-2.5 mt-1 bg-[var(--text)] text-[var(--bg-card)] rounded-md text-[14px] font-semibold font-[var(--sans)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {register.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[13px] text-[var(--text-muted)]">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--text)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
