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
    <div style={{ maxWidth: 400, margin: "100px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Forgot Password</h1>

      {forgotPassword.isSuccess ? (
        <div>
          <p style={{ color: "var(--green)", fontSize: 14, marginBottom: 16 }}>
            If an account with that email exists, we've sent a password reset
            link. Check your inbox (and spam folder).
          </p>
          <Link to="/login">Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ color: "var(--text-muted)", marginBottom: 20, fontSize: 14 }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
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

          {forgotPassword.isError && (
            <p style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>
              Something went wrong. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={forgotPassword.isPending}
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
              cursor: forgotPassword.isPending ? "not-allowed" : "pointer",
              opacity: forgotPassword.isPending ? 0.7 : 1,
              fontFamily: "var(--sans)",
            }}
          >
            {forgotPassword.isPending ? "Sending..." : "Send Reset Link"}
          </button>

          <p style={{ marginTop: 16, fontSize: 14 }}>
            <Link to="/login">Back to Login</Link>
          </p>
        </form>
      )}
    </div>
  );
}
