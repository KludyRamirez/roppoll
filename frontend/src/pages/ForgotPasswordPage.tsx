import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPassword } from "../hooks/useAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const forgotPassword = useForgotPassword();

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    forgotPassword.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px]">

        <div className="text-center mb-8">
          <Link to="/" className="text-[22px] font-semibold text-[var(--text)] no-underline">
            PropL.
          </Link>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8">
          <h1 className="text-[20px] font-semibold text-[var(--text)] mb-1">Forgot password?</h1>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          {forgotPassword.isSuccess ? (
            <div>
              <p className="text-[14px] text-[var(--text-secondary)] mb-5 leading-relaxed">
                If an account with that email exists, a reset link is on its way. Check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                className="block w-full py-2.5 text-center bg-[var(--text)] text-[var(--bg-card)] rounded-md text-[14px] font-semibold no-underline hover:opacity-90 transition-opacity"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 text-[14px] bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--text-muted)] transition-colors placeholder:text-[var(--text-muted)] font-[var(--sans)]"
                />
              </div>

              {forgotPassword.isError && (
                <p className="text-[var(--red)] text-[13px]">
                  Something went wrong. Please try again.
                </p>
              )}

              <button
                type="submit"
                disabled={forgotPassword.isPending}
                className="w-full py-2.5 mt-1 bg-[var(--text)] text-[var(--bg-card)] rounded-md text-[14px] font-semibold font-[var(--sans)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {forgotPassword.isPending ? "Sending..." : "Send reset link"}
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
