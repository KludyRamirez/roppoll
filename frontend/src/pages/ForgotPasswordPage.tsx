import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPassword } from "../hooks/useAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const forgotPassword = useForgotPassword();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate(email);
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20 }}>
      <h1>Forgot Password</h1>

      {forgotPassword.isSuccess ? (
        // Show success message after submission
        // We always show this even if the email doesn't exist (security)
        <div>
          <p style={{ color: "green" }}>
            If an account with that email exists, we've sent a password reset
            link. Check your inbox (and spam folder).
          </p>
          <p style={{ marginTop: 16 }}>
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ color: "gray", marginBottom: 16 }}>
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                display: "block",
                width: "100%",
                padding: 8,
                marginTop: 4,
              }}
            />
          </div>

          {forgotPassword.isError && (
            <p style={{ color: "red" }}>
              Something went wrong. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={forgotPassword.isPending}
            style={{ padding: "8px 24px" }}
          >
            {forgotPassword.isPending ? "Sending..." : "Send Reset Link"}
          </button>

          <p style={{ marginTop: 16 }}>
            <Link to="/login">Back to Login</Link>
          </p>
        </form>
      )}
    </div>
  );
}
