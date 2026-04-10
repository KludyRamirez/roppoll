import { Link } from "react-router-dom";
import { usePollFeed } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import { useLogout } from "../hooks/useAuth";
import { usePollHub } from "../hooks/usePollHub";
import { useThemeStore } from "../stores/themeStore";
import PollCard from "../components/PollCard";

export default function PollFeedPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: polls, isLoading, isError } = usePollFeed();
  const { theme, toggle } = useThemeStore();
  usePollHub();

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
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.5 }}>RopPoll</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            style={{
              padding: "6px 10px",
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text)",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {user ? (
            <>
              <small style={{ color: "var(--text-muted)" }}>{user.email}</small>
              <Link to="/polls/new">
                <button
                  style={{
                    padding: "7px 14px",
                    borderRadius: 7,
                    border: "1px solid var(--green)",
                    background: "var(--green)",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "var(--sans)",
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
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--sans)",
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
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "var(--text)",
                    fontFamily: "var(--sans)",
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
                    border: "1px solid var(--green)",
                    background: "var(--green)",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "var(--sans)",
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
        <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 40 }}>
          Loading polls...
        </p>
      )}

      {isError && (
        <p style={{ color: "var(--red)", textAlign: "center", marginTop: 40 }}>
          Failed to load polls. Is the backend running?
        </p>
      )}

      {polls && polls.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <p style={{ fontSize: 16, marginBottom: 12 }}>No polls yet.</p>
          {user ? (
            <Link to="/polls/new" style={{ color: "var(--green)", fontWeight: 600 }}>
              Create the first one →
            </Link>
          ) : (
            <Link to="/register" style={{ color: "var(--green)", fontWeight: 600 }}>
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
