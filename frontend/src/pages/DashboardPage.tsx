import { Navigate } from "react-router-dom";
import { useLogout, useMe } from "../hooks/useAuth";
import { useAuthStore } from "../stores/authStore";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  // useMe() fetches GET /api/auth/me — a protected endpoint.
  // If the access token has expired, the Axios interceptor will
  // automatically refresh it using the refresh token cookie.
  const { data: me, isLoading } = useMe();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ maxWidth: 600, margin: "100px auto", padding: 20 }}>
      <h1>Dashboard</h1>
      {isLoading ? (
        <p>Loading user data...</p>
      ) : (
        <div>
          <p><strong>User ID:</strong> {me?.id}</p>
          <p><strong>Email:</strong> {me?.email}</p>
          <p style={{ color: "green", marginTop: 16 }}>
            ✓ You are authenticated! Your access token is stored in memory
            and your refresh token is in an HttpOnly cookie.
          </p>
          <p style={{ color: "gray", fontSize: 14 }}>
            Try refreshing the page — the app will automatically restore your
            session using the refresh token.
          </p>
        </div>
      )}
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        style={{ marginTop: 24, padding: "8px 24px" }}
      >
        {logout.isPending ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}
