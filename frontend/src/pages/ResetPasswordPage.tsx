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
      <div className="max-w-[400px] mx-auto mt-[100px] px-5">
        <h1 className="text-[28px] mb-4">Invalid Reset Link</h1>
        <p className="text-[var(--text-muted)] text-[14px] mb-4">
          This password reset link is invalid or has expired.
        </p>
        <Link to="/forgot-password">Request a new reset link</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[400px] mx-auto mt-[100px] px-5">
      <h1 className="text-[28px] mb-6">Reset Password</h1>

      {resetPassword.isSuccess ? (
        <div>
          <p className="text-[var(--green)] text-[14px] mb-4">
            Your password has been reset successfully!
          </p>
          <Link to="/login">Go to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password">New Password (min 6 characters)</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="mb-4">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>

          {mismatchError && (
            <p className="text-[var(--red)] mb-3 text-[14px]">{mismatchError}</p>
          )}

          {resetPassword.isError && (
            <p className="text-[var(--red)] mb-3 text-[14px]">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(resetPassword.error as any)?.response?.data?.message ||
                "Reset failed. The link may have expired."}
            </p>
          )}

          <button
            type="submit"
            disabled={resetPassword.isPending}
            className="w-full py-[11px] mt-1 rounded-[7px] border-0 bg-[var(--green)] text-white font-semibold text-[15px] font-[var(--sans)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {resetPassword.isPending ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
