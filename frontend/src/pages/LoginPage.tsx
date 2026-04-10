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
    <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Login</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {login.isError && (
          <p style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(login.error as any)?.response?.data?.message || "Login failed"}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          style={{
            width: "100%",
            padding: "11px 0",
            marginTop: 4,
            borderRadius: 7,
            border: "none",
            background: "var(--green)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            cursor: login.isPending ? "not-allowed" : "pointer",
            opacity: login.isPending ? 0.7 : 1,
            fontFamily: "var(--sans)",
          }}
        >
          {login.isPending ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: "var(--text-secondary)" }}>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-secondary)" }}>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
