import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useResetPassword } from "../hooks/useAuth";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatchError, setMismatchError] = useState("");

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const resetPassword = useResetPassword();

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setMismatchError("");

    if (password !== confirmPassword) {
      setMismatchError("Passwords do not match");
      return;
    }

    if (!token) return;
    resetPassword.mutate({ token, newPassword: password });
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 28, marginBottom: 16 }}>Invalid Reset Link</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
          This password reset link is invalid or has expired.
        </p>
        <Link to="/forgot-password">Request a new reset link</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Reset Password</h1>

      {resetPassword.isSuccess ? (
        <div>
          <p style={{ color: "var(--green)", fontSize: 14, marginBottom: 16 }}>
            Your password has been reset successfully!
          </p>
          <Link to="/login">Go to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="password">New Password (min 6 characters)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {mismatchError && (
            <p style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>{mismatchError}</p>
          )}

          {resetPassword.isError && (
            <p style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(resetPassword.error as any)?.response?.data?.message ||
                "Reset failed. The link may have expired."}
            </p>
          )}

          <button
            type="submit"
            disabled={resetPassword.isPending}
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
              cursor: resetPassword.isPending ? "not-allowed" : "pointer",
              opacity: resetPassword.isPending ? 0.7 : 1,
              fontFamily: "var(--sans)",
            }}
          >
            {resetPassword.isPending ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
