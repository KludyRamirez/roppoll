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
    <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Register</h1>
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
          <label htmlFor="password">Password (min 6 characters)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {register.isError && (
          <p style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(register.error as any)?.response?.data?.message || "Registration failed"}
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending}
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
            cursor: register.isPending ? "not-allowed" : "pointer",
            opacity: register.isPending ? 0.7 : 1,
            fontFamily: "var(--sans)",
          }}
        >
          {register.isPending ? "Registering..." : "Register"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: "var(--text-secondary)" }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
