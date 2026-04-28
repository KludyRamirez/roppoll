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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-[380px]">
          <div className="text-center mb-8">
            <Link to="/" className="text-[22px] font-semibold text-[var(--text)] no-underline">
              PropL.
            </Link>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8">
            <h1 className="text-[20px] font-semibold text-[var(--text)] mb-1">Invalid link</h1>
            <p className="text-[13px] text-[var(--text-muted)] mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              to="/forgot-password"
              className="block w-full py-2.5 text-center bg-[var(--text)] text-[var(--bg-card)] rounded-md text-[14px] font-semibold no-underline hover:opacity-90 transition-opacity"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px]">

        <div className="text-center mb-8">
          <Link to="/" className="text-[22px] font-semibold text-[var(--text)] no-underline">
            PropL.
          </Link>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8">
          <h1 className="text-[20px] font-semibold text-[var(--text)] mb-1">Set new password</h1>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">Choose a strong password for your account.</p>

          {resetPassword.isSuccess ? (
            <div>
              <p className="text-[14px] text-[var(--text-secondary)] mb-5">
                Your password has been reset successfully.
              </p>
              <Link
                to="/login"
                className="block w-full py-2.5 text-center bg-[var(--text)] text-[var(--bg-card)] rounded-md text-[14px] font-semibold no-underline hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
                  New password
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

              <div>
                <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-[14px] bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-muted)] font-[var(--sans)]"
                />
              </div>

              {mismatchError && (
                <p className="text-[var(--red)] text-[13px]">{mismatchError}</p>
              )}

              {resetPassword.isError && (
                <p className="text-[var(--red)] text-[13px]">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(resetPassword.error as any)?.response?.data?.message ||
                    "Reset failed. The link may have expired."}
                </p>
              )}

              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="w-full py-2.5 mt-1 bg-[var(--text)] text-[var(--bg-card)] rounded-md text-[14px] font-semibold font-[var(--sans)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {resetPassword.isPending ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-5 text-[13px] text-[var(--text-muted)]">
          Remember your password?{" "}
          <Link to="/login" className="text-[var(--text)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
