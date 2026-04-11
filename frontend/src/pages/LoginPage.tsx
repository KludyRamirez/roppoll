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
    <div className="max-w-[400px] mx-auto mt-[100px] px-5">
      <h1 className="text-[28px] mb-6">Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {login.isError && (
          <p className="text-[var(--red)] mb-3 text-[14px]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(login.error as any)?.response?.data?.message || "Login failed"}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full py-[11px] mt-1 rounded-[7px] border-0 bg-[var(--green)] text-white font-semibold text-[15px] font-[var(--sans)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {login.isPending ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="mt-4 text-[14px] text-[var(--text-secondary)]">
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
