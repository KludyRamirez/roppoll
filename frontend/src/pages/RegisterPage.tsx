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
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h1>Register</h1>
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
          <label htmlFor="password">Password (min 6 characters)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        {register.isError && (
          <p style={{ color: "red" }}>
            {(register.error as any)?.response?.data?.message || "Registration failed"}
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending}
          style={{ padding: "8px 24px" }}
        >
          {register.isPending ? "Registering..." : "Register"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
