import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useResetPassword } from "../hooks/useAuth";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatchError, setMismatchError] = useState("");

  // Read the token from the URL: /reset-password?token=abc123
  // This token was included in the email link by the backend
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

  // No token in URL — invalid link
  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
        <h1>Invalid Reset Link</h1>
        <p>This password reset link is invalid or has expired.</p>
        <p>
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h1>Reset Password</h1>

      {resetPassword.isSuccess ? (
        <div>
          <p style={{ color: "green" }}>
            Your password has been reset successfully!
          </p>
          <p style={{ marginTop: 16 }}>
            <Link to="/login">Go to Login</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="password">New Password (min 6 characters)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                display: "block",
                width: "100%",
                padding: 8,
                marginTop: 4,
              }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{
                display: "block",
                width: "100%",
                padding: 8,
                marginTop: 4,
              }}
            />
          </div>

          {mismatchError && <p style={{ color: "red" }}>{mismatchError}</p>}

          {resetPassword.isError && (
            <p style={{ color: "red" }}>
              {(resetPassword.error as any)?.response?.data?.message ||
                "Reset failed. The link may have expired."}
            </p>
          )}

          <button
            type="submit"
            disabled={resetPassword.isPending}
            style={{ padding: "8px 24px" }}
          >
            {resetPassword.isPending ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
