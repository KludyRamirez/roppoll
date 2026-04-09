import { Link } from "react-router-dom";
import { usePollFeed } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import { useLogout } from "../hooks/useAuth";
import PollCard from "../components/PollCard";

export default function PollFeedPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: polls, isLoading, isError } = usePollFeed();

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 20px" }}>

      {/* ── Nav bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
          paddingBottom: 16,
          borderBottom: "1px solid #eee",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.5 }}>RopPoll</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {user ? (
            <>
              <small style={{ color: "#888" }}>{user.email}</small>
              <Link to="/polls/new">
                <button
                  style={{
                    padding: "7px 14px",
                    borderRadius: 7,
                    border: "1px solid #1a7a32",
                    background: "#1a7a32",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  + New Poll
                </button>
              </Link>
              <button
                onClick={() => logout.mutate()}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#555",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Link to="/login">
                <button
                  style={{
                    padding: "7px 14px",
                    borderRadius: 7,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Login
                </button>
              </Link>
              <Link to="/register">
                <button
                  style={{
                    padding: "7px 14px",
                    borderRadius: 7,
                    border: "1px solid #1a7a32",
                    background: "#1a7a32",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Register
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Feed ── */}
      {isLoading && (
        <p style={{ color: "#aaa", textAlign: "center", marginTop: 40 }}>
          Loading polls...
        </p>
      )}

      {isError && (
        <p style={{ color: "#c0392b", textAlign: "center", marginTop: 40 }}>
          Failed to load polls. Is the backend running?
        </p>
      )}

      {polls && polls.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <p style={{ fontSize: 16, marginBottom: 12 }}>No polls yet.</p>
          {user ? (
            <Link to="/polls/new" style={{ color: "#1a7a32", fontWeight: 600 }}>
              Create the first one →
            </Link>
          ) : (
            <Link to="/register" style={{ color: "#1a7a32", fontWeight: 600 }}>
              Register to create the first one →
            </Link>
          )}
        </div>
      )}

      {polls?.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
