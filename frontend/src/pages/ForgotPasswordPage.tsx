import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPassword } from "../hooks/useAuth";

const inputCls = "block w-full mt-1.5 px-3 py-[10px] font-[var(--sans)] text-[14px] bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)] rounded-[7px] focus:outline-none";
const labelCls = "font-medium text-[14px] text-[var(--text)]";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const forgotPassword = useForgotPassword();

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    forgotPassword.mutate(email);
  };

  return (
    <div className="max-w-[400px] mx-auto mt-[100px] px-5">
      <h1 className="text-[28px] mb-6">Forgot Password</h1>

      {forgotPassword.isSuccess ? (
        <div>
          <p className="text-[var(--green)] text-[14px] mb-4">
            If an account with that email exists, we've sent a password reset
            link. Check your inbox (and spam folder).
          </p>
          <Link to="/login">Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="text-[var(--text-muted)] mb-5 text-[14px]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <div className="mb-4">
            <label htmlFor="email" className={labelCls}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
          </div>

          {forgotPassword.isError && (
            <p className="text-[var(--red)] mb-3 text-[14px]">
              Something went wrong. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={forgotPassword.isPending}
            className="w-full py-[11px] mt-1 rounded-[7px] border-0 bg-[var(--green)] text-white font-semibold text-[15px] font-[var(--sans)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {forgotPassword.isPending ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="mt-4 text-[14px]">
            <Link to="/login">Back to Login</Link>
          </p>
        </form>
      )}
    </div>
  );
}
