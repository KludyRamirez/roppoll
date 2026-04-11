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
    <div className="max-w-[400px] mx-auto mt-[100px] px-5">
      <h1 className="text-[28px] mb-6">Register</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label htmlFor="password">Password (min 6 characters)</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        {register.isError && (
          <p className="text-[var(--red)] mb-3 text-[14px]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(register.error as any)?.response?.data?.message || "Registration failed"}
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending}
          className="w-full py-[11px] mt-1 rounded-[7px] border-0 bg-[var(--green)] text-white font-semibold text-[15px] font-[var(--sans)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {register.isPending ? "Registering..." : "Register"}
        </button>
      </form>
      <p className="mt-4 text-[14px] text-[var(--text-secondary)]">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
