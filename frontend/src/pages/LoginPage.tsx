import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useLogin } from "../hooks/useAuth";
import { useAuthStore } from "../stores/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const user = useAuthStore((s) => s.user);

  // useLogin() returns a TanStack mutation object with:
  // - mutate/mutateAsync: trigger the mutation
  // - isPending: true while the request is in flight
  // - isError/error: error state
  const login = useLogin();

  // If already logged in, redirect to dashboard
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        {/* Show error message from the API */}
        {login.isError && (
          <p style={{ color: "red" }}>
            {(login.error as any)?.response?.data?.message || "Login failed"}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          style={{ padding: "8px 24px" }}
        >
          {login.isPending ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p style={{ marginTop: 8 }}>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
